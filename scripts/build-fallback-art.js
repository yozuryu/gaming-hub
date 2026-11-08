// Builds assets/art-fallback.webp: a mosaic of art from the game library, shown behind cards,
// rows and headers whose game has no screenshot or wide art (the `.art-icon` images in
// assets/ui.css), instead of the game's own icon blown up and blurred. Like RetroAchievements'
// fallback banner: one shared image, made once, cached once.
//
// Usage: npm run data:pull (the indexes are read from data/), then
//   node scripts/build-fallback-art.js [--cols 30] [--rows 22] [--seed 7]
// Pieces, packed on a grid of CELL px cells so the result is uneven on purpose:
//   RA / Xbox: the square icon, 2×2 cells (big) or 1×1 (small)
//   Steam: the store header (460×215), 4×2 cells (big) or 2×1 (small)
// Every RA game in the games index, and the Steam / Xbox games with at least one unlock; the grid
// takes what fits. No piece crosses the image edge, so the image repeats seamlessly.
// After changing the grid size, update background-size in ui.css and W/H in art-fallback.js.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'art-fallback.webp');
const CELL = 40;       // px per grid cell in the image
const GAP = 4;         // px between pieces, also after the last column / row so the tile repeats evenly
const BG = '#0e141b';

const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? Number(process.argv[i + 1]) : def; };
const COLS = arg('cols', 30), ROWS = arg('rows', 22), SEED = arg('seed', 7);

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

// Seeded random, so a rebuild with the same library gives the same picture
let state = SEED >>> 0;
const rnd = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const shuffle = (list) => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Xbox images are full-size originals; ask the image server for a smaller one (same as xboxImg())
const xboxIcon = (url) => (url.includes('store-images.s-microsoft.com') ? `${url}${url.includes('?') ? '&' : '?'}w=128` : url.includes('images-eds') ? `${url}&w=128` : url);

function sources() {
  const ra = Object.values(readJson('data/ra/games/index.json').games ?? {})
    .filter(g => g.imageIcon).map(g => ({ kind: 'square', url: `https://media.retroachievements.org${g.imageIcon}` }));
  const xbox = Object.values(readJson('data/xbox/games/index.json').achievementProgress ?? {})
    .filter(g => g.unlocked > 0 && g.iconUrl).map(g => ({ kind: 'square', url: xboxIcon(g.iconUrl) }));
  const steam = Object.entries(readJson('data/steam/games/index.json').achievementProgress ?? {})
    .filter(([, g]) => g.unlocked > 0).map(([id, g]) => ({ kind: 'wide', url: g.headerUrl ?? `https://cdn.akamai.steamstatic.com/steam/apps/${id}/header.jpg` }));
  console.log(`sources: ${ra.length} RA, ${xbox.length} Xbox (square), ${steam.length} Steam (wide)`);
  return { square: shuffle([...ra, ...xbox]), wide: shuffle(steam) };
}

// Piece sizes in cells, big first; a big one is tried first with these odds, else the small one
const SIZES = { square: [[2, 2], [1, 1]], wide: [[4, 2], [2, 1]] };
const BIG_ODDS = { square: 0.6, wide: 0.4 };

// Pack the grid row by row: at each empty cell pick a kind (wide about half the time), try its
// big size, then its small size, then the other kind; a single free cell always takes a small square
function pack(pools) {
  const used = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const fits = (c, r, w, h) => {
    if (c + w > COLS || r + h > ROWS) return false;
    for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) if (used[y][x]) return false;
    return true;
  };
  const next = { square: 0, wide: 0 };
  const pieces = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (used[r][c]) continue;
    const first = rnd() < 0.5 ? 'wide' : 'square';
    const order = [first, first === 'wide' ? 'square' : 'wide'];
    let placed = null;
    for (const kind of order) {
      const sizes = rnd() < BIG_ODDS[kind] ? SIZES[kind] : [SIZES[kind][1]];
      for (const [w, h] of sizes) if (!placed && fits(c, r, w, h)) placed = { kind, w, h };
      if (placed) break;
    }
    if (!placed) placed = { kind: 'square', w: 1, h: 1 };
    const pool = pools[placed.kind];
    const src = pool[next[placed.kind]++ % pool.length];
    for (let y = r; y < r + placed.h; y++) for (let x = c; x < c + placed.w; x++) used[y][x] = true;
    pieces.push({ ...placed, c, r, url: src.url });
  }
  return pieces;
}

const cache = new Map();
async function fetchImage(url) {
  if (!cache.has(url)) cache.set(url, (async () => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
    } catch { return null; }
  })());
  return cache.get(url);
}

async function render(piece) {
  const w = piece.w * CELL + (piece.w - 1) * GAP, h = piece.h * CELL + (piece.h - 1) * GAP;
  const buf = await fetchImage(piece.url);
  if (!buf) return null;
  try {
    // Pixel-art icons keep hard edges when scaled up; covers are photos and scale smoothly
    const kernel = piece.kind === 'square' && w > 64 ? 'nearest' : 'lanczos3';
    const input = await sharp(buf).resize(w, h, { fit: 'cover', kernel })
      .composite([{ input: Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="4" ry="4"/></svg>`), blend: 'dest-in' }])
      .png().toBuffer();
    return { input, left: piece.c * (CELL + GAP), top: piece.r * (CELL + GAP) };
  } catch { return null; }
}

async function main() {
  const pieces = pack(sources());
  const layers = [];
  for (let i = 0; i < pieces.length; i += 16) {
    layers.push(...(await Promise.all(pieces.slice(i, i + 16).map(render))).filter(Boolean));
    process.stdout.write(`\rrendered ${layers.length}/${pieces.length}`);
  }
  console.log();
  const width = COLS * (CELL + GAP), height = ROWS * (CELL + GAP);
  await sharp({ create: { width, height, channels: 3, background: BG } })
    .composite(layers).webp({ quality: 72 }).toFile(OUT);
  const count = (k, big) => pieces.filter(p => p.kind === k && (p.w * p.h > 2) === big).length;
  const kb = Math.round(fs.statSync(OUT).size / 1024);
  console.log(`wrote ${path.relative(ROOT, OUT)}: ${width}×${height}, ${kb} KB`);
  console.log(`pieces: ${count('square', true)} big + ${count('square', false)} small squares, ${count('wide', true)} big + ${count('wide', false)} small covers`);
}

main().catch(e => { console.error(e); process.exit(1); });
