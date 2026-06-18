const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const cheerio = require('cheerio');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

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
        minInvestment: null,
        openDate: openDate || null,
        closeDate: closeDate || null,
        listingDate: null,
        gmp: gmp || 'N/A',
        status,
        sourceLink: issuerLink || 'https://ipowatch.in',
      });
    });

    console.log(`Scraped ${ipos.length} IPOs from IPOWatch main page.`);
    
    // Fetch individual lot size for active/upcoming ones and recent closed ones
    let closedCount = 0;
    for (let i = 0; i < ipos.length; i++) {
      const ipo = ipos[i];
      if (ipo.status === 'closed') closedCount++;
      
      const shouldFetch = ipo.status === 'active' || ipo.status === 'upcoming' || (ipo.status === 'closed' && closedCount <= 10);
      
      if (shouldFetch && ipo.sourceLink && ipo.sourceLink.startsWith('http')) {
        try {
          console.log(`Fetching details for ${ipo.name}...`);
          const r = await fetch(ipo.sourceLink, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
          const t = await r.text();
          const _$ = cheerio.load(t);
          
          let lotSize = null;
          let minInvestment = null;
          let listingDate = null;
          let peRatio = null;
          let ronw = null;
          let debtToEquity = null;
          let issueSize = null;
          let revenueGrowth = null;
          let profitGrowth = null;
          
          let revenues = [];
          let pats = [];
          let eps = null;
          
          _$('table').each((idx, table) => {
            const text = _$(table).text().toLowerCase();
            
            // Lot Size
            if (text.includes('lot size') && !lotSize) {
              _$(table).find('tr').each((j, tr) => {
                const rowText = _$(tr).text().toLowerCase();
                if (rowText.includes('retail') && rowText.includes('minimum')) {
                  const cols = _$(tr).find('td, th').map((k, td) => _$(td).text().trim()).get();
                  if (cols.length >= 4) {
                    lotSize = cols[2];
                    minInvestment = cols[3];
                  }
                }
              });
            }

            // Dates
            if (text.includes('listing date') && !listingDate) {
              _$(table).find('tr').each((j, tr) => {
                const rowText = _$(tr).text().toLowerCase();
                if (rowText.includes('listing date')) {
                  const cols = _$(tr).find('td, th').map((k, td) => _$(td).text().trim()).get();
                  if (cols.length >= 2) {
                    listingDate = cols[1];
                  }
                }
              });
            }

            // KPI Table (PE, RoNW, Debt, EPS)
            if (text.includes('kpi') || text.includes('return on net worth')) {
              _$(table).find('tr').each((j, tr) => {
                const rowText = _$(tr).text().toLowerCase();
                const cols = _$(tr).find('td, th').map((k, td) => _$(td).text().trim()).get();
                if (cols.length >= 2) {
                  if (rowText.includes('p/e ratio') || rowText.includes('pe ratio')) {
                    const val = parseFloat(cols[1].replace(/[^0-9.]/g, ''));
                    if (!isNaN(val)) peRatio = val;
                  }
                  if (rowText.includes('ronw') || rowText.includes('return on net worth')) {
                    const val = parseFloat(cols[1].replace(/[^0-9.]/g, ''));
                    if (!isNaN(val)) ronw = val;
                  }
                  if (rowText.includes('debt to equity')) {
                    const val = parseFloat(cols[1].replace(/[^0-9.]/g, ''));
                    if (!isNaN(val)) debtToEquity = val;
                  }
                  if (rowText.includes('earning per share') || rowText.includes('eps')) {
                    const val = parseFloat(cols[1].replace(/[^0-9.]/g, ''));
                    if (!isNaN(val)) eps = val;
                  }
                }
              });
            }

            // Issue Size Table
            if (text.includes('issue size')) {
              _$(table).find('tr').each((j, tr) => {
                const rowText = _$(tr).text().toLowerCase();
                if (rowText.includes('issue size')) {
                  const cols = _$(tr).find('td, th').map((k, td) => _$(td).text().trim()).get();
                  if (cols.length >= 2) {
                    // Extract numeric value in Crores
                    const match = cols[1].match(/₹([\d.]+)\s*Crores/i);
                    if (match) issueSize = parseFloat(match[1]);
                  }
                }
              });
            }

            // Financials Table (Revenue, PAT)
            if (text.includes('revenue') && text.includes('pat') && text.includes('period ended')) {
               _$(table).find('tr').each((j, tr) => {
                  const cols = _$(tr).find('td, th').map((k, td) => _$(td).text().trim()).get();
                  if (cols.length >= 4 && !cols[0].toLowerCase().includes('period ended')) {
                     const period = cols[0].trim();
                     // Only include full years to avoid negative growth comparing 9mo to 12mo
                     if (/^\d{4}$/.test(period)) {
                       const rev = parseFloat(cols[1].replace(/[^0-9.]/g, ''));
                       const pat = parseFloat(cols[3].replace(/[^0-9.]/g, ''));
                       if (!isNaN(rev)) revenues.push(rev);
                       if (!isNaN(pat)) pats.push(pat);
                     }
                  }
               });
            }
          });

          // Fallback PE Ratio Calculation
          if (!peRatio && eps && ipo.priceBand) {
             const maxPriceMatch = ipo.priceBand.match(/to\s*₹?([\d.]+)/i) || ipo.priceBand.match(/₹([\d.]+)/);
             if (maxPriceMatch) {
                const maxPrice = parseFloat(maxPriceMatch[1]);
                peRatio = Number((maxPrice / eps).toFixed(2));
             }
          }

          if (revenues.length >= 2) {
            const current = revenues[revenues.length - 1];
            const prev = revenues[revenues.length - 2];
            if (prev !== 0) revenueGrowth = Number((((current - prev) / prev) * 100).toFixed(2));
          }
          
          if (pats.length >= 2) {
            const current = pats[pats.length - 1];
            const prev = pats[pats.length - 2];
            if (prev !== 0) profitGrowth = Number((((current - prev) / Math.abs(prev)) * 100).toFixed(2));
          }
          
          ipo.lotSize = lotSize;
          ipo.minInvestment = minInvestment;
          ipo.listingDate = listingDate;
          ipo.peRatio = peRatio;
          ipo.ronw = ronw;
          ipo.debtToEquity = debtToEquity;
          ipo.issueSize = issueSize;
          ipo.revenueGrowth = revenueGrowth;
          ipo.profitGrowth = profitGrowth;
          
          // small delay to avoid rate limiting
          await new Promise(res => setTimeout(res, 500));
        } catch(e) {
          console.error("Failed to fetch details for", ipo.name, e.message);
        }
      }
    }
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
      updatedAt: FieldValue.serverTimestamp()
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

run().catch((error) => {
  console.error("Fatal error in scraper:", error);
  process.exit(1);
});
