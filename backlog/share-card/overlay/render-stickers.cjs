// Renders stickers.html: the design sheet (stickers/sheet.jpg) and every sticker alone on a transparent
// background at 3× (stickers/{shape}-{game}.png). Needs Puppeteer and Chrome:
//   PUPPETEER=/path/to/node_modules/puppeteer node render-stickers.cjs
const p = require(process.env.PUPPETEER || 'puppeteer');
const fs = require('fs');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const page = 'file://' + __dirname + '/stickers.html';
const out = __dirname + '/stickers';
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await p.launch({ headless: 'new', executablePath: CHROME, args: ['--allow-file-access-from-files'] });
  const pg = await b.newPage();
  await pg.setViewport({ width: 1240, height: 900, deviceScaleFactor: 2 });
  await pg.goto(page, { waitUntil: 'load' });
  await pg.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 300));
  await pg.screenshot({ path: out + '/sheet.jpg', type: 'jpeg', quality: 82, fullPage: true });
  const games = await pg.evaluate(() => window.GAMES.map(g => g.key));
  const shapes = await pg.evaluate(() => window.SHAPES);
  const jobs = [];
  for (const shape of shapes) for (const game of games) if (await pg.evaluate((s, k) => window.CAN(s, k), shape, game)) jobs.push([shape, game]);
  await pg.setViewport({ width: 760, height: 500, deviceScaleFactor: 3 });
  for (const [shape, game] of jobs) {
    await pg.goto(`${page}?shape=${shape}&game=${game}`, { waitUntil: 'load' });
    await pg.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 150));
    await (await pg.$('.wrap')).screenshot({ path: `${out}/${shape}-${game}.png`, omitBackground: true });
  }
  await b.close();
})();
