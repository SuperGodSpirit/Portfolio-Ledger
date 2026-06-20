import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { 
  MODEL_PROVIDER, 
  MODEL_VERSION, 
  PROMPT_VERSION, 
  isValid, 
  OutlookGenerator 
} from '../lib/outlookGenerator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

let serviceAccount: any;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else if (process.env.FIREBASE_PROJECT_ID) {
  serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  };
}

if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

function parseGmp(gmpStr: string | null | undefined): number {
  if (!gmpStr) return 0;
  const match = gmpStr.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function isSameDayIST(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const istDate = new Date(d.getTime() + istOffset);
  return istNow.getUTCFullYear() === istDate.getUTCFullYear() &&
         istNow.getUTCMonth() === istDate.getUTCMonth() &&
         istNow.getUTCDate() === istDate.getUTCDate();
}

function isOneDayBeforeIST(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const istDate = new Date(d.getTime() + istOffset);
  istDate.setUTCDate(istDate.getUTCDate() - 1);
  return istNow.getUTCFullYear() === istDate.getUTCFullYear() &&
         istNow.getUTCMonth() === istDate.getUTCMonth() &&
         istNow.getUTCDate() === istDate.getUTCDate();
}

async function run() {
  console.log("Checking for IPOs that need AI Outlook...");
  const iposSnapshot = await db.collection('market_ipos').get();
  
  let stats = { analyzed: 0, skipped: 0, failed: 0 };
  
  const generator = new OutlookGenerator(
    process.env.GEMINI_API_KEY || "", 
    process.env.GEMINI_API_KEY_BACKUP
  );
  
  for (const doc of iposSnapshot.docs) {
    const ipo = doc.data();
    
    if (ipo.status !== 'upcoming' && ipo.status !== 'active') {
      stats.skipped++;
      continue;
    }
    
    let isRetail = true;
    if (ipo.minInvestment) {
      const minInv = parseInt(ipo.minInvestment.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(minInv) && minInv > 20000) isRetail = false;
    } else if (ipo.priceBand && ipo.lotSize) {
      const match = ipo.priceBand.match(/(\d+(\.\d+)?)/g);
      const upperPrice = match && match.length > 0 ? parseFloat(match[match.length - 1]) : 0;
      const lotSize = parseInt(ipo.lotSize.replace(/[^0-9]/g, ''), 10);
      if (upperPrice > 0 && !isNaN(lotSize)) {
         if (upperPrice * lotSize > 20000) isRetail = false;
      }
    }
    
    if (!isRetail) {
      stats.skipped++;
      console.log(`Skipping ${ipo.name} as min investment > ₹20,000.`);
      continue;
    }

    const outlookRef = db.collection('ipoOutlooks').doc(ipo.id);
    const outlookDoc = await outlookRef.get();
    
    let triggerReason: string | null = null;
    let existingOutlook: any = null;
    
    const currentGmpVal = parseGmp(ipo.gmp);

    if (!outlookDoc.exists) {
      triggerReason = "Initial Creation";
    } else {
      existingOutlook = outlookDoc.data();
      const triggerStatus = existingOutlook.triggerStatus || { initial: true, preOpen: false, closeDate: false };
      
      if (existingOutlook.status === 'failed') {
        triggerReason = "Retry on Failure";
      } else if (!triggerStatus.preOpen && isOneDayBeforeIST(ipo.openDate)) {
        triggerReason = "T-1 Open Date";
      } else if (!triggerStatus.closeDate && isSameDayIST(ipo.closeDate)) {
        triggerReason = "Close Date";
      } else {
        const oldGmp = existingOutlook.inputSnapshot?.gmp || 0;
        const changeRatio = Math.abs(currentGmpVal - oldGmp) / Math.max(oldGmp, 1);
        const absChange = Math.abs(currentGmpVal - oldGmp);
        
        if (changeRatio >= 0.15 && absChange >= 10) {
          console.log(`Significant GMP shift for ${ipo.name}. Old: ₹${oldGmp}, New: ₹${currentGmpVal}`);
          triggerReason = `GMP Shift (>15% & >₹10)`;
        }
      }
    }

    if (triggerReason) {
      console.log(`Generating AI Outlook for ${ipo.name}. Reason: ${triggerReason}`);
      const inputSnapshot = {
        gmp: currentGmpVal,
        peRatio: ipo.peRatio ?? null,
        ronw: ipo.ronw ?? null,
        revenueGrowth: ipo.revenueGrowth ?? null,
        profitGrowth: ipo.profitGrowth ?? null,
        debtToEquity: ipo.debtToEquity ?? null,
        issueSize: ipo.issueSize ?? null,
      };

      let outlookData;
      const startTime = Date.now();
      try {
        outlookData = await generator.generateOutlookPayload(ipo);
        outlookData.confidenceScore = Math.max(0, Math.min(100, outlookData.confidenceScore));
        
        if (!isValid(outlookData, inputSnapshot)) {
           console.log(`Initial validation failed for ${ipo.name}, retrying once...`);
           outlookData = await generator.generateOutlookPayload(ipo);
           outlookData.confidenceScore = Math.max(0, Math.min(100, outlookData.confidenceScore));
           if (!isValid(outlookData, inputSnapshot)) {
               throw new Error("Validation failed after retry.");
           }
        }
      } catch (err: any) {
        console.error(`Failed to generate outlook for ${ipo.name}:`, err.message);
        await outlookRef.set({
          id: ipo.id,
          ipoId: ipo.id,
          status: 'failed',
          lastError: err.message,
          generatedAt: FieldValue.serverTimestamp(),
          triggerStatus: existingOutlook?.triggerStatus || { initial: true, preOpen: false, closeDate: false }
        }, { merge: true });
        stats.failed++;
        console.log(`Waiting 5 seconds before next request...`);
        await new Promise(res => setTimeout(res, 5000));
        continue;
      }
      const generationDurationMs = Date.now() - startTime;

        const now = FieldValue.serverTimestamp();
        
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

        const triggerStatus = existingOutlook ? (existingOutlook.triggerStatus || { initial: true, preOpen: false, closeDate: false }) : { initial: true, preOpen: false, closeDate: false };
        if (triggerReason === "T-1 Open Date") triggerStatus.preOpen = true;
        if (triggerReason === "Close Date") triggerStatus.closeDate = true;

        await outlookRef.set({
          id: ipo.id,
          ipoId: ipo.id,
          modelProvider: MODEL_PROVIDER,
          modelVersion: MODEL_VERSION,
          promptVersion: PROMPT_VERSION,
          generatedAt: now,
          gmpAtGeneration: currentGmpVal,
          status: 'completed',
          triggerReason: triggerReason,
          triggeredBy: "system",
          triggeredByRole: "system",
          generationDurationMs,
          triggerStatus: triggerStatus,
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
        }, { merge: true });

        stats.analyzed++;
        console.log(`Successfully generated and saved outlook for ${ipo.name}`);
      } catch (err: any) {
        console.error("Critical error saving outlook:", err.message);
      }
      
      console.log(`Waiting 5 seconds before next request...`);
      await new Promise(res => setTimeout(res, 5000));
    } else {
      stats.skipped++;
    }
  }

  console.log("\n--- Execution Summary ---");
  console.log({
    analyzed: stats.analyzed,
    skipped: stats.skipped,
    failed: stats.failed
  });
}

run().catch(console.error);
