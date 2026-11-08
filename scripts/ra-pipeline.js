require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
    buildAuthorization,
    getUserProfile,
    getUserRecentAchievements,
    getAchievementsEarnedBetween,
    getUserCompletionProgress,
    getUserAwards,
    getUserPoints,
    getGameInfoAndUserProgress,
    getUserRecentlyPlayedGames,
    getUserSummary,
    getUserWantToPlayList
} = require('@retroachievements/api');

const admin = require('firebase-admin');
const { updatePlaytimeLog, toMs, iso } = require('./lib/playtime');
const { writeUnlockHistory } = require('./lib/history');

// =========================================================
// Logging Helpers
// =========================================================

const DEBUG = process.argv.includes('--debug');

const log = {
    section: (title) => console.log(`\n${'─'.repeat(60)}\n  ${title}\n${'─'.repeat(60)}`),
    step: (msg) => process.stdout.write(`  ${msg}`),
    ok: (msg) => console.log(`  ✓  ${msg}`),
    skip: (msg) => console.log(`  →  ${msg}`),
    fail: (msg) => console.error(`  ✗  ${msg}`),
    info: (msg) => console.log(`     ${msg}`),
    done: (msg) => console.log(` ✓  (${msg})`),
    err: (msg) => console.log(` ✗  (${msg})`),
    debug: (msg, data) => {
        if (!DEBUG) return;
        console.log(`  [DBG] ${msg}`);
        if (data !== undefined) console.log(JSON.stringify(data, null, 2));
    },
};

// =========================================================
// Phase 1: Authentication and Infrastructure Initialization
// =========================================================

log.section('RetroAchievements ETL Pipeline');
log.step(`Process started at:  ${new Date().toISOString()}`);
console.log(' ✓');

log.section('Phase 1 — Authentication');

const RA_USERNAME = process.env.RA_USERNAME;
const RA_API_KEY = process.env.RA_API_KEY;

if (!RA_USERNAME || !RA_API_KEY) {
    log.fail('RetroAchievements credentials missing. Set RA_USERNAME and RA_API_KEY in .env');
    process.exit(1);
}

const authorization = buildAuthorization({ username: RA_USERNAME, webApiKey: RA_API_KEY });

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
}
const db = admin.firestore();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Retry an API call with backoff. If it still fails the error propagates:
// for profile-level data that aborts the run before anything is written, so
// the previous files stay in place instead of being replaced by partial data.
const RETRY_DELAYS_MS = [3000, 8000, 20000];
const withRetry = async (label, fn) => {
    for (let attempt = 0; ; attempt++) {
        try {
            return await fn();
        } catch (e) {
            if (attempt >= RETRY_DELAYS_MS.length) throw new Error(`${label}: ${e.message}`);
            log.info(`${label} failed (${e.message}) — retrying in ${RETRY_DELAYS_MS[attempt] / 1000}s`);
            await sleep(RETRY_DELAYS_MS[attempt]);
        }
    }
};
const fmtDate = (d) => d.toISOString().substring(0, 10);

// ── CLI Flags ──────────────────────────────────────────────
// --refresh-games   : re-fetch all game details (full refresh)
// --watchlist-only  : only fetch + write watchlist.json, skip everything else
// --debug           : verbose output; skips file writes (dry run)
// (default)         : load the cached games (games/{id}.json), only fetch new and recently played games
const REFRESH_GAMES    = process.argv.includes('--refresh-games');
const WATCHLIST_ONLY   = process.argv.includes('--watchlist-only');

log.ok(`RetroAchievements authenticated as: ${RA_USERNAME}`);
log.ok('Firebase Admin SDK initialized');
log.ok(`Game details mode        : ${REFRESH_GAMES ? 'Full refresh  (--refresh-games)' : 'Incremental   (new games only)'}`);
log.ok(`Watchlist-only mode      : ${WATCHLIST_ONLY ? 'yes  (--watchlist-only)' : 'no'}`);
log.ok(`Debug mode               : ${DEBUG ? 'enabled  (--debug)' : 'disabled'}`);

// =========================================================
// Phase 2: Profile Data & Detailed Game Extraction
// =========================================================

async function executeProfileExtraction(targetUser) {
    log.section(`Phase 2 — Profile Extraction  [ ${targetUser} ]`);

    const profilePayload = {
        metadata: { extractionTimestamp: new Date().toISOString() },
        username: targetUser,
        coreProfile: null,
        userSummary: null,
        points: null,
        pageAwards: null,
        recentAchievements: null,
        recentlyPlayedGames: null,
        wantToPlayList: null,
        gameAwardsAndProgress: null,
        detailedGameProgress: {},
        mostRecentAchievement: null,
        mostRecentGame: null,
    };

    try {
        log.step('Fetching core profile...');
        profilePayload.coreProfile = await withRetry('core profile', () => getUserProfile(authorization, { username: targetUser }));
        log.done(`${profilePayload.coreProfile.user}`);
        log.debug('coreProfile', profilePayload.coreProfile);
        await sleep(1500);

        log.step('Fetching user summary...');
        profilePayload.userSummary = await withRetry('user summary', () => getUserSummary(authorization, { username: targetUser }));
        log.done(`rank #${profilePayload.userSummary.rank}`);
        log.debug('userSummary', profilePayload.userSummary);
        await sleep(1500);

        log.step('Fetching points...');
        profilePayload.points = await withRetry('points', () => getUserPoints(authorization, { username: targetUser }));
        log.done(`${profilePayload.points.points} pts`);
        log.debug('points', profilePayload.points);
        await sleep(1500);

        log.step('Fetching awards...');
        profilePayload.pageAwards = await withRetry('awards', () => getUserAwards(authorization, { username: targetUser }));
        log.done(`${profilePayload.pageAwards.visibleUserAwards?.length ?? 0} awards`);
        log.debug('pageAwards', profilePayload.pageAwards);

        // Patreon icon override
        if (profilePayload.pageAwards?.visibleUserAwards) {
            profilePayload.pageAwards.visibleUserAwards.forEach(award => {
                if (award.awardType?.toLowerCase().includes('patreon')) {
                    award.imageIcon = 'https://static.retroachievements.org/assets/images/badge/patreon.png';
                }
            });
        }
        await sleep(1500);

        // ── Achievements: 4 × 3-month chunks spanning 1 year ──────────────
        console.log('\n  Fetching 1 year of achievements in 4 × 3-month chunks...');
        const CHUNK_DAYS = 91;
        const NUM_CHUNKS = 4;
        const MS_PER_DAY = 24 * 60 * 60 * 1000;
        const now = new Date();
        const allAchievements = [];

        for (let i = 0; i < NUM_CHUNKS; i++) {
            const toDate = new Date(now.getTime() - (i * CHUNK_DAYS * MS_PER_DAY));
            const fromDate = new Date(toDate.getTime() - (CHUNK_DAYS * MS_PER_DAY));

            process.stdout.write(`     Chunk ${i + 1}/${NUM_CHUNKS}  ${fmtDate(fromDate)} → ${fmtDate(toDate)}...`);
            // A missing chunk would publish a year of activity with a 3-month hole,
            // so a chunk that still fails after retries aborts the whole run.
            const chunk = await withRetry(`achievements chunk ${i + 1}`, () => getAchievementsEarnedBetween(authorization, {
                username: targetUser,
                fromDate,
                toDate,
            }));
            const count = Array.isArray(chunk) ? chunk.length : 0;
            if (count > 0) allAchievements.push(...chunk);
            console.log(` ✓  (${count} achievements)`);
            await sleep(1500);
        }

        // Deduplicate by achievementId + date in case chunk boundaries overlap
        const seen = new Set();
        profilePayload.recentAchievements = allAchievements.filter(a => {
            const key = `${a.achievementId}_${a.date}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        log.ok(`Total unique achievements collected: ${profilePayload.recentAchievements.length}`);
        await sleep(1500);

        log.step('Fetching most recent achievement...');
        profilePayload.mostRecentAchievement = (() => {
            if (!Array.isArray(profilePayload.recentAchievements) || profilePayload.recentAchievements.length === 0) return null;
            const sorted = [...profilePayload.recentAchievements].sort((a, b) => new Date(b.date) - new Date(a.date));
            return sorted[0];
        })();
        if (profilePayload.mostRecentAchievement) {
            log.done(profilePayload.mostRecentAchievement.title);
        } else {
            log.done('no recently unlocked achievements found');
        }

        log.step('Computing points earned (7d / 30d)...');
        (() => {
            const now        = Date.now();
            const ms7d       = 7  * 24 * 60 * 60 * 1000;
            const ms30d      = 30 * 24 * 60 * 60 * 1000;
            let points7d  = 0;
            let points30d = 0;
            (profilePayload.recentAchievements || []).forEach(a => {
                const ts  = new Date(a.date || 0).getTime();
                const pts = a.points || 0;
                if (now - ts <= ms30d) { points30d += pts; }
                if (now - ts <= ms7d)  { points7d  += pts; }
            });
            profilePayload.points7Days  = points7d;
            profilePayload.points30Days = points30d;
            log.done(`7d: ${points7d} pts  /  30d: ${points30d} pts`);
        })();


        log.step('Fetching recently played games...');
        profilePayload.recentlyPlayedGames = await withRetry('recently played', () => getUserRecentlyPlayedGames(authorization, { username: targetUser, count: 15 }));
        log.done(`${profilePayload.recentlyPlayedGames.length} games`);
        log.debug('recentlyPlayedGames', profilePayload.recentlyPlayedGames);
        await sleep(1500);

        log.step('Fetching most recently played games...');
        profilePayload.mostRecentGame = (() => {
            if (!Array.isArray(profilePayload.recentlyPlayedGames) || profilePayload.recentlyPlayedGames.length === 0) return null;
            const sorted = [...profilePayload.recentlyPlayedGames].sort((a, b) => new Date(b.lastPlayed) - new Date(a.lastPlayed));
            return sorted[0];
        })();
        if (profilePayload.mostRecentGame) {
            log.done(profilePayload.mostRecentGame.title);
        } else {
            log.done('no recently played games found');
        }


        log.step('Fetching want-to-play list...');
        const PAGE_SIZE = 500;
        const firstPage = await withRetry('want-to-play list', () => getUserWantToPlayList(authorization, { username: targetUser, count: PAGE_SIZE, offset: 0 }));
        const allWantToPlay = [...(firstPage.results || [])];
        const totalWantToPlay = firstPage.total ?? allWantToPlay.length;
        let offset = PAGE_SIZE;
        while (allWantToPlay.length < totalWantToPlay) {
            await sleep(1500);
            const page = await withRetry('want-to-play list', () => getUserWantToPlayList(authorization, { username: targetUser, count: PAGE_SIZE, offset }));
            const batch = page.results || [];
            if (batch.length === 0) break;
            allWantToPlay.push(...batch);
            offset += PAGE_SIZE;
        }
        profilePayload.wantToPlayList = { total: totalWantToPlay, results: allWantToPlay };
        log.done(`${totalWantToPlay} total, ${allWantToPlay.length} fetched`);
        await sleep(1500);

        log.step('Fetching completion progress...');
        profilePayload.gameAwardsAndProgress = await withRetry('completion progress', () => getUserCompletionProgress(authorization, { username: targetUser }));
        log.done(`${profilePayload.gameAwardsAndProgress.results?.length} games`);
        log.debug('gameAwardsAndProgress', profilePayload.gameAwardsAndProgress);
        await sleep(1500);

        // ── Detailed game progress ────────────────────────────────────────
        const progressGames = profilePayload.gameAwardsAndProgress?.results || [];

        // Seed from the previous run's games (games/{id}.json, or the old single games.json).
        // Incremental mode only fetches new and recently played games; full refresh re-fetches
        // everything but keeps the cached entry for any game whose fetch fails.
        const cached = readCachedGames();
        Object.assign(profilePayload.detailedGameProgress, cached);
        const cachedCount = Object.keys(cached).length;
        if (cachedCount) log.ok(`Loaded ${cachedCount} cached game(s)`);
        else log.skip('No cached games found — will fetch all games');
        if (REFRESH_GAMES) log.ok('Full refresh — all games will be re-fetched');

        const progressGameIds = new Set(progressGames.map(g => g.gameId));
        const recentGameIds   = new Set((profilePayload.recentlyPlayedGames || []).map(g => g.gameId));

        // Recently played games with 0 achievements earned won't appear in progressGames —
        // add them separately so they still show up in the recently played section
        const recentOnlyGames = (profilePayload.recentlyPlayedGames || [])
            .filter(g => !progressGameIds.has(g.gameId))
            .map(g => ({ gameId: g.gameId, title: g.title }));

        const allGamesToFetch = [...progressGames, ...recentOnlyGames];

        log.section(`Phase 2a — Completion Progress Details  [ ${progressGames.length} games + ${recentOnlyGames.length} recent-only ]`);

        let progressIdx = 0;
        for (const game of allGamesToFetch) {
            progressIdx++;
            if (!REFRESH_GAMES && profilePayload.detailedGameProgress[game.gameId] && !recentGameIds.has(game.gameId)) {
                log.skip(`[${progressIdx}/${allGamesToFetch.length}] [${game.gameId}] ${game.title} — already cached`);
                continue;
            }
            process.stdout.write(`  [${progressIdx}/${allGamesToFetch.length}] [${game.gameId}] ${game.title}...`);
            try {
                profilePayload.detailedGameProgress[game.gameId] = await withRetry(`game ${game.gameId}`, () => getGameInfoAndUserProgress(authorization, {
                    username: targetUser,
                    gameId: game.gameId,
                }));
                console.log(' ✓');
                log.debug(`game ${game.gameId} response`, profilePayload.detailedGameProgress[game.gameId]);
            } catch (e) {
                // One game failing shouldn't block the run; its cached entry (if any) is kept
                console.log(` ✗  (${e.message}${profilePayload.detailedGameProgress[game.gameId] ? ' — kept cached data' : ''})`);
            }
            await sleep(2000);
        }

        // A game with unlocks that RA no longer lists was reset or removed on RA: drop it.
        // Games without unlocks only come from recently played, so they stay once seen
        if (progressGames.length) {
            const listed = new Set(allGamesToFetch.map(g => String(g.gameId)));
            for (const [id, g] of Object.entries(profilePayload.detailedGameProgress)) {
                if (listed.has(String(id)) || !((g.numAwardedToUser ?? 0) > 0)) continue;
                delete profilePayload.detailedGameProgress[id];
                log.ok(`[${id}] ${g.title} — no longer on RA, removed`);
            }
        }

        return profilePayload;

    } catch (error) {
        log.fail(`Profile extraction failed: ${error.message}`);
        throw error;
    }
}

// =========================================================
// Phase 3: Local JSON Serialization (3-file split)
// =========================================================

function serializeLocally(payload) {
    log.section('Phase 3 — Local Serialization');

    const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'ra');
    const ACH_DIR    = path.join(OUTPUT_DIR, 'achievements');
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        log.ok(`Created output directory: ${OUTPUT_DIR}`);
    }
    if (!fs.existsSync(ACH_DIR)) {
        fs.mkdirSync(ACH_DIR, { recursive: true });
        log.ok(`Created achievements directory: ${ACH_DIR}`);
    }

    // Files are only rewritten when their content changes (ignoring metadata)
    const write = (filename, data, dir = OUTPUT_DIR) => {
        const filePath = path.join(dir, filename);
        const json = JSON.stringify(data, null, 4);
        const sizeKb = (Buffer.byteLength(json, 'utf8') / 1024).toFixed(1);
        if (sameIgnoringMetadata(filePath, data)) { log.skip(`${filename.padEnd(24)} unchanged`); return; }
        fs.writeFileSync(filePath, json, 'utf8');
        log.ok(`${filename.padEnd(24)} ${sizeKb} KB  →  ${filePath}`);
    };

    // The win-condition achievement that beat a game: the first one unlocked (hardcore date for
    // a hardcore award), with its unlock rate among players of the same mode
    const winConditionOf = (game, hardcore) => {
        const achs = Object.values(game.achievements || {});
        const dateOf = a => (hardcore ? a.dateEarnedHardcore : a.dateEarned) || null;
        const won = achs.filter(a => a.type === 'win_condition' && dateOf(a))
            .sort((a, b) => dateOf(a).localeCompare(dateOf(b)))[0];
        if (!won) return null;
        const players = hardcore ? game.numDistinctPlayersHardcore : game.numDistinctPlayersCasual;
        const awarded = hardcore ? won.numAwardedHardcore : won.numAwarded;
        return {
            name: won.title,
            ...(players > 0 ? { pct: Math.round(Math.min(100, (awarded / players) * 100) * 10) / 10 } : {}),
        };
    };

    // The rarest achievement of a mastered / completed game: lowest unlock rate among players
    // of the award's mode, with its badge for the Completions highlight
    const rarestOf = (game, hardcore) => {
        const players = hardcore ? game.numDistinctPlayersHardcore : game.numDistinctPlayersCasual;
        if (!(players > 0)) return null;
        let best = null;
        for (const a of Object.values(game.achievements || {})) {
            const pct = Math.min(100, ((hardcore ? a.numAwardedHardcore : a.numAwarded) / players) * 100);
            if (!best || pct < best.pct) best = { name: a.title, badge: a.badgeName, pct };
        }
        return best && { ...best, pct: Math.round(best.pct * 10) / 10 };
    };

    // Attach per-game playtime (minutes), screenshot, the win condition (beaten awards) and the
    // rarest achievement (mastery awards) to game awards so the Completions page can show them
    // without loading games.json
    const pageAwards = payload.pageAwards && {
        ...payload.pageAwards,
        visibleUserAwards: (payload.pageAwards.visibleUserAwards || []).map(award => {
            const game = payload.detailedGameProgress[award.awardData];
            if (!game) return award;
            const seconds = game.userTotalPlaytime;
            const winCondition = award.awardType === 'Game Beaten' ? winConditionOf(game, award.awardDataExtra === 1) : null;
            const rarest = award.awardType === 'Mastery/Completion' ? rarestOf(game, award.awardDataExtra === 1) : null;
            return {
                ...award,
                ...(seconds ? { playtime: Math.round(seconds / 60) } : {}),
                ...(game.imageIngame ? { imageIngame: game.imageIngame } : {}),
                ...(winCondition ? { winCondition } : {}),
                ...(rarest ? { rarest } : {}),
            };
        }),
    };

    // Same for every game with progress: the Playing view shows lifetime playtime per game
    const gameAwardsAndProgress = payload.gameAwardsAndProgress && {
        ...payload.gameAwardsAndProgress,
        results: (payload.gameAwardsAndProgress.results || []).map(game => {
            const seconds = payload.detailedGameProgress[game.gameId]?.userTotalPlaytime;
            return seconds ? { ...game, playtime: Math.round(seconds / 60) } : game;
        }),
    };

    // profile.json — everything needed to render above the fold
    write('profile.json', {
        metadata: payload.metadata,
        username: payload.username,
        coreProfile: payload.coreProfile,
        userSummary: payload.userSummary,
        points: payload.points,
        pageAwards,
        recentlyPlayedGames: payload.recentlyPlayedGames,
        gameAwardsAndProgress,
        mostRecentAchievement: payload.mostRecentAchievement,
        mostRecentGame: payload.mostRecentGame,
        points7Days: payload.points7Days,
        points30Days: payload.points30Days,
    });

    // watchlist.json — want-to-play list, split out for independent refresh
    write('watchlist.json', {
        total: payload.wantToPlayList?.total ?? 0,
        results: payload.wantToPlayList?.results ?? [],
    });

    // achievements/N.json — 1 year of unlocks split into 4 quarterly chunks
    // Chunk 1 = most recent (0–91 days), Chunk 4 = oldest (273–364 days)
    // Boundaries are anchored at the next UTC midnight (not the run time), so they
    // move once a day instead of shifting unlocks between files on every run.
    // cumulScore isn't used by the site and changes as entries shift, so it's dropped.
    const CHUNK_MS = 91 * 24 * 60 * 60 * 1000;
    const anchor = new Date(payload.metadata.extractionTimestamp);
    anchor.setUTCHours(24, 0, 0, 0);
    for (let i = 0; i < 4; i++) {
        const toMs   = anchor.getTime() - (i * CHUNK_MS);
        const fromMs = anchor.getTime() - ((i + 1) * CHUNK_MS);
        const chunk  = (payload.recentAchievements || []).filter(a => {
            const t = new Date(a.date.replace(' ', 'T') + 'Z').getTime();
            return t > fromMs && t <= toMs;
        }).map(({ cumulScore, ...a }) => a);
        write(`${i + 1}.json`, { recentAchievements: chunk }, ACH_DIR);
    }

    // Per-game data, split into games/index.json + games/{id}.json below
    // Strip fields unused by the frontend to reduce file size (~1MB saved).
    const UNUSED_GAME_FIELDS = ['richPresencePatch', 'imageBoxArt',
        'forumTopicId', 'flags', 'isFinal', 'releasedAtGranularity',
        'numDistinctPlayers',
        'userCompletion', 'userCompletionHardcore'];
    const UNUSED_ACH_FIELDS  = ['memAddr', 'authorUlid', 'dateCreated', 'dateModified', 'author'];

    const cleanedProgress = {};
    for (const [id, game] of Object.entries(payload.detailedGameProgress)) {
        const cleanGame = { ...game };
        UNUSED_GAME_FIELDS.forEach(f => delete cleanGame[f]);
        if (cleanGame.achievements && typeof cleanGame.achievements === 'object') {
            const cleanAchs = {};
            for (const [achId, ach] of Object.entries(cleanGame.achievements)) {
                const cleanAch = { ...ach };
                UNUSED_ACH_FIELDS.forEach(f => delete cleanAch[f]);
                cleanAchs[achId] = cleanAch;
            }
            cleanGame.achievements = cleanAchs;
        }
        cleanedProgress[id] = cleanGame;
    }

    // games/index.json — every game without its achievement list, plus the few numbers the site
    // used to work out from the lists (points, progression, latest unlock). ~55 KB instead of 5 MB.
    // games/{id}.json — one game with its achievements, loaded when its sheet opens.
    fs.mkdirSync(GAMES_DIR, { recursive: true });
    const index = {};
    for (const [id, game] of Object.entries(cleanedProgress)) {
        const { achievements, ...rest } = game;
        index[id] = { ...rest, summary: summarizeGame(achievements) };
        write(`${id}.json`, game, GAMES_DIR);
    }
    write('index.json', { metadata: payload.metadata, games: index }, GAMES_DIR);
    // Games no longer tracked lose their file; the old single file goes once the split exists
    for (const f of fs.readdirSync(GAMES_DIR)) {
        if (f !== 'index.json' && f.endsWith('.json') && !index[f.slice(0, -5)]) fs.rmSync(path.join(GAMES_DIR, f));
    }
    const legacy = path.join(__dirname, '..', 'data', 'ra', 'games.json');
    if (fs.existsSync(legacy)) { fs.rmSync(legacy); log.ok('games.json (old single file) removed'); }
}

// Per-game files (data/ra/games/): see serializeLocally
const GAMES_DIR = path.join(__dirname, '..', 'data', 'ra', 'games');

// The numbers the site needs from a game's achievement list without loading it
function summarizeGame(achievements) {
    const achs = Object.values(achievements || {});
    const isProg = a => a.type === 'progression' || a.type === 'win_condition';
    let last = null;
    for (const a of achs) if (a.dateEarned && (!last || a.dateEarned > last.dateEarned)) last = a;
    return {
        count: achs.length,
        earned: achs.filter(a => a.dateEarned).length,
        points: achs.reduce((n, a) => n + (a.points ?? 0), 0),
        pointsEarned: achs.reduce((n, a) => n + (a.dateEarned ? a.points ?? 0 : 0), 0),
        prog: achs.filter(isProg).length,
        progEarned: achs.filter(a => isProg(a) && a.dateEarned).length,
        lastUnlock: last && { id: last.id, title: last.title, badgeName: last.badgeName, date: last.dateEarned },
    };
}

// The previous run's games: the per-game files, else the old single games.json
function readCachedGames() {
    const out = {};
    try {
        const ids = Object.keys(JSON.parse(fs.readFileSync(path.join(GAMES_DIR, 'index.json'), 'utf8')).games || {});
        for (const id of ids) {
            try { out[id] = JSON.parse(fs.readFileSync(path.join(GAMES_DIR, `${id}.json`), 'utf8')); } catch { /* refetched */ }
        }
        if (ids.length) return out;
    } catch { /* no split yet */ }
    try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'ra', 'games.json'), 'utf8')).detailedGameProgress || {}; }
    catch { return {}; }
}

// =========================================================
// Phase 4: Firebase Firestore Subcollection Synchronization
// =========================================================

async function synchronizeWithFirestore(enabled, data) {
    log.section('Phase 4 — Firestore Synchronization');

    if (!enabled) {
        log.step('Firestore synchronization disabled. Skipping...');
        console.log(' ✓');
        return;
    }

    const userDocRef = db.collection('retro_profiles').doc(data.username);

    const rootPayload = {
        metadata: data.metadata,
        username: data.username,
        coreProfile: data.coreProfile,
        userSummary: data.userSummary,
        points: data.points,
        pageAwards: data.pageAwards,
        recentAchievements: data.recentAchievements,
        recentlyPlayedGames: data.recentlyPlayedGames,
        wantToPlayList: data.wantToPlayList,
        gameAwardsAndProgress: data.gameAwardsAndProgress,
    };

    process.stdout.write(`  Upserting root document for ${data.username}...`);
    await userDocRef.set(rootPayload, { merge: true });
    console.log(' ✓');

    const gameEntries = Object.entries(data.detailedGameProgress || {});
    if (gameEntries.length > 0) {
        console.log(`\n  Syncing ${gameEntries.length} game records into subcollection...`);
        let batch = db.batch();
        let count = 0;

        for (const [gameId, gameDetails] of gameEntries) {
            batch.set(userDocRef.collection('games').doc(gameId.toString()), gameDetails, { merge: true });
            count++;
            if (count >= 490) {
                await batch.commit();
                log.info(`Intermediate batch committed (${count} ops)`);
                batch = db.batch();
                count = 0;
                await sleep(1000);
            }
        }
        if (count > 0) {
            await batch.commit();
            log.ok(`Final batch committed (${count} ops)`);
        }
    }
}

// =========================================================
// Watchlist-Only Fast Path
// =========================================================

async function executeWatchlistOnly(targetUser) {
    log.section(`Watchlist-Only Extraction  [ ${targetUser} ]`);

    log.step('Fetching want-to-play list...');
    const PAGE_SIZE = 500;
    const firstPage = await withRetry('want-to-play list', () => getUserWantToPlayList(authorization, { username: targetUser, count: PAGE_SIZE, offset: 0 }));
    const allWantToPlay = [...(firstPage.results || [])];
    const totalWantToPlay = firstPage.total ?? allWantToPlay.length;
    let offset = PAGE_SIZE;
    while (allWantToPlay.length < totalWantToPlay) {
        await sleep(1500);
        const page = await withRetry('want-to-play list', () => getUserWantToPlayList(authorization, { username: targetUser, count: PAGE_SIZE, offset }));
        const batch = page.results || [];
        if (batch.length === 0) break;
        allWantToPlay.push(...batch);
        offset += PAGE_SIZE;
    }
    log.done(`${totalWantToPlay} total, ${allWantToPlay.length} fetched`);
    return { total: totalWantToPlay, results: allWantToPlay };
}

// =========================================================
// Activity detection (regular runs)
// =========================================================

const readJsonFile = (filePath) => {
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return null; }
};

const sameIgnoringMetadata = (filePath, data) => {
    const prev = readJsonFile(filePath);
    if (!prev) return false;
    const { metadata: _a, ...a } = prev;
    const { metadata: _b, ...b } = data;
    return JSON.stringify(a) === JSON.stringify(b);
};

// Returns a short reason if anything you did changed since the last written files
// (an unlock, playtime / last played, a want-to-play edit), otherwise null.
function detectActivity(payload) {
    const dir = path.join(__dirname, '..', 'data', 'ra');
    // No index yet (first run after the split) counts as activity, so the new files get written
    const games   = readJsonFile(path.join(dir, 'games', 'index.json'))?.games;
    const profile = readJsonFile(path.join(dir, 'profile.json'));
    if (!games || !profile) return 'no previous data';

    for (const [id, g] of Object.entries(payload.detailedGameProgress || {})) {
        const prev = games[id];
        if (!prev) return `new game ${g.title}`;
        if ((prev.numAwardedToUser ?? 0) !== (g.numAwardedToUser ?? 0) || (prev.numAwardedToUserHardcore ?? 0) !== (g.numAwardedToUserHardcore ?? 0)) return `unlock in ${g.title}`;
        if ((prev.userTotalPlaytime ?? 0) !== (g.userTotalPlaytime ?? 0)) return `playtime in ${g.title}`;
    }

    const gone = Object.entries(games).find(([id]) => !payload.detailedGameProgress?.[id]);
    if (gone) return `removed game ${gone[1].title}`;

    const prevUnlocks = new Set();
    for (let i = 1; i <= 4; i++) {
        for (const a of readJsonFile(path.join(dir, 'achievements', `${i}.json`))?.recentAchievements ?? []) prevUnlocks.add(`${a.achievementId}|${a.date}`);
    }
    const fresh = (payload.recentAchievements || []).find(a => !prevUnlocks.has(`${a.achievementId}|${a.date}`));
    if (fresh) return `unlock ${fresh.title}`;

    const played = (list) => (list || []).map(g => `${g.gameId}|${g.lastPlayed}`).sort().join(',');
    if (played(profile.recentlyPlayedGames) !== played(payload.recentlyPlayedGames)) return 'played a game';

    const wanted = (list) => (list || []).map(g => g.id).sort().join(',');
    const watch = readJsonFile(path.join(dir, 'watchlist.json'));
    if (wanted(watch?.results) !== wanted(payload.wantToPlayList?.results)) return 'want-to-play list changed';

    return null;
}

// =========================================================
// Phase 4a: Playtime Log
// =========================================================

// Turns per-game userTotalPlaytime (seconds) into sessions (scripts/lib/playtime.js).
// Every tracked game goes in the snapshot so the baseline knows all of them;
// last-played is only known for recently played games (the only ones re-fetched).
function logPlaytime(payload) {
    log.section('Phase 4a — Playtime Log');
    const games = Object.values(payload.detailedGameProgress || {});
    if (games.length === 0) {
        log.skip('No game progress, playtime log skipped');
        return;
    }
    const lastPlayed = Object.fromEntries((payload.recentlyPlayedGames || []).map(g => [g.gameId, g.lastPlayed]));
    const snapshot = games.map(g => ({
        id:         g.id,
        total:      g.userTotalPlaytime ?? 0,
        lastPlayed: lastPlayed[g.id],
        name:       g.title,
        icon:       g.imageIcon ?? null,
        console:    g.consoleName ?? null,
    }));
    updatePlaytimeLog(path.join(__dirname, '..', 'data', 'ra', 'playtime'), snapshot, {
        unitsPerMinute: 60,
        asOf:           Date.now(),
        dryRun:         DEBUG,
        log:            log.ok,
    });
}

// =========================================================
// Phase 4b: Unlock History
// =========================================================

// All-time unlocks per calendar year for the Analytics page (scripts/lib/history.js)
// Rarity = share of the game's players who have the achievement (softcore + hardcore)
function logHistory(payload) {
    log.section('Phase 4b — Unlock History');
    const unlocks = [];
    for (const game of Object.values(payload.detailedGameProgress || {})) {
        const players = game.numDistinctPlayersCasual || game.numDistinctPlayers || 0;
        for (const ach of Object.values(game.achievements || {})) {
            const earned = ach.dateEarnedHardcore || ach.dateEarned;
            if (!earned) continue;
            unlocks.push({
                t:  iso(toMs(earned)),
                g:  game.id,
                a:  ach.id,
                n:  ach.title,
                p:  ach.points,
                r:  players ? (ach.numAwarded / players) * 100 : undefined,
                hc: !!ach.dateEarnedHardcore,
            });
        }
    }
    const { written, years } = writeUnlockHistory(path.join(__dirname, '..', 'data', 'ra', 'history'), unlocks, { asOf: new Date().toISOString(), dryRun: DEBUG, keepRarity: !REFRESH_GAMES });
    log.ok(`${unlocks.length} unlocks in ${years.length} year file(s), ${written} written${DEBUG ? '  (dry run)' : ''}`);
}

// =========================================================
// Phase 5: ETL Orchestration
// =========================================================

async function runPipeline() {
    try {
        if (WATCHLIST_ONLY) {
            const wl = await executeWatchlistOnly(RA_USERNAME);
            if (!DEBUG) {
                const outPath = path.join(__dirname, '..', 'data', 'ra', 'watchlist.json');
                const json = JSON.stringify(wl, null, 4);
                const sizeKb = (Buffer.byteLength(json, 'utf8') / 1024).toFixed(1);
                fs.writeFileSync(outPath, json, 'utf8');
                log.ok(`watchlist.json           ${sizeKb} KB  →  ${outPath}`);
            } else {
                log.debug('watchlist', wl);
            }
            log.section('Pipeline Complete');
            log.ok(`Watchlist entries     : ${wl.total}`);
            console.log();
            process.exit(0);
        }

        const payload = await executeProfileExtraction(RA_USERNAME);

        // Regular runs only write when you did something; everything else
        // (rank, rarity, rolling 7/30-day points) refreshes in the daily full refresh
        if (!REFRESH_GAMES) {
            const activity = detectActivity(payload);
            if (!activity) {
                log.section('No activity since the last run');
                log.skip('No new unlocks, playtime or watchlist changes, nothing written');
                console.log();
                process.exit(0);
            }
            log.ok(`Activity: ${activity}`);
        }

        if (DEBUG) log.skip('Debug mode: game files not written');
        else serializeLocally(payload);
        logPlaytime(payload);
        logHistory(payload);
        await synchronizeWithFirestore(false, payload);

        const totalGames = Object.keys(payload.detailedGameProgress).length;

        log.section('Pipeline Complete');
        log.ok(`Extraction timestamp  : ${payload.metadata.extractionTimestamp}`);
        log.ok(`Achievements fetched  : ${payload.recentAchievements?.length ?? 0}`);
        log.ok(`Games tracked         : ${totalGames}${REFRESH_GAMES ? ' (full refresh)' : ' (incremental)'}`);
        log.ok(`Watchlist entries     : ${payload.wantToPlayList?.total ?? 0}`);
        log.ok(`Points (7d / 30d)     : ${payload.points7Days} / ${payload.points30Days}`);
        console.log();
        process.exit(0);
    } catch (error) {
        log.fail(`Pipeline aborted: ${error.message}`);
        process.exit(1);
    }
}

runPipeline();
