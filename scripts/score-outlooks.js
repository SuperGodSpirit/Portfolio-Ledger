const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

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

function calculateAccuracyScore(actualGain, outlook) {
  // 1. Distance Score (Max 70)
  const gmpMidpoint = (outlook.gmpCase.min + outlook.gmpCase.max) / 2;
  const distance = Math.abs(actualGain - gmpMidpoint);
  let distanceScore = 70 - (distance * 1.5);
  distanceScore = Math.max(0, distanceScore);

  // 2. Coverage Bonus (Max 20)
  let coverageBonus = 0;
  if (actualGain >= outlook.gmpCase.min && actualGain <= outlook.gmpCase.max) {
    coverageBonus = 20;
  } else if (actualGain >= outlook.baseCase.min && actualGain <= outlook.baseCase.max) {
    coverageBonus = 15;
  } else if (
    (actualGain >= outlook.bullCase.min && actualGain <= outlook.bullCase.max) ||
    (actualGain >= outlook.bearCase.min && actualGain <= outlook.bearCase.max)
  ) {
    coverageBonus = 10;
  }

  // 3. Confidence Calibration (±10)
  let confidenceCalibration = 0;
  const conf = outlook.confidenceScore;
  const insideGmpOrBase = coverageBonus === 20 || coverageBonus === 15;
  const missedAll = coverageBonus === 0;

  if (insideGmpOrBase && conf > 75) {
    confidenceCalibration = 10;
  } else if (missedAll && conf > 75) {
    confidenceCalibration = -10;
  } else if (missedAll && conf < 50) {
    confidenceCalibration = 10;
  }

  let finalScore = distanceScore + coverageBonus + confidenceCalibration;
  return Math.max(0, Math.min(100, finalScore)); // clamp 0-100
}

// Dummy function to represent fetching actual listing gain.
// In reality, this would scrape NSE/BSE or an IPO website for the listing price.
async function fetchActualListingGain(ipoName) {
  // Return null if not yet listed or available
  return null;
}

async function run() {
  console.log("Checking for listed IPOs to score...");
  const iposSnapshot = await db.collection('market_ipos')
    .where('status', '==', 'listed')
    .get();
    
  for (const doc of iposSnapshot.docs) {
    const ipo = doc.data();
    
    const outlookRef = db.collection('ipoOutlooks').doc(ipo.id);
    const outlookDoc = await outlookRef.get();
    
    if (outlookDoc.exists) {
      const outlook = outlookDoc.data();
      
      if (outlook.modelAccuracyScore === null) {
        // Try to fetch actual listing gain
        const actualGain = await fetchActualListingGain(ipo.name);
        
        if (actualGain !== null) {
          const score = calculateAccuracyScore(actualGain, outlook);
          
          await outlookRef.update({
            actualListingGain: actualGain,
            modelAccuracyScore: score,
            status: 'completed' // or a new state like 'scored'
          });
          
          console.log(`Scored ${ipo.name}: Actual Gain=${actualGain}%, Score=${score}`);
        }
      }
    }
  }
}

run().catch(console.error);
