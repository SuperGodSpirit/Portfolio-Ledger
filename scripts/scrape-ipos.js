const cheerio = require('cheerio');
const admin = require('firebase-admin');

// We use GitHub Actions secrets to set the FIREBASE_SERVICE_ACCOUNT variable
// It should be a base64 encoded JSON or stringified JSON
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountKey) {
  console.error("FIREBASE_SERVICE_ACCOUNT is not set. Exiting.");
  process.exit(1); // Exit with error so GitHub action fails and notifies owner
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountKey);
} catch (e) {
  console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT. Must be valid JSON.");
  process.exit(1);
}

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function scrapeChittorgarh() {
  console.log("Fetching Chittorgarh IPO data...");
  const ipos = [];

  try {
    // Chittorgarh GMP page usually has all the consolidated info including dates, price and GMP
    // https://www.chittorgarh.com/report/ipo-gmp-grey-market-premium/248/
    // Let's scrape the main IPO list instead as instructed by subagent, 
    // and fallback to NA for GMP if we can't find it easily without a second request to keep it simple.
    
    const response = await fetch('https://www.chittorgarh.com/report/mainboard-ipo-list-in-india-bse-nse/82/');
    const html = await response.text();
    const $ = cheerio.load(html);

    $('table.table tbody tr').each((index, element) => {
      const $row = $(element);
      
      const name = $row.find('td[data-label="Company"]').text().trim();
      if (!name) return; // Skip empty rows

      const openDate = $row.find('td[data-label="Opening Date"]').text().trim();
      const closeDate = $row.find('td[data-label="Closing Date"]').text().trim();
      const listingDate = $row.find('td[data-label="Listing Date"]').text().trim();
      const issuePrice = $row.find('td[data-label="Issue Price (Rs.)"]').text().trim();
      const issuerLink = $row.find('td[data-label="Company"] a').attr('href');
      
      // Basic status parsing based on dates
      let status = 'upcoming';
      const now = new Date();
      if (closeDate) {
        const closeDateObj = new Date(closeDate);
        const openDateObj = new Date(openDate);
        if (!isNaN(closeDateObj) && !isNaN(openDateObj)) {
            if (now > closeDateObj) {
                status = 'closed';
            } else if (now >= openDateObj && now <= closeDateObj) {
                status = 'active';
            }
        }
      }
      
      ipos.push({
        id: name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase(),
        name,
        priceBand: issuePrice || 'N/A',
        lotSize: null, // Hard to parse from list, requires details page
        openDate: openDate || null,
        closeDate: closeDate || null,
        listingDate: listingDate || null,
        gmp: 'N/A', // Not available on this specific page as per subagent
        status,
        sourceLink: issuerLink || 'https://www.chittorgarh.com',
      });
    });

    console.log(`Scraped ${ipos.length} IPOs from Mainboard list.`);

    // SME IPOs
    const smeResponse = await fetch('https://www.chittorgarh.com/report/sme-ipo-list-in-india-bse-nse/83/');
    const smeHtml = await smeResponse.text();
    const $sme = cheerio.load(smeHtml);

    $sme('table.table tbody tr').each((index, element) => {
      const $row = $sme(element);
      const name = $row.find('td[data-label="Company"]').text().trim();
      if (!name) return;

      const openDate = $row.find('td[data-label="Opening Date"]').text().trim();
      const closeDate = $row.find('td[data-label="Closing Date"]').text().trim();
      const listingDate = $row.find('td[data-label="Listing Date"]').text().trim();
      const issuePrice = $row.find('td[data-label="Issue Price (Rs.)"]').text().trim();
      const issuerLink = $row.find('td[data-label="Company"] a').attr('href');

       let status = 'upcoming';
      const now = new Date();
      if (closeDate) {
        const closeDateObj = new Date(closeDate);
        const openDateObj = new Date(openDate);
        if (!isNaN(closeDateObj) && !isNaN(openDateObj)) {
            if (now > closeDateObj) {
                status = 'closed';
            } else if (now >= openDateObj && now <= closeDateObj) {
                status = 'active';
            }
        }
      }

      ipos.push({
        id: name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() + '-sme',
        name: name + ' (SME)',
        priceBand: issuePrice || 'N/A',
        lotSize: null,
        openDate: openDate || null,
        closeDate: closeDate || null,
        listingDate: listingDate || null,
        gmp: 'N/A',
        status,
        sourceLink: issuerLink || 'https://www.chittorgarh.com',
      });
    });
    
    console.log(`Total scraped after SME: ${ipos.length} IPOs.`);

  } catch (error) {
    console.error("Error scraping Chittorgarh:", error);
    process.exit(1);
  }

  return ipos;
}

async function updateFirestore(ipos) {
  console.log("Updating Firestore...");
  const batch = db.batch();
  const collectionRef = db.collection('market_ipos');
  
  // To avoid keeping old stale IPOs forever, we could delete old closed ones.
  // But for now, just insert/update the ones we fetched.
  
  for (const ipo of ipos) {
    const docRef = collectionRef.doc(ipo.id);
    batch.set(docRef, {
      ...ipo,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }
  
  // Also save fetch metadata
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
  const ipos = await scrapeChittorgarh();
  if (ipos.length > 0) {
    await updateFirestore(ipos);
  } else {
    console.error("No IPOs scraped. Something might have changed on the website.");
    process.exit(1);
  }
}

run();
