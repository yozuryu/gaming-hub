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

// =========================================================
// Logging Helpers
// =========================================================

const log = {
    section: (title) => console.log(`\n${'─'.repeat(60)}\n  ${title}\n${'─'.repeat(60)}`),
    step: (msg) => process.stdout.write(`  ${msg}`),
    ok: (msg) => console.log(`  ✓  ${msg}`),
    skip: (msg) => console.log(`  →  ${msg}`),
    fail: (msg) => console.error(`  ✗  ${msg}`),
    info: (msg) => console.log(`     ${msg}`),
    done: (msg) => console.log(` ✓  (${msg})`),
    err: (msg) => console.log(` ✗  (${msg})`),
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
const fmtDate = (d) => d.toISOString().substring(0, 10);

// ── CLI Flags ──────────────────────────────────────────────
// --refresh-games  : re-fetch all game details (full refresh)
// (default)        : load existing games.json, only fetch new games
const REFRESH_GAMES = process.argv.includes('--refresh-games');

log.ok(`RetroAchievements authenticated as: ${RA_USERNAME}`);
log.ok('Firebase Admin SDK initialized');
log.ok(`Game details mode        : ${REFRESH_GAMES ? 'Full refresh  (--refresh-games)' : 'Incremental   (new games only)'}`);

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
        profilePayload.coreProfile = await getUserProfile(authorization, { username: targetUser });
        log.done(`${profilePayload.coreProfile.user}`);
        await sleep(1500);

        log.step('Fetching user summary...');
        profilePayload.userSummary = await getUserSummary(authorization, { username: targetUser });
        log.done(`rank #${profilePayload.userSummary.rank}`);
        await sleep(1500);

        log.step('Fetching points...');
        profilePayload.points = await getUserPoints(authorization, { username: targetUser });
        log.done(`${profilePayload.points.points} pts`);
        await sleep(1500);

        log.step('Fetching awards...');
        profilePayload.pageAwards = await getUserAwards(authorization, { username: targetUser });
        log.done(`${profilePayload.pageAwards.visibleUserAwards?.length ?? 0} awards`);

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
            try {
                const chunk = await getAchievementsEarnedBetween(authorization, {
                    username: targetUser,
                    fromDate,
                    toDate,
                });
                const count = Array.isArray(chunk) ? chunk.length : 0;
                if (count > 0) allAchievements.push(...chunk);
                console.log(` ✓  (${count} achievements)`);
            } catch (e) {
                console.log(` ✗  (${e.message})`);
            }
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
        profilePayload.recentlyPlayedGames = await getUserRecentlyPlayedGames(authorization, { username: targetUser, count: 15 });
        log.done(`${profilePayload.recentlyPlayedGames.length} games`);
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
        profilePayload.wantToPlayList = await getUserWantToPlayList(authorization, { username: targetUser, count: 500 });
        log.done(`${profilePayload.wantToPlayList.total} total, ${profilePayload.wantToPlayList.results?.length} fetched`);
        await sleep(1500);

        log.step('Fetching completion progress...');
        profilePayload.gameAwardsAndProgress = await getUserCompletionProgress(authorization, { username: targetUser });
        log.done(`${profilePayload.gameAwardsAndProgress.results?.length} games`);
        await sleep(1500);

        // ── Detailed game progress ────────────────────────────────────────
        const progressGames = profilePayload.gameAwardsAndProgress?.results || [];

        // Incremental mode: seed cache from existing games.json so only new
        // games are fetched. Full refresh skips this and fetches everything.
        if (!REFRESH_GAMES) {
            const gamesJsonPath = path.join(__dirname, '..', 'data', 'retroachievements', 'games.json');
            if (fs.existsSync(gamesJsonPath)) {
                try {
                    const existing = JSON.parse(fs.readFileSync(gamesJsonPath, 'utf8'));
                    const cached = existing.detailedGameProgress || {};
                    const cachedCount = Object.keys(cached).length;
                    Object.assign(profilePayload.detailedGameProgress, cached);
                    log.ok(`Loaded ${cachedCount} cached game(s) from games.json`);
                } catch (e) {
                    log.fail(`Could not read games.json — will fetch all: ${e.message}`);
                }
            } else {
                log.skip('No existing games.json found — will fetch all games');
            }
        } else {
            log.ok('Full refresh — skipping cache, all games will be fetched');
        }

        log.section(`Phase 2a — Completion Progress Details  [ ${progressGames.length} games ]`);

        let progressIdx = 0;
        for (const game of progressGames) {
            progressIdx++;
            if (profilePayload.detailedGameProgress[game.gameId]) {
                log.skip(`[${progressIdx}/${progressGames.length}] [${game.gameId}] ${game.title} — already cached`);
                continue;
            }
            process.stdout.write(`  [${progressIdx}/${progressGames.length}] [${game.gameId}] ${game.title}...`);
            try {
                profilePayload.detailedGameProgress[game.gameId] = await getGameInfoAndUserProgress(authorization, {
                    username: targetUser,
                    gameId: game.gameId,
                });
                console.log(' ✓');
            } catch (e) {
                console.log(` ✗  (${e.message})`);
            }
            await sleep(2000);
        }

        // ── Recently played games (skip if already cached) ─────────────────
        const recentGames = profilePayload.recentlyPlayedGames || [];
        log.section(`Phase 2b — Recent Game Details  [ ${recentGames.length} games ]`);

        let recentIdx = 0;
        for (const game of recentGames) {
            recentIdx++;
            if (profilePayload.detailedGameProgress[game.gameId]) {
                log.skip(`[${recentIdx}/${recentGames.length}] [${game.gameId}] ${game.title} — already cached from progress`);
                continue;
            }
            process.stdout.write(`  [${recentIdx}/${recentGames.length}] [${game.gameId}] ${game.title}...`);
            try {
                profilePayload.detailedGameProgress[game.gameId] = await getGameInfoAndUserProgress(authorization, {
                    username: targetUser,
                    gameId: game.gameId,
                });
                console.log(' ✓');
            } catch (e) {
                console.log(` ✗  (${e.message})`);
            }
            await sleep(2000);
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

    const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'retroachievements');
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        log.ok(`Created output directory: ${OUTPUT_DIR}`);
    }

    const write = (filename, data) => {
        const filePath = path.join(OUTPUT_DIR, filename);
        const json = JSON.stringify(data, null, 4);
        const sizeKb = (Buffer.byteLength(json, 'utf8') / 1024).toFixed(1);
        fs.writeFileSync(filePath, json, 'utf8');
        log.ok(`${filename.padEnd(24)} ${sizeKb} KB  →  ${filePath}`);
    };

    // profile.json — everything needed to render above the fold
    write('profile.json', {
        metadata: payload.metadata,
        username: payload.username,
        coreProfile: payload.coreProfile,
        userSummary: payload.userSummary,
        points: payload.points,
        pageAwards: payload.pageAwards,
        recentlyPlayedGames: payload.recentlyPlayedGames,
        gameAwardsAndProgress: payload.gameAwardsAndProgress,
        wantToPlayList: payload.wantToPlayList,
        mostRecentAchievement: payload.mostRecentAchievement,
        mostRecentGame: payload.mostRecentGame,
        points7Days: payload.points7Days,
        points30Days: payload.points30Days,
        // Compact day→points map for the Activity heatmap (full 365 days, always available)
        activityHeatmap: (() => {
            const map = {};
            (payload.recentAchievements || []).forEach(a => {
                if (!a.date) return;
                const day = a.date.substring(0, 10);
                if (!map[day]) map[day] = { points: 0, count: 0 };
                map[day].points += a.points || 0;
                map[day].count++;
            });
            return map;
        })(),
    });

    // achievements_N.json — 1 year of unlocks split into 4 quarterly chunks
    // Chunk 1 = most recent (0–91 days), Chunk 4 = oldest (273–364 days)
    const CHUNK_MS = 91 * 24 * 60 * 60 * 1000;
    const extractionTime = new Date(payload.metadata.extractionTimestamp).getTime();
    for (let i = 0; i < 4; i++) {
        const toMs   = extractionTime - (i * CHUNK_MS);
        const fromMs = extractionTime - ((i + 1) * CHUNK_MS);
        const chunk  = (payload.recentAchievements || []).filter(a => {
            const t = new Date(a.date).getTime();
            return t > fromMs && t <= toMs;
        });
        write(`achievements_${i + 1}.json`, { recentAchievements: chunk });
    }

    // games.json — detailed per-game data, loaded for Recent/Progress tabs
    write('games.json', {
        detailedGameProgress: payload.detailedGameProgress,
    });
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
// Phase 5: ETL Orchestration
// =========================================================

async function runPipeline() {
    try {
        const payload = await executeProfileExtraction(RA_USERNAME);
        serializeLocally(payload);
        await synchronizeWithFirestore(false, payload);

        const totalGames   = Object.keys(payload.detailedGameProgress).length;
        const cachedGames  = REFRESH_GAMES ? 0 : totalGames; // approximate — exact count logged during fetch

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
