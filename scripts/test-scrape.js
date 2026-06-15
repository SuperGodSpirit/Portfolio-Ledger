async function test() {
  try {
    const r = await fetch('https://ipowatch.in/advit-jewels-ipo/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const t = await r.text();
    const cheerio = require('cheerio');
    const $ = cheerio.load(t);
    $('table').each((i, table) => {
      if ($(table).text().includes('Lot Size')) {
        console.log('--- TABLE ---');
        $(table).find('tr').each((j, tr) => {
          console.log($(tr).find('td, th').map((k, td) => $(td).text().trim()).get().join(' | '));
        });
      }
    });
  } catch(e) {
    console.error('Error fetching:', e);
  }
}
test();
