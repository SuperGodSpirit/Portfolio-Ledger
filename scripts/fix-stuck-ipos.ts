import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

async function fixStuckIpos() {
  const snapshot = await db.collection('ipoOutlooks').where('status', '==', 'generating').get();
  console.log(`Found ${snapshot.size} stuck IPOs.`);
  
  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, { status: 'failed', lastError: 'Stuck in generating state due to previous crash' });
  });
  
  await batch.commit();
  console.log('Successfully reset stuck IPOs.');
}

fixStuckIpos().catch(console.error);
