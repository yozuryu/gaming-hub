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

// =========================================================
// Logging Helpers (matches pipeline.js style)
// =========================================================

const log = {
    section: (title) => console.log(`\n${'─'.repeat(60)}\n  ${title}\n${'─'.repeat(60)}`),
    step:    (msg)   => process.stdout.write(`  ${msg}`),
    ok:      (msg)   => console.log(`  ✓  ${msg}`),
    skip:    (msg)   => console.log(`  →  ${msg}`),
    fail:    (msg)   => console.error(`  ✗  ${msg}`),
    done:    (msg)   => console.log(` ✓  (${msg})`),
    err:     (msg)   => console.log(` ✗  (${msg})`),
};

// =========================================================
// Setup
// =========================================================

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

log.section('Download Assets');
log.step(`Process started at:  ${new Date().toISOString()}`);
console.log(' ✓');

if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
    log.ok(`Created assets directory: ${ASSETS_DIR}`);
} else {
    log.ok(`Assets directory: ${ASSETS_DIR}`);
}

// =========================================================
// Asset Definitions
// =========================================================

const ASSETS = [
  {
    file: 'avatar.png',
    label: 'GitHub Avatar',
    urls: [
      'https://avatars.githubusercontent.com/yozuryu?size=256',
    ],
  },
  {
    file: 'icon-ra.png',
    label: 'RetroAchievements Icon',
    urls: [
      'https://static.retroachievements.org/assets/images/favicon.webp',
      'https://retroachievements.org/favicon.ico',
      'https://www.google.com/s2/favicons?domain=retroachievements.org&sz=64',
    ],
  },
  {
    file: 'icon-steam.png',
    label: 'Steam Icon',
    urls: [
      'https://store.steampowered.com/favicon.ico',
      'https://www.google.com/s2/favicons?domain=steampowered.com&sz=64',
    ],
  },
  {
    file: 'icon-xbox.png',
    label: 'Xbox Icon',
    urls: [
      'https://www.xbox.com/favicon.ico',
      'https://www.google.com/s2/favicons?domain=xbox.com&sz=64',
    ],
  },
];

// =========================================================
// Download Helper
// =========================================================

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
      file.on('finish', () => {
        file.close();
        const sizeKb = (fs.statSync(dest).size / 1024).toFixed(1);
        resolve(sizeKb);
      });
    }).on('error', err => { try { fs.unlinkSync(dest); } catch(e){} reject(err); });
    file.on('error', err => { try { fs.unlinkSync(dest); } catch(e){} reject(err); });
  });
}

// =========================================================
// Main
// =========================================================

async function run() {
    log.section(`Fetching Assets  [ ${ASSETS.length} files ]`);

    let successCount = 0;
    let failCount    = 0;

    for (let i = 0; i < ASSETS.length; i++) {
        const asset = ASSETS[i];
        const dest  = path.join(ASSETS_DIR, asset.file);
        const idx   = `[${i + 1}/${ASSETS.length}]`;
        let success = false;

        console.log(`\n  ${idx} ${asset.label}`);

        for (let j = 0; j < asset.urls.length; j++) {
            const url    = asset.urls[j];
            const source = url.split('/')[2];
            const attempt = asset.urls.length > 1 ? ` (source ${j + 1}/${asset.urls.length}: ${source})` : ` (${source})`;

            log.step(`${asset.file}${attempt}...`);
            try {
                const sizeKb = await download(url, dest);
                log.done(`${sizeKb} KB`);
                success = true;
                successCount++;
                break;
            } catch (e) {
                if (j < asset.urls.length - 1) {
                    log.err(`${e.message} — trying next source`);
                } else {
                    log.err(e.message);
                }
            }
        }

        if (!success) {
            log.fail(`All sources failed for ${asset.file} — add it manually to assets/`);
            failCount++;
        }
    }

    log.section('Download Complete');
    log.ok(`Assets directory  : ${ASSETS_DIR}`);
    log.ok(`Succeeded         : ${successCount}/${ASSETS.length}`);
    if (failCount > 0) {
        log.fail(`Failed            : ${failCount}/${ASSETS.length} — check above for details`);
    }
    log.ok(`Commit the assets/ folder to your repo`);
    console.log();
    process.exit(0);
}

run();
