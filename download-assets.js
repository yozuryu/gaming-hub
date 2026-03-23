/**
 * download-assets.js
 * Run once (and whenever you want to refresh assets):
 *   node download-assets.js
 *
 * Downloads all hub assets into ./assets/
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const ASSETS_DIR = path.join(__dirname, 'assets');
if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

const ASSETS = [
  {
    file: 'avatar.png',
    urls: [
      'https://avatars.githubusercontent.com/yozuryu?size=256',
    ],
  },
  {
    file: 'icon-ra.png',
    urls: [
      'https://static.retroachievements.org/assets/images/favicon.webp',
      'https://retroachievements.org/favicon.ico',
      'https://www.google.com/s2/favicons?domain=retroachievements.org&sz=64',
    ],
  },
  {
    file: 'icon-steam.png',
    urls: [
      'https://store.steampowered.com/favicon.ico',
      'https://www.google.com/s2/favicons?domain=steampowered.com&sz=64',
    ],
  },
  {
    file: 'icon-xbox.png',
    urls: [
      'https://www.xbox.com/favicon.ico',
      'https://www.google.com/s2/favicons?domain=xbox.com&sz=64',
    ],
  },
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close(); fs.unlinkSync(dest);
        download(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close(); fs.unlinkSync(dest);
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', err => { try { fs.unlinkSync(dest); } catch(e){} reject(err); });
    file.on('error', err => { try { fs.unlinkSync(dest); } catch(e){} reject(err); });
  });
}

async function run() {
  console.log(`Saving assets to: ${ASSETS_DIR}\n`);

  for (const asset of ASSETS) {
    const dest = path.join(ASSETS_DIR, asset.file);
    let success = false;

    for (const url of asset.urls) {
      process.stdout.write(`  ${asset.file} (${url.split('/')[2]})...`);
      try {
        await download(url, dest);
        console.log(' ✓');
        success = true;
        break;
      } catch (e) {
        console.log(` ✗ (${e.message}), trying next...`);
      }
    }

    if (!success) {
      console.log(`  ✗ All sources failed for ${asset.file}. Add it manually to assets/.`);
    }
  }

  console.log('\nDone. Commit the assets/ folder to your repo.');
  process.exit(0);
}

run();
