const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');

// Use fetch for Gemini REST API instead of openai package if needed,
// but since we are installing openai, we can use it.
const { OpenAI } = require('openai');

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (e) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT. Must be valid JSON.");
    process.exit(1);
  }
} else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  };
} else {
  console.error("Firebase credentials are not set. Exiting.");
  process.exit(1); 
}

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

// Initialize OpenAI client with Gemini Base URL and Key
let activeClient = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai",
});

let usingBackupKey = false;

const MODEL_PROVIDER = "google";
const MODEL_VERSION = "gemini-2.5-pro"; // Upgraded for better accuracy on limited runs
const PROMPT_VERSION = "ipo-outlook-v1";

const SYSTEM_PROMPT = `You are an AI generating structured IPO Outlooks. 
Use only the information provided in this prompt. Do not assume, estimate, infer, or fabricate financial metrics that are not explicitly supplied.

Rules:
1. Return a structured JSON containing ONLY these keys:
   - "bearCase": { "min": number, "max": number, "probability": number (0-100) }
   - "baseCase": { "min": number, "max": number, "probability": number (0-100) }
   - "gmpCase": { "min": number, "max": number, "probability": number (0-100) }
   - "bullCase": { "min": number, "max": number, "probability": number (0-100) }
   - "confidenceScore": number (0 to 100)
   - "rationale": string

2. CRITICAL: The min/max numbers for each case must represent the "Expected Listing Premium/Discount Percentage" (e.g., 25 means a 25% listing gain, -10 means a 10% listing loss). DO NOT output absolute price percentages like 125%.
3. Set the "probability" for each case as a percentage number (0 to 100) based on how likely it is to occur given the fundamentals and current GMP trend. The sum of all 4 probabilities should ideally be around 100.
4. High confidence (80-100) requires complete fundamentals. Partial data = moderate confidence. Missing critical data = low confidence. Never assign high confidence solely because GMP is strong.
5. If a field like peRatio, ronw, etc. is null, do NOT invent it. Note its absence in your rationale.
6. Do NOT include investment advice, recommendations, buy signals, or ratings.`;

async function generateOutlook(ipoData, attempt = 0) {
  const prompt = `
IPO Name: ${ipoData.name}
Price Band: ${ipoData.priceBand}
GMP: ${ipoData.gmp}
Lot Size: ${ipoData.lotSize || 'Unknown'}
Min Investment: ${ipoData.minInvestment || 'Unknown'}
Issue Size: ${ipoData.issueSize ? ipoData.issueSize + ' Crores' : 'Unknown'}
Open Date: ${ipoData.openDate || 'Unknown'}
Listing Date: ${ipoData.listingDate || 'Unknown'}

Financial Metrics:
PE Ratio: ${ipoData.peRatio !== null ? ipoData.peRatio : 'null'}
RoNW: ${ipoData.ronw !== null ? ipoData.ronw + '%' : 'null'}
Debt to Equity: ${ipoData.debtToEquity !== null ? ipoData.debtToEquity : 'null'}
Revenue Growth: ${ipoData.revenueGrowth !== null ? ipoData.revenueGrowth + '%' : 'null'}
Profit Growth: ${ipoData.profitGrowth !== null ? ipoData.profitGrowth + '%' : 'null'}
`;

  try {
    const response = await activeClient.chat.completions.create({
      model: MODEL_VERSION,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const raw = response.choices[0].message.content;
    return JSON.parse(raw);
  } catch (error) {
    if (!usingBackupKey && process.env.GEMINI_API_KEY_BACKUP) {
      console.log(`Primary key failed (${error.status || error.message || 'unknown error'}). Switching to backup key...`);
      activeClient = new OpenAI({
        apiKey: process.env.GEMINI_API_KEY_BACKUP,
        baseURL: process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai",
      });
      usingBackupKey = true;
      return await generateOutlook(ipoData, attempt); // Retry with new client
    }
    
    if (error.status === 429 || (error.message && error.message.includes('429'))) {
      const backoffDelays = [
        60 * 1000,           // 60 seconds
        180 * 1000,          // 3 minutes
        5 * 60 * 1000,       // 5 minutes
        15 * 60 * 1000,      // 15 minutes
        2 * 60 * 60 * 1000,  // 2 hours
        5 * 60 * 60 * 1000,  // 5 hours
        24 * 60 * 60 * 1000  // 1 day
      ];
      const delay = backoffDelays[Math.min(attempt, backoffDelays.length - 1)];
      console.log(`Rate limit exceeded. Waiting ${delay / 1000} seconds before retrying (Attempt ${attempt + 1})...`);
      await new Promise(res => setTimeout(res, delay));
      return await generateOutlook(ipoData, attempt + 1);
    }
    
    throw error;
  }
}

function parseGmp(gmpStr) {
  if (!gmpStr) return 0;
  const match = gmpStr.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function isValid(outlook, inputSnapshot) {
  if (outlook.confidenceScore < 0 || outlook.confidenceScore > 100) return false;
  if (outlook.bearCase.min > outlook.bearCase.max) return false;
  if (outlook.baseCase.min > outlook.baseCase.max) return false;
  if (outlook.gmpCase.min > outlook.gmpCase.max) return false;
  if (outlook.bullCase.min > outlook.bullCase.max) return false;
  
  if (!outlook.bearCase || !outlook.baseCase || !outlook.gmpCase || !outlook.bullCase || !outlook.rationale) return false;

  // Overconfidence rejection rule
  if (outlook.confidenceScore > 85) {
    let missingCount = 0;
    if (inputSnapshot.peRatio === null || inputSnapshot.peRatio === undefined) missingCount++;
    if (inputSnapshot.ronw === null || inputSnapshot.ronw === undefined) missingCount++;
    if (inputSnapshot.revenueGrowth === null || inputSnapshot.revenueGrowth === undefined) missingCount++;
    if (inputSnapshot.profitGrowth === null || inputSnapshot.profitGrowth === undefined) missingCount++;
    
    if (missingCount >= 2) {
      console.error("Validation failed: Overconfidence rejection rule triggered.");
      return false;
    }
  }

  return true;
}

async function run() {
  console.log("Checking for IPOs that need AI Outlook...");
  const iposSnapshot = await db.collection('market_ipos').get();
  
  for (const doc of iposSnapshot.docs) {
    const ipo = doc.data();
    
    // Only process retail IPOs where we can estimate investment <= 20k
    if (ipo.status !== 'upcoming' && ipo.status !== 'active') continue;
    
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
    
    // Also SME IPOs typically have > 1 lakh investment. If it's explicitly marked SME, it's likely > 20k.
    // However, the above logic correctly catches it because SME usually has high lot size / min investment.
    if (!isRetail) {
      console.log(`Skipping ${ipo.name} as min investment > ₹20,000.`);
      continue;
    }

    const outlookRef = db.collection('ipoOutlooks').doc(ipo.id);
    const outlookDoc = await outlookRef.get();
    
    let needsUpdate = false;
    let existingOutlook = null;
    
    const currentGmpVal = parseGmp(ipo.gmp);

    if (!outlookDoc.exists) {
      needsUpdate = true;
    } else {
      existingOutlook = outlookDoc.data();
      
      if (existingOutlook.status === 'failed') {
        needsUpdate = true;
      }
      
      // Check relative GMP change
      const oldGmp = existingOutlook.inputSnapshot?.gmp || 0;
      const change = Math.abs(currentGmpVal - oldGmp) / Math.max(oldGmp, 1);
      
      if (change >= 0.20) {
        console.log(`GMP changed significantly for ${ipo.name}. Old: ${oldGmp}, New: ${currentGmpVal}`);
        needsUpdate = true;
      }
      
      // Check T-24hr to listing
      if (ipo.listingDate) {
         // rough check: if listing date is tomorrow
         const listingTime = new Date(ipo.listingDate).getTime();
         const now = Date.now();
         const diffHours = (listingTime - now) / (1000 * 60 * 60);
         if (diffHours > 0 && diffHours <= 24) {
             console.log(`Listing date is within 24 hours for ${ipo.name}.`);
             // We only want to trigger this once in the 24h window.
             // We can check generatedAt.
             const hoursSinceLastGen = (now - existingOutlook.generatedAt.toMillis()) / (1000 * 60 * 60);
             if (hoursSinceLastGen > 24) {
                 needsUpdate = true;
             }
         }
      }
    }

    if (needsUpdate) {
      console.log(`Generating AI Outlook for ${ipo.name}...`);
      const inputSnapshot = {
        gmp: currentGmpVal,
        peRatio: ipo.peRatio ?? null,
        ronw: ipo.ronw ?? null,
        revenueGrowth: ipo.revenueGrowth ?? null,
        profitGrowth: ipo.profitGrowth ?? null,
        debtToEquity: ipo.debtToEquity ?? null,
        issueSize: ipo.issueSize ?? null,
      };

      try {
        let outlookData = await generateOutlook(ipo);
        
        // Clamp confidence
        outlookData.confidenceScore = Math.max(0, Math.min(100, outlookData.confidenceScore));
        
        if (!isValid(outlookData, inputSnapshot)) {
           console.log(`Initial validation failed for ${ipo.name}, retrying once...`);
           outlookData = await generateOutlook(ipo);
           outlookData.confidenceScore = Math.max(0, Math.min(100, outlookData.confidenceScore));
           if (!isValid(outlookData, inputSnapshot)) {
               throw new Error("Validation failed after retry.");
           }
        }

        await outlookRef.set({
          id: ipo.id,
          ipoId: ipo.id,
          modelProvider: MODEL_PROVIDER,
          modelVersion: MODEL_VERSION,
          promptVersion: PROMPT_VERSION,
          generatedAt: FieldValue.serverTimestamp(),
          status: 'completed',
          bearCase: outlookData.bearCase,
          baseCase: outlookData.baseCase,
          gmpCase: outlookData.gmpCase,
          bullCase: outlookData.bullCase,
          confidenceScore: outlookData.confidenceScore,
          rationale: outlookData.rationale,
          inputSnapshot,
          rawResponse: JSON.stringify(outlookData),
          actualListingGain: null,
          modelAccuracyScore: null,
        }, { merge: true });

        console.log(`Successfully generated and saved outlook for ${ipo.name}`);
      } catch (err) {
        console.error(`Failed to generate outlook for ${ipo.name}:`, err.message);
        await outlookRef.set({
          id: ipo.id,
          ipoId: ipo.id,
          status: 'failed',
          lastError: err.message,
          generatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      
      // Delay to avoid Gemini Free Tier rate limits (15 RPM)
      console.log(`Waiting 5 seconds before next request...`);
      await new Promise(res => setTimeout(res, 5000));
    }
  }
}

run().catch(console.error);
