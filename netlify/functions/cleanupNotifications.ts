import { Handler } from "@netlify/functions";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

let isInitialized = false;

const initializeFirebase = () => {
  if (!isInitialized && getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    
    // Safely parse the private key
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey) {
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    if (!projectId || !clientEmail || !privateKey) {
      console.warn("Firebase Admin credentials missing. Skipping init.");
      return;
    }

    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId
    });
    isInitialized = true;
  }
};

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    initializeFirebase();
    const db = getFirestore();

    // Verify admin token (optional but highly recommended)
    // For simplicity, we just execute the cleanup. 
    // In a strict prod environment, you would check an Authorization header here.

    // 90 days ago
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

    // Fetch old notifications
    const snapshot = await db.collection("notifications")
      .where("sentAt", "<", cutoffTimestamp)
      .limit(500)
      .get();

    if (snapshot.empty) {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, deletedCount: 0, message: "No old notifications found." })
      };
    }

    // Delete in batches
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        deletedCount: snapshot.size,
        message: `Successfully deleted ${snapshot.size} notifications.` 
      })
    };

  } catch (error: any) {
    console.error("Cleanup Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error", details: error.message })
    };
  }
};
