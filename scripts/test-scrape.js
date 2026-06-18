const cheerio = require('cheerio');

async function test() {
  try {
    const url = 'https://ipowatch.in/horizon-reclaim-ipo/';
    console.log('Fetching', url);
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const t = await r.text();
    const $ = cheerio.load(t);
    
    let lotSize = null;
    let minInvestment = null;
    let listingDate = null;
    
    $('table').each((i, table) => {
      if ($(table).text().includes('Lot Size') && !lotSize) {
        $(table).find('tr').each((j, tr) => {
          const rowText = $(tr).text().toLowerCase();
          if (rowText.includes('retail') && rowText.includes('minimum')) {
            const cols = $(tr).find('td, th').map((k, td) => $(td).text().trim()).get();
            console.log('Cols:', cols);
            if (cols.length >= 4) {
              lotSize = cols[2];
              minInvestment = cols[3];
            }
          }
        });
      }
    });

    $('table').each((i, table) => {
      $(table).find('tr').each((j, tr) => {
        const rowText = $(tr).text().toLowerCase();
        if (rowText.includes('listing date')) {
          const cols = $(tr).find('td, th').map((k, td) => $(td).text().trim()).get();
          if (cols.length >= 2) {
            listingDate = cols[1];
          }
        }
      });
    });
    
    console.log({ lotSize, minInvestment, listingDate });
  } catch (e) {
    console.error(e);
  }
}
test();
