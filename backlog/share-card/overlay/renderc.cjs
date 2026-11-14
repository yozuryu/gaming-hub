const p = require(process.env.PUPPETEER || 'puppeteer');   // PUPPETEER=/path/to/node_modules/puppeteer if it isn't installed here
const fs = require('fs');
(async () => {
  const b = await p.launch({ headless: 'new', executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const pg = await b.newPage(); await pg.setViewport({ width: 800, height: 400, deviceScaleFactor: 3 });
  for (const f of fs.readdirSync(__dirname + '/compact').filter(f => f.endsWith('.html'))) {
    await pg.goto('file://' + __dirname + '/compact/' + f, { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 250));
    const el = await pg.$('.wrap');
    await el.screenshot({ path: __dirname + '/compact/lego-2k-drive-' + f.replace('.html', '.png'), omitBackground: true });
  }
  await b.close();
})();
