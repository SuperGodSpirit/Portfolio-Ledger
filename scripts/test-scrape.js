const cheerio = require('cheerio');

async function test() {
  try {
    const r = await fetch('https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
      }
    });
    const t = await r.text();
    const $ = cheerio.load(t);
    const secondRow = $('table tbody tr').eq(1).html();
    console.log('Second Row HTML:', secondRow);
  } catch(e) {
    console.error('Error fetching:', e);
  }
}
test();
