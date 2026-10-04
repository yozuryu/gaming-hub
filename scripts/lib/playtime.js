// Playtime log: turns the lifetime playtime totals each pipeline run sees into
// play sessions. Shared by steam-pipeline.js, ra-pipeline.js and
// backfill-playtime.js, so live runs and the backfill use identical logic.
//
// Files (per platform, under data/{steam,ra}/playtime/):
//   {YYYY}.json — { metadata, games: { id: { name, icon, console? } }, sessions: [{ start, end, gameId, minutes, approx? }] }
//                 A session belongs to the UTC year of its end. Sorted by end, oldest first.
//   state.json  — pipeline-only baseline: { asOf, games: { id: { total, lastPlayed, lastEnd } } }
//                 asOf = the last run that changed it (not every run, so idle runs write nothing)
//
// Session model (verified against the git history, see backlog/playtime-and-analytics.md):
//   end = the game's last-played time, start = end − delta. Steam moves last-played to the
//   session start when it begins and to the end when it closes; playtime only grows at the end.
//   RA's last-played behaves as the session end.
//   Steam also checkpoints playtime every 30 minutes while a game runs (moving last-played
//   to the checkpoint), so a run landing mid-session sees a finished chunk. A session that
//   starts within MERGE_GAP_MS of the game's previous session end continues that session.

const fs   = require('fs');
const path = require('path');

const MIN = 60 * 1000;
const APPROX_TOLERANCE_MS = 2 * MIN;
const MERGE_GAP_MS = 5 * MIN;

// Parses ISO strings and RA's "YYYY-MM-DD HH:MM:SS" (UTC, no zone marker)
const toMs = (v) => {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return v;
    const s = /[zZ]|[+-]\d\d:?\d\d$/.test(v) ? v : v.replace(' ', 'T') + 'Z';
    const ms = Date.parse(s);
    return Number.isNaN(ms) ? null : ms;
};

const iso = (ms) => new Date(ms).toISOString().slice(0, 19) + 'Z';

/**
 * Compares a snapshot with the baseline and returns the sessions it implies.
 *
 * @param state     previous state.json content, or null on the first run
 * @param snapshot  [{ id, total, lastPlayed }] for every game the platform reports
 *                  (total in raw units, lastPlayed as ISO / RA string / ms / null,
 *                  or undefined when the source doesn't say)
 * @param opts.unitsPerMinute  1 for Steam (minutes), 60 for RA (seconds)
 * @param opts.asOf            time of the snapshot (ms); sessions never end after it
 * @returns { state, sessions, seeded }
 */
function diffPlaytime(state, snapshot, { unitsPerMinute, asOf }) {
    // First run: record the baseline only, otherwise lifetime playtime lands on today
    if (!state) {
        const games = {};
        for (const g of snapshot) {
            games[g.id] = { total: g.total ?? 0, lastPlayed: toMs(g.lastPlayed), lastEnd: null };
        }
        return { state: { asOf, games }, sessions: [], seeded: true };
    }

    const games = { ...state.games };
    const sessions = [];

    for (const g of snapshot) {
        const total = g.total ?? 0;
        let prev = games[g.id];
        if (!prev) {
            // Unknown game: new play only if it was played after the baseline was last
            // written (a new purchase or first RA session). Otherwise it's just a game the
            // baseline never listed (e.g. a backfill that only saw part of the library).
            const lp = toMs(g.lastPlayed);
            const playedSince = lp != null && state.asOf != null && lp > state.asOf;
            if (!playedSince) {
                games[g.id] = { total, lastPlayed: lp, lastEnd: null };
                continue;
            }
            prev = { total: 0, lastPlayed: null, lastEnd: null };
        }
        // undefined = this snapshot doesn't know (RA only reports it for recently played games)
        const lastPlayed = g.lastPlayed === undefined ? prev.lastPlayed : toMs(g.lastPlayed);
        const delta = total - prev.total;

        if (delta === 0) {
            // Steam marks a session in progress by moving last-played to its start
            if (lastPlayed !== prev.lastPlayed) games[g.id] = { ...prev, lastPlayed };
            continue;
        }

        // Negative, or playtime moved without any new play: a server-side correction
        if (delta < 0 || lastPlayed === prev.lastPlayed) {
            games[g.id] = { ...prev, total, lastPlayed };
            continue;
        }

        // Under a minute: keep the remainder in the baseline so it adds up later
        if (delta < unitsPerMinute) {
            games[g.id] = { ...prev, lastPlayed };
            continue;
        }

        const minutes = Math.round(delta / unitsPerMinute);
        let approx = false;
        let end = lastPlayed ?? asOf;
        if (lastPlayed == null || end > asOf) { end = asOf; approx = true; }

        let start = end - minutes * MIN;
        let continues = null;
        if (prev.lastEnd != null && Math.abs(start - prev.lastEnd) <= MERGE_GAP_MS) {
            // Picks up where the last logged session ended (a Steam checkpoint): extend it
            continues = iso(prev.lastEnd);
        } else if (prev.lastEnd != null && start < prev.lastEnd - APPROX_TOLERANCE_MS) {
            // Never overlap the game's previous session; if it had to move, the times are a guess
            // (offline play synced late, or RA splitting one session across two runs)
            start = Math.min(prev.lastEnd, end);
            approx = true;
        }

        const session = { start: iso(start), end: iso(end), gameId: g.id, minutes };
        if (approx) session.approx = true;
        // Internal: the writer extends the session ending at this time instead of appending
        if (continues) session.continues = continues;
        sessions.push(session);

        games[g.id] = { total, lastPlayed, lastEnd: end };
    }

    const changed = JSON.stringify(games) !== JSON.stringify(state.games);
    return { state: { asOf: changed ? asOf : state.asOf ?? asOf, games }, sessions, seeded: false };
}

const readJson = (filePath) => {
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return null; }
};

const sameIgnoringMetadata = (prev, next) => {
    if (!prev) return false;
    const { metadata: _a, ...a } = prev;
    const { metadata: _b, ...b } = next;
    return JSON.stringify(a) === JSON.stringify(b);
};

/**
 * Appends sessions to their year files and writes the state. Files are only
 * rewritten when their content changes (ignoring metadata).
 *
 * @param meta  { [gameId]: { name, icon } } for the games in `sessions`
 * @returns number of files written
 */
function writePlaytimeFiles(dir, { state, sessions, meta, asOf, dryRun = false }) {
    const byYear = {};
    for (const s of sessions) (byYear[s.end.slice(0, 4)] ??= []).push(s);

    const writes = [];
    for (const [year, list] of Object.entries(byYear)) {
        const filePath = path.join(dir, `${year}.json`);
        const prev = readJson(filePath) ?? { games: {}, sessions: [] };
        const games = { ...prev.games };
        for (const s of list) {
            const m = meta[s.gameId];
            games[s.gameId] = { name: m?.name ?? games[s.gameId]?.name ?? null, icon: m?.icon ?? games[s.gameId]?.icon ?? null };
            const consoleName = m?.console ?? games[s.gameId]?.console;
            if (consoleName) games[s.gameId].console = consoleName;   // RA only
        }
        const all = [...prev.sessions];
        for (const { continues, ...rec } of list) {
            const target = continues && all.findLast(x => x.gameId === rec.gameId && x.end === continues);
            if (target) {
                target.end = rec.end;
                target.minutes += rec.minutes;
                if (rec.approx) target.approx = true;
            } else {
                all.push(rec);
            }
        }
        all.sort((a, b) => a.end.localeCompare(b.end));
        writes.push([filePath, { metadata: { generatedAt: iso(asOf), year: Number(year) }, games, sessions: all }]);
    }
    writes.push([path.join(dir, 'state.json'), state]);

    let written = 0;
    for (const [filePath, data] of writes) {
        if (sameIgnoringMetadata(readJson(filePath), data)) continue;
        if (!dryRun) {
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
        }
        written++;
    }
    return written;
}

/**
 * One pipeline run: reads state.json, diffs the snapshot, writes new sessions and state.
 *
 * @param dir       data/{platform}/playtime
 * @param snapshot  as for diffPlaytime, plus { name, icon } per game for the year files
 * @param opts      { unitsPerMinute, asOf, dryRun, log }
 */
function updatePlaytimeLog(dir, snapshot, { unitsPerMinute, asOf, dryRun = false, log = () => {} }) {
    const prevState = readJson(path.join(dir, 'state.json'));
    const { state, sessions, seeded } = diffPlaytime(prevState, snapshot, { unitsPerMinute, asOf });
    const meta = Object.fromEntries(snapshot.map(g => [g.id, g]));
    const written = writePlaytimeFiles(dir, { state, sessions, meta, asOf, dryRun });

    if (seeded) log(`baseline seeded (${snapshot.length} games), no sessions logged`);
    else log(`${sessions.length} new session(s)${sessions.length ? ': ' + sessions.map(s => `${meta[s.gameId]?.name ?? s.gameId} ${s.minutes}m${s.continues ? ' (continued)' : ''}`).join(', ') : ''}${dryRun ? '  (dry run)' : ''}`);
    return { sessions, seeded, written };
}

module.exports = { diffPlaytime, writePlaytimeFiles, updatePlaytimeLog, toMs, iso };
