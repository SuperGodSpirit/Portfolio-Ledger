const cheerio = require('cheerio');
const admin = require('firebase-admin');

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountKey) {
  console.error("FIREBASE_SERVICE_ACCOUNT is not set. Exiting.");
  process.exit(1); 
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountKey);
} catch (e) {
  console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT. Must be valid JSON.");
  process.exit(1);
}

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function scrapeIPOWatch() {
  console.log("Fetching IPOWatch GMP data...");
  const ipos = [];

  try {
    const response = await fetch('https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
      }
    });
    const html = await response.text();
    const $ = cheerio.load(html);

    // Skip the first row as it's the header
    const rows = $('table tbody tr').slice(1);
    
    rows.each((index, element) => {
      const $row = $(element);
      const tds = $row.find('td');
      
      if (tds.length < 8) return;

      const nameAnchor = $(tds[0]).find('a');
      const name = nameAnchor.text().trim() || $(tds[0]).text().trim();
      const issuerLink = nameAnchor.attr('href') || null;
      
      const gmp = $(tds[1]).text().trim();
      const priceBand = $(tds[3]).text().trim();
      const dateString = $(tds[5]).text().trim(); // e.g. "23-25 June"
      const type = $(tds[6]).text().trim().toLowerCase(); // "mainboard" or "sme"
      const rawStatus = $(tds[7]).text().trim().toLowerCase();

      if (!name) return;
      if (name.toLowerCase() === 'ipo name') return;

      let status = 'upcoming';
      if (rawStatus.includes('open')) {
        status = 'active';
      } else if (rawStatus.includes('close')) {
        status = 'closed';
      } else if (rawStatus.includes('list')) {
        status = 'listed';
      }

      // Simple date splitting "23-25 June" -> "23 June" and "25 June"
      let openDate = dateString;
      let closeDate = dateString;
      const dateMatch = dateString.match(/(\d+)-(\d+)\s+([a-zA-Z]+)/);
      if (dateMatch) {
        openDate = `${dateMatch[1]} ${dateMatch[3]}`;
        closeDate = `${dateMatch[2]} ${dateMatch[3]}`;
      } else if (dateString.includes('-')) {
         const parts = dateString.split('-');
         openDate = parts[0].trim();
         closeDate = parts[1].trim();
      }

      const idSuffix = type.includes('sme') ? '-sme' : '';

      ipos.push({
        id: name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() + idSuffix,
        name: type.includes('sme') ? name + ' (SME)' : name,
        priceBand: priceBand || 'N/A',
        lotSize: null,
        openDate: openDate || null,
        closeDate: closeDate || null,
        listingDate: null, // Not easily parsed here
        gmp: gmp || 'N/A',
        status,
        sourceLink: issuerLink || 'https://ipowatch.in',
      });
    });

    console.log(`Scraped ${ipos.length} IPOs from IPOWatch.`);
  } catch (error) {
    console.error("Error scraping IPOWatch:", error);
    process.exit(1);
  }

  return ipos;
}

async function updateFirestore(ipos) {
  console.log("Updating Firestore...");
  const batch = db.batch();
  const collectionRef = db.collection('market_ipos');
  
  for (const ipo of ipos) {
    const docRef = collectionRef.doc(ipo.id);
    batch.set(docRef, {
      ...ipo,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }
  
  const metaRef = db.collection('market_ipos_meta').doc('metadata');
  batch.set(metaRef, {
    lastFetchedAt: new Date().toISOString(),
    status: 'success'
  });

  try {
    await batch.commit();
    console.log("Successfully updated Firestore with IPO data.");
  } catch (error) {
    console.error("Error committing to Firestore:", error);
    process.exit(1);
  }
}

async function run() {
  const ipos = await scrapeIPOWatch();
  if (ipos.length > 0) {
    await updateFirestore(ipos);
  } else {
    console.error("No IPOs scraped. Something might have changed on the website.");
    process.exit(1);
  }
}

run();
