require('dotenv').config({ quiet: true });
const fs   = require('fs');
const path = require('path');

// =========================================================
// Logging Helpers
// =========================================================

const log = {
    section: (title) => console.log(`\n${'─'.repeat(60)}\n  ${title}\n${'─'.repeat(60)}`),
    step:    (msg)   => process.stdout.write(`  ${msg}`),
    ok:      (msg)   => console.log(`  ✓  ${msg}`),
    skip:    (msg)   => console.log(`  →  ${msg}`),
    fail:    (msg)   => console.error(`  ✗  ${msg}`),
    info:    (msg)   => console.log(`     ${msg}`),
    done:    (msg)   => console.log(` ✓  (${msg})`),
};

// =========================================================
// Phase 1: Configuration
// =========================================================

log.section('Xbox ETL Pipeline');
log.step(`Process started at:  ${new Date().toISOString()}`);
console.log(' ✓');

log.section('Phase 1 — Configuration');

const XBOX_API_KEY = process.env.XBOX_API_KEY;
if (!XBOX_API_KEY) {
    log.fail('Xbox credentials missing. Set XBOX_API_KEY in .env');
    process.exit(1);
}

// ── CLI Flags ──────────────────────────────────────────────
// --refresh-games : re-fetch every title with achievements (daily; refreshes rarity)
// (default)       : incremental — only titles whose summary changed since the last run
// --debug         : dry run; fetches and reports but writes no files
const REFRESH_GAMES = process.argv.includes('--refresh-games');
const DEBUG         = process.argv.includes('--debug');

log.ok('OpenXBL API key loaded');
log.ok(`Game details mode    : ${REFRESH_GAMES ? 'Full refresh         (--refresh-games)' : 'Incremental          (changed titles only)'}`);
log.ok(`Debug mode           : ${DEBUG ? 'enabled  (--debug, no files written)' : 'disabled'}`);

// =========================================================
// HTTP Helper
// =========================================================

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// OpenXBL returns errors as HTTP 200 with the real status in the body's `code`
// and messages in `content` (a JSON string). Both are checked. Throttling,
// server errors and dropped connections are retried; anything that still fails
// surfaces as an error so callers keep cached data instead of writing empties.
class TransientError extends Error {}

const API             = 'https://xbl.io/api/v2';
const RETRY_DELAYS_MS = [2000, 5000, 15000];
const REQUEST_CAP     = 130;   // free tier allows 150/hour; leave headroom for manual tests
let requestsMade      = 0;
let rateRemaining     = null;

const xblGetOnce = async (endpoint) => {
    let res;
    try {
        res = await fetch(API + endpoint, {
            headers: {
                'X-Authorization': XBOX_API_KEY,
                'Accept':          'application/json',
                'Accept-Language': 'en-US',   // required; without it requests fail with code 400
            },
        });
    } catch (e) {
        throw new TransientError(e.message);
    }
    requestsMade++;
    const remaining = res.headers.get('x-ratelimit-remaining');
    if (remaining != null) rateRemaining = Number(remaining);

    if (res.status === 429 || res.status >= 500) throw new TransientError(`HTTP ${res.status}`);

    const text = await res.text();
    let body;
    try {
        body = JSON.parse(text);
    } catch {
        throw new TransientError(`HTTP ${res.status}, non-JSON body`);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);

    // Unwrap { content, code } envelopes; `content` may itself be a JSON string
    if (body && typeof body === 'object' && 'code' in body && 'content' in body) {
        const code = Number(body.code);
        let content = body.content;
        if (typeof content === 'string') {
            try { content = JSON.parse(content); } catch { /* leave as string */ }
        }
        if (code === 429 || code >= 500) throw new TransientError(`code ${code}`);
        if (code >= 400) throw new Error(`code ${code}: ${JSON.stringify(content).slice(0, 200)}`);
        body = content;
    }
    return body;
};

const xblGet = async (endpoint) => {
    for (let attempt = 0; ; attempt++) {
        try {
            return await xblGetOnce(endpoint);
        } catch (e) {
            if (!(e instanceof TransientError) || attempt >= RETRY_DELAYS_MS.length) throw e;
            await sleep(RETRY_DELAYS_MS[attempt]);
        }
    }
};

// Xbox 360 achievement images: /global/t.{titleId hex}/ach/0/{imageId hex}
const x360IconUrl = (titleId, imageId) => imageId == null ? null
    : `https://image-ssl.xboxlive.com/global/t.${Number(titleId).toString(16)}/ach/0/${Number(imageId).toString(16)}`;

const round1 = (n) => (n == null ? null : Math.round(n * 10) / 10);
// Title images come back as http://; the site is served over https
const httpsUrl = (u) => (u ? u.replace(/^http:\/\//, 'https://') : null);

// A title's summary fields that change when you play or unlock something (or
// the set grows). Compared with the cached index to decide what to re-fetch.
const syncKeyOf = (t) => [
    t.achievement?.currentAchievements, t.achievement?.currentGamerscore,
    t.achievement?.totalGamerscore, t.titleHistory?.lastTimePlayed,
].join('|');

// sourceVersion 1 = Xbox 360 achievements (different endpoint and shape);
// 0 = no achievements; 2 = modern
const isX360Title   = (t) => t.achievement?.sourceVersion === 1 || (t.devices || []).includes('Xbox360');
const hasAchievements = (t) => (t.achievement?.totalGamerscore ?? 0) > 0 || (t.achievement?.totalAchievements ?? 0) > 0;

// =========================================================
// Phase 2: Profile & Title List
// =========================================================

async function executeProfileExtraction() {
    log.section('Phase 2 — Profile Extraction');

    log.step('Fetching account...');
    const account = await xblGet('/account');
    const user = account?.profileUsers?.[0];
    if (!user?.id) throw new Error('Account response has no profile — check XBOX_API_KEY');
    const settings = Object.fromEntries((user.settings || []).map(s => [s.id, s.value]));
    const xuid = user.id;
    log.done(`${settings.Gamertag}  /  ${settings.Gamerscore} G`);

    if (process.env.XBOX_XUID && process.env.XBOX_XUID !== xuid) {
        log.info(`XBOX_XUID (${process.env.XBOX_XUID.length} digits) differs from the account's XUID — using the account's`);
    }

    log.step('Fetching title history...');
    const history = await xblGet('/achievements');
    const titles = history?.titles;
    if (!Array.isArray(titles)) throw new Error('Title history response has no titles array');
    log.done(`${titles.length} titles`);

    return {
        profile: {
            xuid,
            gamertag:    settings.Gamertag ?? null,
            avatar:      httpsUrl(settings.GameDisplayPicRaw),
            gamerscore:  Number(settings.Gamerscore ?? 0),
            accountTier: settings.AccountTier ?? null,
        },
        titles,
    };
}

// =========================================================
// Phase 2a: Achievement Details per Title
// =========================================================

const normalizeModern = (a) => {
    const unlocked = a.progressState === 'Achieved';
    const icon = (a.mediaAssets || []).find(m => m.type === 'Icon') ?? (a.mediaAssets || [])[0];
    const gs = (a.rewards || []).find(r => r.type === 'Gamerscore');
    return {
        apiName:        String(a.id),
        displayName:    a.name ?? '',
        description:    (unlocked ? a.description : a.lockedDescription) || a.description || '',
        unlocked,
        unlockedAt:     unlocked ? (a.progression?.timeUnlocked ?? null) : null,
        iconUrl:        httpsUrl(icon?.url),
        hidden:         !!a.isSecret,
        gamerscore:     gs ? Number(gs.value) : 0,
        globalPct:      round1(a.rarity?.currentPercentage),
        rarityCategory: a.rarity?.currentCategory ?? null,
    };
};

const normalizeX360 = (a, titleId) => ({
    apiName:        String(a.id),
    displayName:    a.name ?? '',
    description:    (a.unlocked ? a.description : a.lockedDescription) || a.description || '',
    unlocked:       !!a.unlocked,
    unlockedAt:     a.unlocked ? (a.timeUnlocked ?? null) : null,
    iconUrl:        x360IconUrl(titleId, a.imageId),
    hidden:         !!a.isSecret,
    gamerscore:     Number(a.gamerscore ?? 0),
    globalPct:      round1(a.rarity?.currentPercentage),
    rarityCategory: a.rarity?.currentCategory ?? null,
});

async function fetchTitleAchievements(xuid, title) {
    const id = title.titleId;
    if (!isX360Title(title)) {
        const res = await xblGet(`/achievements/player/${xuid}/${id}`);
        const list = res?.achievements ?? [];
        if (list.length > 0) return { achievements: list.map(normalizeModern), partial: false };
        // Modern endpoint returns nothing for 360-era sets; fall through to the 360 endpoint
    }
    const res = await xblGet(`/achievements/x360/${xuid}/title/${id}`);
    // The 360 endpoint only lists unlocked achievements
    return { achievements: (res?.achievements ?? []).map(a => normalizeX360(a, id)), partial: true };
}

function loadCache(gamesDir) {
    const cache = {};
    if (!fs.existsSync(gamesDir)) return cache;
    for (const file of fs.readdirSync(gamesDir)) {
        if (file === 'index.json' || !file.endsWith('.json')) continue;
        try {
            cache[path.basename(file, '.json')] = JSON.parse(fs.readFileSync(path.join(gamesDir, file), 'utf8'));
        } catch (e) {
            log.fail(`Could not read games/${file}: ${e.message}`);
        }
    }
    return cache;
}

async function executeGameExtraction(xuid, titles) {
    const gamesDir = path.join(__dirname, '..', 'data', 'xbox', 'games');
    const cache = loadCache(gamesDir);

    const withAch = titles.filter(hasAchievements);
    const toFetch = withAch.filter(t => {
        if (REFRESH_GAMES) return true;
        const cached = cache[t.titleId];
        return !cached || cached.syncKey !== syncKeyOf(t);
    });

    log.section(`Phase 2a — Achievement Details  [ ${toFetch.length} of ${withAch.length} titles ]`);
    if (Object.keys(cache).length) log.ok(`Loaded ${Object.keys(cache).length} cached title(s) from games/ dir`);
    log.ok(`${titles.length - withAch.length} title(s) without achievements skipped (known from the title list)`);

    const games = { ...cache };
    let failed = 0, capped = 0, idx = 0;
    for (const title of toFetch) {
        idx++;
        const id = title.titleId;
        if (requestsMade >= REQUEST_CAP || (rateRemaining != null && rateRemaining < 5)) {
            capped++;
            continue;   // cache stays stale, so the next run picks it up
        }
        process.stdout.write(`  [${idx}/${toFetch.length}] [${id}] ${title.name}...`);
        try {
            const { achievements, partial } = await fetchTitleAchievements(xuid, title);
            const summary = title.achievement || {};
            const unlocked = achievements.filter(a => a.unlocked).length;
            // 360 lists only unlocked achievements, so its total comes from the summary.
            // Modern totals come from the list: the summary's totalAchievements is often 0.
            const total = partial ? (summary.totalAchievements || unlocked) : achievements.length;
            games[id] = {
                titleId:         Number(id),
                gameName:        title.name,
                hasAchievements: true,
                partial,
                total,
                unlocked,
                gamerscore:      summary.currentGamerscore ?? 0,
                totalGamerscore: summary.totalGamerscore ?? 0,
                syncKey:         syncKeyOf(title),
                achievements,
            };
            console.log(` ✓  (${unlocked}/${total}${partial ? ', 360: unlocked only' : ''})`);
        } catch (e) {
            failed++;
            console.log(` ✗  (${e.message}${cache[id] ? ' — kept cached data' : ''})`);
        }
        await sleep(1000);
    }

    if (capped) log.info(`${capped} title(s) deferred to the next run (request cap / rate limit)`);
    if (failed) log.fail(`${failed} title(s) failed after retries — cached data kept`);
    const attempted = toFetch.length - capped;
    if (attempted > 0 && failed === attempted) {
        throw new Error(`All ${attempted} title fetches failed — not writing anything`);
    }

    // Titles that disappeared from the history (hidden or removed) drop out
    const current = new Set(withAch.map(t => String(t.titleId)));
    for (const id of Object.keys(games)) if (!current.has(id)) delete games[id];

    return games;
}

// =========================================================
// Phase 3: Local JSON Serialization
// =========================================================

// Skip rewriting a file when only `metadata` (the run timestamp) would change,
// so runs with no new activity don't produce a commit.
const sameIgnoringMetadata = (filePath, data) => {
    if (!fs.existsSync(filePath)) return false;
    try {
        const { metadata: _a, ...prev } = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const { metadata: _b, ...next } = data;
        return JSON.stringify(prev) === JSON.stringify(next);
    } catch {
        return false;
    }
};

function serializeLocally(extractionTimestamp, profile, titles, games) {
    log.section(`Phase 3 — Local Serialization${DEBUG ? '  (debug: dry run)' : ''}`);

    const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'xbox');
    const ACH_DIR    = path.join(OUTPUT_DIR, 'achievements');
    const GAMES_DIR  = path.join(OUTPUT_DIR, 'games');
    if (!DEBUG) for (const dir of [OUTPUT_DIR, ACH_DIR, GAMES_DIR]) fs.mkdirSync(dir, { recursive: true });

    let written = 0, unchanged = 0;
    const write = (filename, data, dir = OUTPUT_DIR) => {
        const filePath = path.join(dir, filename);
        const json     = JSON.stringify(data, null, 4);
        const sizeKb   = (Buffer.byteLength(json, 'utf8') / 1024).toFixed(1);
        if (DEBUG) { log.info(`${filename.padEnd(24)} ${sizeKb} KB  (not written)`); return; }
        if (sameIgnoringMetadata(filePath, data)) { unchanged++; return; }
        fs.writeFileSync(filePath, json, 'utf8');
        written++;
        log.ok(`${filename.padEnd(24)} ${sizeKb} KB  →  ${filePath}`);
    };

    const titleMap = Object.fromEntries(titles.map(t => [String(t.titleId), t]));
    const iconOf   = (id) => httpsUrl(titleMap[id]?.displayImage);
    const lastPlayedOf = (id) => titleMap[id]?.titleHistory?.lastTimePlayed ?? null;

    // Recent unlocks across all titles — 1 year window, newest first
    const oneYearAgo = new Date(extractionTimestamp);
    oneYearAgo.setUTCFullYear(oneYearAgo.getUTCFullYear() - 1);
    const recentAchievements = [];
    for (const [id, g] of Object.entries(games)) {
        for (const a of g.achievements || []) {
            if (!a.unlocked || !a.unlockedAt || new Date(a.unlockedAt) < oneYearAgo) continue;
            recentAchievements.push({
                titleId:     Number(id),
                gameName:    g.gameName,
                apiName:     a.apiName,
                displayName: a.displayName,
                description: a.description,
                iconUrl:     a.iconUrl,
                unlockedAt:  a.unlockedAt,
                gamerscore:  a.gamerscore,
                globalPct:   a.globalPct,
            });
        }
    }
    recentAchievements.sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt));

    // Per-title derived fields shared by index.json and games/{id}.json
    const derive = (id, g) => {
        const unlockedAchs = (g.achievements || []).filter(a => a.unlocked && a.unlockedAt)
            .sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt));
        const lockedAchs = (g.achievements || []).filter(a => !a.unlocked);
        return {
            iconUrl:        iconOf(id),
            devices:        titleMap[id]?.devices ?? [],
            lastPlayedTs:   lastPlayedOf(id),
            lastUnlockedAt: unlockedAchs[0]?.unlockedAt ?? null,
            lastUnlockName: unlockedAchs[0]?.displayName ?? null,
            preview: [...unlockedAchs, ...lockedAchs].slice(0, 6).map(a => ({
                apiName: a.apiName, displayName: a.displayName, unlocked: a.unlocked,
                unlockedAt: a.unlockedAt, iconUrl: a.iconUrl, globalPct: a.globalPct,
            })),
        };
    };

    const isPerfect = (g) => g.totalGamerscore > 0 && g.gamerscore >= g.totalGamerscore;
    const perfectGames = Object.entries(games)
        .filter(([, g]) => isPerfect(g))
        .map(([id, g]) => {
            const last = (g.achievements || []).filter(a => a.unlocked && a.unlockedAt)
                .reduce((max, a) => (!max || a.unlockedAt > max.unlockedAt ? a : max), null);
            return {
                titleId:          Number(id),
                gameName:         g.gameName,
                total:            g.total,
                totalGamerscore:  g.totalGamerscore,
                completedAt:      last?.unlockedAt ?? null,
                lastAchName:      last?.displayName ?? null,
                lastAchIconUrl:   last?.iconUrl ?? null,
                lastAchGlobalPct: last?.globalPct ?? null,
                iconUrl:          iconOf(id),
            };
        })
        .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));

    const started  = Object.values(games).filter(g => g.unlocked > 0);
    const totalAch = started.reduce((s, g) => s + g.total, 0);
    const unlockedAch = started.reduce((s, g) => s + g.unlocked, 0);

    const recentlyPlayed = [...titles]
        .filter(t => t.titleHistory?.lastTimePlayed)
        .sort((a, b) => b.titleHistory.lastTimePlayed.localeCompare(a.titleHistory.lastTimePlayed))
        .slice(0, 15)
        .map(t => {
            const g = games[String(t.titleId)];
            return {
                titleId:         Number(t.titleId),
                name:            t.name,
                iconUrl:         httpsUrl(t.displayImage),
                devices:         t.devices ?? [],
                lastPlayedTs:    t.titleHistory.lastTimePlayed,
                achUnlocked:     g?.unlocked ?? null,
                achTotal:        g?.total ?? null,
                gamerscore:      t.achievement?.currentGamerscore ?? 0,
                totalGamerscore: t.achievement?.totalGamerscore ?? 0,
            };
        });

    // profile.json — everything needed for the hub card + profile overview
    write('profile.json', {
        metadata: { extractionTimestamp },
        profile,
        stats: {
            totalGames:            titles.length,
            gamesWithAchievements: Object.keys(games).length,
            gamesStarted:          started.length,
            totalAchievements:     totalAch,
            unlockedAchievements:  unlockedAch,
            completionPct:         totalAch > 0 ? Math.floor((unlockedAch / totalAch) * 100) : 0,
            gamerscore:            profile.gamerscore,
            perfectCount:          perfectGames.length,
        },
        recentlyPlayed,
        mostRecentGame:   recentlyPlayed[0] ?? null,
        mostRecentUnlock: recentAchievements[0] ?? null,
        perfectGames,
    });

    // achievements/heatmap.json — day → { count, gamerscore }
    const heatmap = {};
    for (const a of recentAchievements) {
        const day = a.unlockedAt.substring(0, 10);
        heatmap[day] ??= { count: 0, gamerscore: 0 };
        heatmap[day].count++;
        heatmap[day].gamerscore += a.gamerscore || 0;
    }
    write('heatmap.json', { activityHeatmap: heatmap }, ACH_DIR);

    // achievements/N.json — 1 year in 4 × 91-day chunks. Boundaries are anchored
    // at the next UTC midnight (not the run time) so entries only move between
    // chunks once a day, not on every run.
    const CHUNK_MS = 91 * 24 * 60 * 60 * 1000;
    const anchor = new Date(extractionTimestamp);
    anchor.setUTCHours(24, 0, 0, 0);
    for (let i = 0; i < 4; i++) {
        const toMs   = anchor.getTime() - i * CHUNK_MS;
        const fromMs = toMs - CHUNK_MS;
        const chunk  = recentAchievements.filter(a => {
            const t = new Date(a.unlockedAt).getTime();
            return t >= fromMs && t < toMs;
        });
        write(`${i + 1}.json`, { recentAchievements: chunk }, ACH_DIR);
    }

    // games/index.json — every title with achievements, without achievements[]
    const index = {};
    for (const [id, g] of Object.entries(games)) {
        const { achievements, syncKey, ...rest } = g;
        index[id] = { ...rest, ...derive(id, g), syncKey };
    }
    write('index.json', { achievementProgress: index }, GAMES_DIR);

    // games/{titleId}.json — full data per title including achievements[]
    for (const [id, g] of Object.entries(games)) {
        write(`${id}.json`, { ...g, ...derive(id, g) }, GAMES_DIR);
    }

    // Remove files for titles no longer in the history
    if (!DEBUG && fs.existsSync(GAMES_DIR)) {
        for (const file of fs.readdirSync(GAMES_DIR)) {
            if (file === 'index.json' || !file.endsWith('.json')) continue;
            if (!games[path.basename(file, '.json')]) fs.unlinkSync(path.join(GAMES_DIR, file));
        }
    }

    if (!DEBUG) log.ok(`${written} file(s) written, ${unchanged} unchanged`);
    return { recentAchievements, perfectGames, started };
}

// =========================================================
// Phase 4: ETL Orchestration
// =========================================================

async function runPipeline() {
    try {
        const extractionTimestamp = new Date().toISOString();
        const { profile, titles } = await executeProfileExtraction();
        const games = await executeGameExtraction(profile.xuid, titles);
        const { recentAchievements, perfectGames, started } = serializeLocally(extractionTimestamp, profile, titles, games);

        log.section('Pipeline Complete');
        log.ok(`Extraction timestamp  : ${extractionTimestamp}`);
        log.ok(`Gamertag              : ${profile.gamertag}  (${profile.gamerscore} G)`);
        log.ok(`Titles                : ${titles.length}  (${Object.keys(games).length} with achievements, ${started.length} started)`);
        log.ok(`Perfect               : ${perfectGames.length}`);
        log.ok(`Unlocks in last year  : ${recentAchievements.length}`);
        log.ok(`API requests          : ${requestsMade}${rateRemaining != null ? `  (${rateRemaining} left this hour)` : ''}`);
        console.log();
        process.exit(0);
    } catch (error) {
        log.fail(`Pipeline aborted: ${error.message}`);
        process.exit(1);
    }
}

runPipeline();
