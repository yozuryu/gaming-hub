// Unlock history: every unlocked achievement, all time, in one compact list per
// calendar year. The achievement chunks only cover 364 days and carry display
// fields for the timeline; the Analytics page needs all-time counts, so each
// pipeline rebuilds this from the per-game data it already holds.
//
// Files: data/{ra,steam,xbox}/history/{YYYY}.json (UTC year of the unlock)
//   { metadata, unlocks: [{ t, g, a, n, p?, r?, hc? }] }  sorted by t, oldest first
//        data/{ra,steam,xbox}/history/index.json
//   { years: { "2026": 544, ... } }  so the site knows which year files exist
//   t  unlock time, ISO UTC          g  game id       a  achievement id    n  achievement name
//   p  RA points / Xbox gamerscore   r  rarity % (share of players who have it)
//   hc RA only: unlocked in hardcore

const fs   = require('fs');
const path = require('path');

const readJson = (filePath) => {
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return null; }
};

const round1 = (n) => (n == null || Number.isNaN(n) ? undefined : Math.round(n * 10) / 10);

/**
 * Writes the year files for a full list of unlocks. Only files whose content
 * changed (ignoring metadata) are rewritten; years that no longer have unlocks
 * are removed.
 *
 * @param unlocks  [{ t, g, a, n, p?, r?, hc? }], t as ISO UTC
 * @returns { written, years }
 */
function writeUnlockHistory(dir, unlocks, { asOf, dryRun = false } = {}) {
    const byYear = {};
    for (const u of unlocks) {
        if (!u.t) continue;
        const clean = Object.fromEntries(Object.entries({ ...u, r: round1(u.r) }).filter(([, v]) => v !== undefined && v !== null && v !== false));
        (byYear[u.t.slice(0, 4)] ??= []).push(clean);
    }

    let written = 0;
    for (const [year, list] of Object.entries(byYear)) {
        list.sort((a, b) => a.t.localeCompare(b.t) || String(a.g).localeCompare(String(b.g)) || String(a.a).localeCompare(String(b.a)));
        const filePath = path.join(dir, `${year}.json`);
        const prev = readJson(filePath);
        if (prev && JSON.stringify(prev.unlocks) === JSON.stringify(list)) continue;
        if (!dryRun) {
            fs.mkdirSync(dir, { recursive: true });
            // One unlock per line: compact, and new unlocks show up as one-line diffs
            const metadata = JSON.stringify({ generatedAt: asOf, year: Number(year), count: list.length });
            fs.writeFileSync(filePath, `{\n"metadata": ${metadata},\n"unlocks": [\n${list.map(u => JSON.stringify(u)).join(',\n')}\n]}\n`, 'utf8');
        }
        written++;
    }

    if (!dryRun && fs.existsSync(dir)) {
        for (const file of fs.readdirSync(dir)) {
            const year = path.basename(file, '.json');
            if (/^\d{4}$/.test(year) && !byYear[year]) { fs.unlinkSync(path.join(dir, file)); written++; }
        }
    }

    const index = { years: Object.fromEntries(Object.keys(byYear).sort().map(y => [y, byYear[y].length])) };
    const indexPath = path.join(dir, 'index.json');
    if (JSON.stringify(readJson(indexPath)) !== JSON.stringify(index)) {
        if (!dryRun) {
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(indexPath, JSON.stringify(index, null, 4), 'utf8');
        }
        written++;
    }
    return { written, years: Object.keys(byYear).sort() };
}

module.exports = { writeUnlockHistory };
