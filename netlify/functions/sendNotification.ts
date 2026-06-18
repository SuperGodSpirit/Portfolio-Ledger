import { Handler } from "@netlify/functions";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

let isInitialized = false;

const initializeFirebase = () => {
  if (!isInitialized && getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      console.warn("Missing Firebase Admin environment variables.");
      initializeApp();
    } else {
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    }
    isInitialized = true;
  }
};

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // 0. Initialize Firebase inside the handler to prevent global scope crashes (502s)
    initializeFirebase();
    const db = getFirestore();
    const messaging = getMessaging();
    const auth = getAuth();

    // 1. Verify Caller Authentication
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized: Missing Bearer Token" }) };
    }

    const idToken = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (error) {
      return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized: Invalid Token" }) };
    }

    const callerUid = decodedToken.uid;

    // 2. Verify Caller Permissions (Must be active owner or manager)
    const callerDoc = await db.collection("users").doc(callerUid).get();
    const callerData = callerDoc.data();

    if (!callerData || callerData.status !== "active" || (callerData.role !== "owner" && callerData.role !== "manager")) {
      return { statusCode: 403, body: JSON.stringify({ error: "Forbidden: Insufficient Permissions" }) };
    }

    // 3. Rate Limiting (Max 5 notifications per minute per admin)
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentSnapshot = await db.collection("notifications")
      .where("sentByUid", "==", callerUid)
      .where("sentAt", ">", Timestamp.fromDate(oneMinuteAgo))
      .get();
    
    if (recentSnapshot.size >= 5) {
      return { statusCode: 429, body: JSON.stringify({ error: "Too Many Requests: Rate limit exceeded. Please wait a minute." }) };
    }

    // 4. Parse Request
    const { title, body, targetType, targets, notificationCategory = "adminAlerts" } = JSON.parse(event.body || "{}");

    if (!title || !body || !targetType) {
      return { statusCode: 400, body: JSON.stringify({ error: "Bad Request: Missing required fields" }) };
    }

    // 5. Resolve Recipients from Firestore
    const usersSnapshot = await db.collection("users").where("status", "==", "active").get();

    // Map token to UID so we can prune invalid tokens later
    const tokenMapping: { token: string; uid: string }[] = [];
    let recipientCount = 0;

    usersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const tokens = data.notificationTokens || [];
      if (tokens.length === 0) return;

      // Filter out users who have disabled notifications globally
      if (data.notifications?.enabled === false) return;
      
      // Filter out based on specific category preferences
      if (notificationCategory === "ipoAlerts" && data.notifications?.ipoAlerts === false) return;
      if (notificationCategory === "settlementAlerts" && data.notifications?.settlementAlerts === false) return;
      if (notificationCategory === "adminAlerts" && data.notifications?.adminAlerts === false) return;

      let shouldInclude = false;

      if (targetType === "broadcast") {
        shouldInclude = true;
      } else if (targetType === "role" && Array.isArray(targets) && targets.includes(data.role)) {
        shouldInclude = true;
      } else if (targetType === "portfolio" && Array.isArray(targets) && data.portfolios?.some((p: string) => targets.includes(p))) {
        shouldInclude = true;
      } else if (targetType === "users" && Array.isArray(targets) && targets.includes(doc.id)) {
        shouldInclude = true;
      }

      if (shouldInclude) {
        tokens.forEach((t: string) => tokenMapping.push({ token: t, uid: doc.id }));
        recipientCount++;
      }
    });

    // 6. Dispatch Notifications & Collect Metrics
    let totalSuccess = 0;
    let totalFailure = 0;
    let status = "success";
    
    // We will collect dead tokens to batch delete them
    const deadTokensToPrune: { [uid: string]: string[] } = {};

    if (tokenMapping.length > 0) {
      // Chunk tokens into batches of 500 (FCM limit for sendEachForMulticast)
      const chunkSize = 500;
      for (let i = 0; i < tokenMapping.length; i += chunkSize) {
        const chunk = tokenMapping.slice(i, i + chunkSize);
        const tokensToCall = chunk.map(c => c.token);

        try {
          const response = await messaging.sendEachForMulticast({
            tokens: tokensToCall,
            notification: { title, body }
          });

          totalSuccess += response.successCount;
          totalFailure += response.failureCount;

          if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
              if (!resp.success) {
                const errorInfo = resp.error;
                // Identify invalid tokens
                if (errorInfo && (
                  errorInfo.code === 'messaging/invalid-registration-token' ||
                  errorInfo.code === 'messaging/registration-token-not-registered'
                )) {
                  const uid = chunk[idx].uid;
                  const badToken = chunk[idx].token;
                  if (!deadTokensToPrune[uid]) deadTokensToPrune[uid] = [];
                  deadTokensToPrune[uid].push(badToken);
                }
              }
            });
          }
        } catch (err) {
          console.error("Error sending multicast batch:", err);
          status = "failed";
        }
      }

      if (totalFailure > 0 && totalSuccess > 0) status = "partial";
      if (totalSuccess === 0 && totalFailure > 0) status = "failed";

      // 7. Execute Token Pruning (Async fire-and-forget to save execution time)
      const uidsToPrune = Object.keys(deadTokensToPrune);
      if (uidsToPrune.length > 0) {
        Promise.all(uidsToPrune.map(uid => {
          return db.collection("users").doc(uid).update({
            notificationTokens: FieldValue.arrayRemove(...deadTokensToPrune[uid])
          }).catch(err => console.error(`Failed to prune tokens for user ${uid}`, err));
        }));
      }

    } else {
      console.log("No recipients matched the criteria or had tokens.");
    }

    // 8. Save Accurate Notification History
    await db.collection("notifications").add({
      title,
      body,
      sentByUid: callerUid,
      sentByName: callerData.name,
      sentAt: FieldValue.serverTimestamp(),
      targetType,
      targets: targets || null,
      recipientCount,
      successCount: totalSuccess,
      failureCount: totalFailure,
      category: notificationCategory,
      status
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, recipientCount, successCount: totalSuccess, failureCount: totalFailure, status })
    };

  } catch (error: any) {
    console.error("Internal Server Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error", details: error.message })
    };
  }
};
