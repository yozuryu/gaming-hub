// One-off: rebuilds data/{steam,ra}/playtime/ from the hourly snapshots in git history,
// using the same diff logic as the live pipelines (scripts/lib/playtime.js).
//
//   node scripts/backfill-playtime.js [--ref origin/main] [--platform steam|ra] [--dry-run]
//
// Run it with the hourly workflows paused (or between runs), then commit the output.
// It replaces any existing playtime files for the platform, state.json included, so the
// live pipeline continues from the last snapshot in <ref>.
//
// Snapshots only list some games fully, so games the replay hasn't seen yet are seeded
// before the diff instead of being treated as brand new (which would log their lifetime):
//   Steam: total − playtime_2weeks when the game is in recently played (exact when it was
//          absent from the previous, non-full recently played list), otherwise the total.
//   RA:    the total, unless the game is recently played and its playtime fits in the time
//          since the previous snapshot (a genuinely new game).

const { execFileSync } = require('child_process');
const fs   = require('fs');
const path = require('path');
const { diffPlaytime, writePlaytimeFiles, toMs } = require('./lib/playtime');

const arg = (name, def) => {
    const i = process.argv.indexOf(name);
    return i > -1 ? process.argv[i + 1] : def;
};
const REF      = arg('--ref', 'origin/main');
const PLATFORM = arg('--platform', null);
const DRY_RUN  = process.argv.includes('--dry-run');

const ROOT = path.join(__dirname, '..');
const git  = (...args) => execFileSync('git', args, { cwd: ROOT, maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
const show = (commit, file) => {
    try { return JSON.parse(git('show', `${commit}:${file}`)); } catch { return null; }
};
const commitsOf = (file) => git('log', '--reverse', '--format=%H', REF, '--', file).trim().split('\n').filter(Boolean);

const RECENT_LIMIT = 15; // both pipelines ask for 15 recently played games

function replay(platform, commits, readSnapshot, seedUnknown, unitsPerMinute) {
    let state = null, prevAsOf = null, prevRecentIds = null;
    const sessions = [], meta = {};
    let seededUnknown = 0;

    commits.forEach((commit, i) => {
        const snap = readSnapshot(commit);
        if (!snap) return;
        const { asOf, games, recentIds } = snap;

        if (state) {
            for (const g of games) {
                if (state.games[g.id]) continue;
                state.games[g.id] = { total: seedUnknown(g, { asOf, prevAsOf, recentIds, prevRecentIds }), lastPlayed: null, lastEnd: null };
                seededUnknown++;
            }
        }

        const r = diffPlaytime(state, games, { unitsPerMinute, asOf });
        state = r.state;
        sessions.push(...r.sessions);
        for (const g of games) meta[g.id] = { name: g.name ?? meta[g.id]?.name, icon: g.icon ?? meta[g.id]?.icon, console: g.console ?? meta[g.id]?.console };
        prevAsOf = asOf;
        prevRecentIds = recentIds;
        if ((i + 1) % 250 === 0) console.log(`  ${platform}: ${i + 1}/${commits.length} snapshots, ${sessions.length} sessions`);
    });

    return { state, sessions, meta, asOf: prevAsOf, seededUnknown };
}

// ── Steam ──────────────────────────────────────────────────────────────────────

function steamSnapshot(commit) {
    const profile = show(commit, 'data/steam/profile.json');
    if (!profile) return null;
    const index = show(commit, 'data/steam/games/index.json') ?? show(commit, 'data/steam/games.json');
    const games = new Map();
    for (const [id, g] of Object.entries(index?.achievementProgress ?? {})) {
        games.set(Number(id), { id: Number(id), total: g.playtimeForever ?? 0, lastPlayed: g.lastPlayedTs ?? null, name: g.gameName, icon: g.iconUrl ?? null });
    }
    const recent = profile.recentlyPlayed ?? [];
    for (const g of recent) {
        games.set(g.appId, { id: g.appId, total: g.playtimeForever ?? 0, lastPlayed: g.lastPlayedTs ?? null, name: g.name, icon: g.iconUrl ?? null, twoWeeks: g.playtime2Weeks ?? 0 });
    }
    return {
        asOf:      toMs(profile.metadata?.extractionTimestamp),
        games:     [...games.values()],
        recentIds: { ids: new Set(recent.map(g => g.appId)), full: recent.length >= RECENT_LIMIT },
    };
}

const steamSeed = (g, { recentIds, prevRecentIds }) => {
    if (!recentIds.ids.has(g.id)) return g.total;
    // Absent from a non-full list = no play in the two weeks before the previous snapshot,
    // so everything in playtime_2weeks happened since then
    if (prevRecentIds && !prevRecentIds.full && !prevRecentIds.ids.has(g.id)) return Math.max(0, g.total - g.twoWeeks);
    return g.total;
};

// ── RA ─────────────────────────────────────────────────────────────────────────

function raSnapshot(commit) {
    const profile = show(commit, 'data/ra/profile.json');
    const detailed = show(commit, 'data/ra/games.json')?.detailedGameProgress;
    if (!profile || !detailed) return null;
    const recent = profile.recentlyPlayedGames ?? [];
    const lastPlayed = Object.fromEntries(recent.map(g => [g.gameId, g.lastPlayed]));
    return {
        asOf:      toMs(profile.metadata?.extractionTimestamp),
        games:     Object.values(detailed).map(g => ({ id: g.id, total: g.userTotalPlaytime ?? 0, lastPlayed: lastPlayed[g.id], name: g.title, icon: g.imageIcon ?? null, console: g.consoleName ?? null })),
        recentIds: { ids: new Set(recent.map(g => g.gameId)) },
    };
}

const RA_WINDOW_TOLERANCE_SEC = 5 * 60;
const raSeed = (g, { asOf, prevAsOf, recentIds }) => {
    if (!recentIds.ids.has(g.id) || prevAsOf == null) return g.total;
    const windowSec = (asOf - prevAsOf) / 1000;
    return g.total <= windowSec + RA_WINDOW_TOLERANCE_SEC ? 0 : g.total;
};

// ── Run ────────────────────────────────────────────────────────────────────────

const PLATFORMS = {
    steam: { file: 'data/steam/profile.json', read: steamSnapshot, seed: steamSeed, units: 1 },
    ra:    { file: 'data/ra/profile.json',    read: raSnapshot,    seed: raSeed,    units: 60 },
};

module.exports = { PLATFORMS, replay, commitsOf };
if (require.main === module) for (const [platform, p] of Object.entries(PLATFORMS)) {
    if (PLATFORM && PLATFORM !== platform) continue;
    const commits = commitsOf(p.file);
    console.log(`${platform}: replaying ${commits.length} snapshots from ${REF}`);
    const { state, sessions, meta, asOf, seededUnknown } = replay(platform, commits, p.read, p.seed, p.units);

    const minutes = sessions.reduce((a, s) => a + s.minutes, 0);
    console.log(`${platform}: ${sessions.length} sessions, ${(minutes / 60).toFixed(1)} h, ${sessions.filter(s => s.approx).length} approx, ${seededUnknown} games seeded mid-replay`);
    for (const s of sessions.filter(s => s.minutes >= 240)) {
        console.log(`  long: ${s.start} → ${s.end}  ${s.minutes}m  ${meta[s.gameId]?.name ?? s.gameId}${s.approx ? '  (approx)' : ''}`);
    }

    const dir = path.join(ROOT, 'data', platform, 'playtime');
    if (DRY_RUN) continue;
    fs.rmSync(dir, { recursive: true, force: true });
    const written = writePlaytimeFiles(dir, { state, sessions, meta, asOf });
    console.log(`${platform}: ${written} file(s) written to ${path.relative(ROOT, dir)}/`);
}
