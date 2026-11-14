// Renders cards.html: the design sheet (samples/sheet.jpg), every story, post and wide card at its real size (JPEG),
// and every overlay alone on a transparent background at 3× (PNG). Needs Playwright and Chrome, and the network for art:
//   PLAYWRIGHT=/path/to/node_modules/playwright node render.cjs [id …]
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const fs = require('fs');
const page = 'file://' + __dirname + '/cards.html';
const out = __dirname + '/samples';
const only = process.argv.slice(2);
const settle = async pg => {
  await pg.waitForFunction(() => document.body.dataset.ready === '1');
  await pg.evaluate(() => Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))));
  const bad = await pg.evaluate(() => [...document.images].filter(i => !i.naturalWidth).map(i => i.src));
  if (bad.length) console.log('  missing images:', bad);
  await pg.waitForTimeout(250);
};
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ channel: 'chrome', args: ['--allow-file-access-from-files'] });
  const ctx = async (w, h, s) => (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: s })).newPage();
  let pg = await ctx(1736, 1000, 1);
  await pg.goto(page); await settle(pg);
  const designs = await pg.evaluate(() => window.DESIGNS);
  if (!only.length || only.includes('sheet')) await pg.screenshot({ path: out + '/sheet.jpg', type: 'jpeg', quality: 86, fullPage: true });
  await pg.close();
  for (const d of designs) {
    if (only.length && !only.includes(d.id)) continue;
    const ov = d.kind === 'overlay';
    pg = await ctx(1300, 1940, ov ? 3 : 1);
    await pg.goto(page + '?d=' + d.id); await settle(pg);
    const file = `${out}/${d.id}-${d.name.toLowerCase().replace(/\s+/g, '-')}.${ov ? 'png' : 'jpg'}`;
    await pg.locator(ov ? '.wrap' : '.card').screenshot(ov ? { path: file, omitBackground: true } : { path: file, type: 'jpeg', quality: 88 });
    console.log(d.id, d.name);
    await pg.close();
  }
  await b.close();
})();
