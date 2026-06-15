async function test() {
  try {
    const r = await fetch('https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const t = await r.text();
    const cheerio = require('cheerio');
    const $ = cheerio.load(t);
    $('table tbody tr').slice(1).each((i, el) => {
      const row = $(el);
      const name = row.find('td').eq(0).text().trim();
      const link = row.find('td').eq(0).find('a').attr('href');
      if (name.includes('Utkal')) {
        console.log(`Utkal Link:`, link);
      }
    });
  } catch(e) {
    console.error('Error fetching:', e);
  }
}
test();
