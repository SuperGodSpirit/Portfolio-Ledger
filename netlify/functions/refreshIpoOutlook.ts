import { Handler } from "@netlify/functions";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { 
  MODEL_PROVIDER, 
  MODEL_VERSION, 
  PROMPT_VERSION, 
  isValid, 
  OutlookGenerator 
} from "../../lib/outlookGenerator";

let isInitialized = false;

const initializeFirebase = () => {
  if (!isInitialized && getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey) {
      privateKey = privateKey.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

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
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    initializeFirebase();
    const db = getFirestore();
    const auth = getAuth();

    // 1. Verify Authentication
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

    // 2. Verify Role
    const userDoc = await db.collection("users").doc(callerUid).get();
    if (!userDoc.exists) {
      return { statusCode: 403, body: JSON.stringify({ error: "Forbidden: User not found" }) };
    }
    
    const callerRole = userDoc.data()?.role;
    if (callerRole !== "owner" && callerRole !== "manager") {
      return { statusCode: 403, body: JSON.stringify({ error: "Forbidden: Insufficient permissions" }) };
    }

    // 3. Parse Request
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (e) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
    }

    const { ipoId } = body;
    if (!ipoId) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing ipoId" }) };
    }

    // 4. Rate Limiting Check
    const outlookRef = db.collection("ipoOutlooks").doc(ipoId);
    const outlookDoc = await outlookRef.get();
    let existingOutlook: any = null;

    if (outlookDoc.exists) {
      existingOutlook = outlookDoc.data();
      
      if (existingOutlook?.status === "generating") {
        return { statusCode: 429, body: JSON.stringify({ error: "Analysis already in progress." }) };
      }

      if (existingOutlook?.generatedAt) {
        const lastGenerated = existingOutlook.generatedAt.toMillis();
        const now = Date.now();
        const diffMinutes = (now - lastGenerated) / (1000 * 60);

        if (callerRole === "manager" && diffMinutes < 30) {
          return { statusCode: 429, body: JSON.stringify({ error: "Rate limit exceeded. Managers can refresh an IPO outlook every 30 minutes." }) };
        } else if (callerRole === "owner" && diffMinutes < 1) {
          return { statusCode: 429, body: JSON.stringify({ error: "Rate limit exceeded. Owners can refresh an IPO outlook every 1 minute." }) };
        }
      }
    }

    // 5. Fetch IPO Data
    const ipoDoc = await db.collection("market_ipos").doc(ipoId).get();
    if (!ipoDoc.exists) {
      return { statusCode: 404, body: JSON.stringify({ error: "IPO not found" }) };
    }
    const ipoData = ipoDoc.data();

    function parseGmp(gmpStr: string | null | undefined): number {
      if (!gmpStr) return 0;
      const match = gmpStr.match(/[\d.]+/);
      return match ? parseFloat(match[0]) : 0;
    }
    
    const currentGmpVal = parseGmp(ipoData?.gmp);

    // Set status to generating
    await outlookRef.set({ status: "generating" }, { merge: true });

    // 6. Generate AI Outlook
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set in Netlify Environment.");
      return { statusCode: 500, body: JSON.stringify({ error: "Server configuration error" }) };
    }

    const generator = new OutlookGenerator(apiKey, process.env.GEMINI_API_KEY_BACKUP);
    const inputSnapshot = {
      gmp: currentGmpVal,
      peRatio: ipoData?.peRatio ?? null,
      ronw: ipoData?.ronw ?? null,
      revenueGrowth: ipoData?.revenueGrowth ?? null,
      profitGrowth: ipoData?.profitGrowth ?? null,
      debtToEquity: ipoData?.debtToEquity ?? null,
      issueSize: ipoData?.issueSize ?? null,
    };

    let outlookData;
    const startTime = Date.now();
    try {
      outlookData = await generator.generateOutlookPayload(ipoData);
      outlookData.confidenceScore = Math.max(0, Math.min(100, outlookData.confidenceScore));
      
      if (!isValid(outlookData, inputSnapshot)) {
         console.log(`Initial validation failed for ${ipoData?.name}, retrying once...`);
         outlookData = await generator.generateOutlookPayload(ipoData);
         outlookData.confidenceScore = Math.max(0, Math.min(100, outlookData.confidenceScore));
         if (!isValid(outlookData, inputSnapshot)) {
             throw new Error("AI validation failed after retry.");
         }
      }
    } catch (e: any) {
      await outlookRef.set({ status: existingOutlook?.status || "failed" }, { merge: true });
      return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
    const generationDurationMs = Date.now() - startTime;

    // 7. Save History
    const nowTimestamp = FieldValue.serverTimestamp();
    if (existingOutlook && existingOutlook.status === 'completed' && existingOutlook.generatedAt) {
      const historyId = existingOutlook.generatedAt.toMillis ? existingOutlook.generatedAt.toMillis().toString() : Date.now().toString();
      const historyRecord = {
        ...existingOutlook,
        gmp: existingOutlook.inputSnapshot?.gmp ?? null,
        model: existingOutlook.modelVersion ?? "unknown",
        promptVersion: existingOutlook.promptVersion ?? "unknown"
      };
      await outlookRef.collection('history').doc(historyId).set(historyRecord);
    }

    // 8. Save New Document
    const updatedDocument = {
      id: ipoId,
      ipoId: ipoId,
      modelProvider: MODEL_PROVIDER,
      modelVersion: MODEL_VERSION,
      promptVersion: PROMPT_VERSION,
      generatedAt: nowTimestamp,
      gmpAtGeneration: currentGmpVal,
      status: 'completed',
      triggerReason: "manual_refresh",
      triggeredBy: callerUid,
      triggeredByRole: callerRole,
      generationDurationMs,
      triggerStatus: existingOutlook?.triggerStatus || { initial: true, preOpen: false, closeDate: false },
      bearCase: outlookData.bearCase,
      baseCase: outlookData.baseCase,
      gmpCase: outlookData.gmpCase,
      bullCase: outlookData.bullCase,
      confidenceScore: outlookData.confidenceScore,
      rationale: outlookData.rationale,
      inputSnapshot,
      rawResponse: JSON.stringify(outlookData),
      actualListingGain: existingOutlook?.actualListingGain ?? null,
      modelAccuracyScore: existingOutlook?.modelAccuracyScore ?? null,
    };

    await outlookRef.set(updatedDocument, { merge: true });

    // Since FieldValue.serverTimestamp() isn't serializable for the client response,
    // we return a mock ISO string for the UI optimistic update.
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: "Analysis generated successfully",
        data: {
          ...updatedDocument,
          generatedAt: { toMillis: () => Date.now() } // mock for frontend consumption if needed
        }
      })
    };
  } catch (error: any) {
    console.error("Function error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Internal Server Error" })
    };
  }
};
