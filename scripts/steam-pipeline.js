require('dotenv').config();
const fs    = require('fs');
const path  = require('path');
const https = require('https');

// Extract just the filename from a Steam CDN achievement icon URL.
// Full URL: https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/{appId}/{hash}.jpg
// Stored as: {hash}.jpg  — saves ~72 chars per URL, ~1.4MB across all achievements in games.json.
const achIconHash = url => (url ? url.split('/').pop() : null);

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
    err:     (msg)   => console.log(` ✗  (${msg})`),
};

// =========================================================
// Phase 1: Authentication
// =========================================================

log.section('Steam ETL Pipeline');
log.step(`Process started at:  ${new Date().toISOString()}`);
console.log(' ✓');

log.section('Phase 1 — Authentication');

const STEAM_API_KEY = process.env.STEAM_API_KEY;
const STEAM_ID      = process.env.STEAM_USER_ID;

if (!STEAM_API_KEY || !STEAM_ID) {
    log.fail('Steam credentials missing. Set STEAM_API_KEY and STEAM_USER_ID in .env');
    process.exit(1);
}

// ── CLI Flags ──────────────────────────────────────────────
// --refresh-games          : re-fetch all owned/played games (full refresh)
// --refresh-unlocked-games : re-fetch only cached games with unlocked > 0
// (default)                : incremental — recently played only
// --debug                  : print raw API responses to stdout
const REFRESH_GAMES          = process.argv.includes('--refresh-games');
const REFRESH_UNLOCKED_GAMES = process.argv.includes('--refresh-unlocked-games');
const DEBUG                  = process.argv.includes('--debug');

const modeLabel = REFRESH_GAMES
    ? 'Full refresh         (--refresh-games)'
    : REFRESH_UNLOCKED_GAMES
    ? 'Unlocked refresh     (--refresh-unlocked-games)'
    : 'Incremental          (recently played only)';

log.ok(`Steam API key loaded`);
log.ok(`Steam ID             : ${STEAM_ID}`);
log.ok(`Game details mode    : ${modeLabel}`);
log.ok(`Debug mode           : ${DEBUG ? 'enabled  (--debug)' : 'disabled'}`);

// =========================================================
// HTTP Helper
// =========================================================

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Transient failures (throttling, 5xx, dropped connections, HTML error pages)
// are retried and, if they persist, surface as TransientError so callers keep
// cached data instead of recording a wrong result.
class TransientError extends Error {}

const RETRY_DELAYS_MS = [2000, 5000, 15000];

const steamGetOnce = (endpoint) => new Promise((resolve, reject) => {
    https.get(endpoint, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
            const status = res.statusCode;
            if (status === 429 || status >= 500) {
                reject(new TransientError(`HTTP ${status}`));
                return;
            }
            let parsed;
            try {
                parsed = JSON.parse(data);
            } catch (e) {
                // Steam serves HTML error pages when throttling
                reject(new TransientError(`HTTP ${status}, non-JSON body`));
                return;
            }
            if (DEBUG) {
                const sanitized = endpoint.replace(STEAM_API_KEY, '***');
                console.log(`\n  [DEBUG] GET ${sanitized}  (HTTP ${status})`);
                console.log(JSON.stringify(parsed, null, 2));
            }
            // 4xx with a JSON body is a real answer (e.g. "Requested app has no stats")
            resolve(parsed);
        });
    }).on('error', e => reject(new TransientError(e.message)));
});

const steamGet = async (endpoint) => {
    for (let attempt = 0; ; attempt++) {
        try {
            return await steamGetOnce(endpoint);
        } catch (e) {
            if (!(e instanceof TransientError) || attempt >= RETRY_DELAYS_MS.length) throw e;
            await sleep(RETRY_DELAYS_MS[attempt]);
        }
    }
};

const API = 'https://api.steampowered.com';
const STORE_API = 'https://store.steampowered.com';

const url = {
    playerSummary:      () => `${API}/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${STEAM_ID}`,
    ownedGames:         () => `${API}/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_API_KEY}&steamid=${STEAM_ID}&include_appinfo=true&include_played_free_games=true`,
    recentlyPlayed:     (count = 10) => `${API}/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${STEAM_API_KEY}&steamid=${STEAM_ID}&count=${count}`,
    playerAchievements: (appId) => `${API}/ISteamUserStats/GetPlayerAchievements/v0001/?key=${STEAM_API_KEY}&steamid=${STEAM_ID}&appid=${appId}`,
    gameSchema:         (appId) => `${API}/ISteamUserStats/GetSchemaForGame/v2/?key=${STEAM_API_KEY}&appid=${appId}`,
    globalAchPct:       (appId) => `${API}/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid=${appId}`,
    appDetails:         (appId) => `${STORE_API}/api/appdetails?appids=${appId}&filters=basic,genres,categories`,
};

// =========================================================
// Phase 2: Profile & Game Data Extraction
// =========================================================

async function executeProfileExtraction() {
    log.section(`Phase 2 — Profile Extraction  [ ${STEAM_ID} ]`);

    const payload = {
        metadata:        { extractionTimestamp: new Date().toISOString() },
        profile:         null,
        stats:           null,
        recentlyPlayed:  [],
    };

    // ── Player summary ──────────────────────────────────────
    log.step('Fetching player summary...');
    const summaryRes = await steamGet(url.playerSummary());
    const player = summaryRes.response?.players?.[0];
    if (!player) throw new Error('Player not found — check STEAM_ID');

    payload.profile = {
        steamId:      player.steamid,
        displayName:  player.personaname,
        avatar:       player.avatarfull,
        profileUrl:   player.profileurl,
        status:       player.personastate,   // 0=Offline 1=Online 2=Busy 3=Away 4=Snooze 5=LookingToTrade 6=LookingToPlay
        lastOnline:   player.lastlogoff ? new Date(player.lastlogoff * 1000).toISOString() : null,
        countryCode:  player.loccountrycode ?? null,
    };
    log.done(player.personaname);
    await sleep(1000);

    // ── Owned games ─────────────────────────────────────────
    log.step('Fetching owned games...');
    const ownedRes = await steamGet(url.ownedGames());
    const owned = ownedRes.response?.games ?? [];
    const totalPlaytimeMin = owned.reduce((acc, g) => acc + (g.playtime_forever || 0), 0);
    const gamesWithPlaytime = owned.filter(g => g.playtime_forever > 0).length;

    payload.stats = {
        totalGames:       ownedRes.response?.game_count ?? owned.length,
        totalPlaytimeMin: totalPlaytimeMin,
        totalPlaytimeHrs: Math.round(totalPlaytimeMin / 60),
        gamesWithPlaytime,
    };
    log.done(`${payload.stats.totalGames} games  /  ${payload.stats.totalPlaytimeHrs}h total`);

    // Build last-played lookup from owned games (rtime_last_played is a Unix timestamp)
    const lastPlayedMap = {};
    owned.forEach(g => {
        if (g.rtime_last_played) {
            lastPlayedMap[g.appid] = new Date(g.rtime_last_played * 1000).toISOString();
        }
    });
    await sleep(1000);

    // ── Recently played ─────────────────────────────────────
    log.step('Fetching recently played games...');
    const recentRes = await steamGet(url.recentlyPlayed(15));
    const recent = recentRes.response?.games ?? [];

    payload.recentlyPlayed = recent
        .map(g => ({
            appId:             g.appid,
            name:              g.name,
            playtime2Weeks:    g.playtime_2weeks   ?? 0,
            playtimeForever:   g.playtime_forever  ?? 0,
            iconUrl:           g.img_icon_url
                ? `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`
                : null,
            storeUrl:          `https://store.steampowered.com/app/${g.appid}`,
            lastPlayedTs:      lastPlayedMap[g.appid] ?? null,
        }))
        // Sort by last-played descending — API returns by playtime_2weeks which is wrong
        .sort((a, b) => (b.lastPlayedTs || '').localeCompare(a.lastPlayedTs || ''));
    log.done(`${payload.recentlyPlayed.length} games`);
    await sleep(1000);

    return { payload, owned };
}

// =========================================================
// Phase 2a: Achievement Details per Game
// =========================================================

async function executeGameExtraction(recentlyPlayed, owned) {
    const OUTPUT_DIR        = path.join(__dirname, '..', 'data', 'steam');
    const gamesDir          = path.join(OUTPUT_DIR, 'games');
    const sentinelCachePath = path.join(gamesDir, 'sentinel.json');

    // Load achievement cache (frontend data — only games with achievements)
    let cachedProgress = {};
    if (fs.existsSync(gamesDir)) {
        // New format: read individual game files
        try {
            const files = fs.readdirSync(gamesDir).filter(f => f !== 'index.json' && f !== 'sentinel.json' && f.endsWith('.json'));
            for (const file of files) {
                try {
                    const appId = path.basename(file, '.json');
                    const data = JSON.parse(fs.readFileSync(path.join(gamesDir, file), 'utf8'));
                    cachedProgress[appId] = data;
                } catch (e) {
                    log.fail(`Could not read games/${file}: ${e.message}`);
                }
            }
            if (Object.keys(cachedProgress).length > 0) {
                log.ok(`Loaded ${Object.keys(cachedProgress).length} cached game(s) from games/ dir`);
            }
        } catch (e) {
            log.fail(`Could not read games directory: ${e.message}`);
        }
    } else {
        // Migration fallback: read old games.json if it exists
        const oldGamesJsonPath = path.join(OUTPUT_DIR, 'games.json');
        if (fs.existsSync(oldGamesJsonPath)) {
            try {
                const existing = JSON.parse(fs.readFileSync(oldGamesJsonPath, 'utf8'));
                cachedProgress = existing.achievementProgress || {};
                log.ok(`Migrated ${Object.keys(cachedProgress).length} cached game(s) from legacy games.json`);
            } catch (e) {
                log.fail(`Could not read legacy games.json: ${e.message}`);
            }
        }
    }

    // Load sentinel cache (pipeline-only — no-achievement games, never sent to frontend)
    let sentinelCache = {};
    if (fs.existsSync(sentinelCachePath)) {
        try {
            sentinelCache = JSON.parse(fs.readFileSync(sentinelCachePath, 'utf8'));
        } catch (e) {
            log.fail(`Could not read games/sentinel.json: ${e.message}`);
        }
    }

    // Build the list of games to process and starting state of achievementProgress
    const achievementProgress = {};
    let gamesToFetch;

    if (REFRESH_GAMES) {
        // Full refresh formula:
        //   (owned games with playtime > 0) + (recently played) - (cached no-achievement games)
        // No-achievement sentinels are preserved as-is — those games won't gain achievements.
        const noAchIds = new Set(Object.keys(sentinelCache).map(Number));

        const ownedPlayed = (owned || [])
            .filter(g => g.playtime_forever > 0 && !noAchIds.has(g.appid))
            .map(g => ({ appId: g.appid, name: g.name }));

        const recentIds = new Set(recentlyPlayed.map(g => g.appId));
        gamesToFetch = [
            ...recentlyPlayed.filter(g => !noAchIds.has(g.appId)),
            ...ownedPlayed.filter(g => !recentIds.has(g.appId)),
        ];

        // Seed from cache so a game whose fetch fails keeps its previous data
        Object.assign(achievementProgress, cachedProgress);

        const extraCount = gamesToFetch.length - recentlyPlayed.filter(g => !noAchIds.has(g.appId)).length;
        log.section(`Phase 2a — Achievement Details  [ full refresh: ${gamesToFetch.length} games ]`);
        log.ok(`Re-fetching ${gamesToFetch.length} games (recently played + ${extraCount} owned/played)`);
        log.ok(`Skipping ${noAchIds.size} no-achievement games (sentinel cache)`);
    } else if (REFRESH_UNLOCKED_GAMES) {
        // Unlocked refresh: seed from cache, re-fetch only games with unlocked > 0
        Object.assign(achievementProgress, cachedProgress);

        const unlockedCached = Object.entries(cachedProgress)
            .filter(([, d]) => d.hasAchievements && d.unlocked > 0)
            .map(([appId, d]) => ({ appId: Number(appId), name: d.gameName ?? `App ${appId}` }));

        const recentIds = new Set(recentlyPlayed.map(g => g.appId));
        gamesToFetch = [
            ...recentlyPlayed,
            ...unlockedCached.filter(g => !recentIds.has(g.appId)),
        ];

        const extraCount = gamesToFetch.length - recentlyPlayed.length;
        log.section(`Phase 2a — Achievement Details  [ unlocked refresh: ${gamesToFetch.length} games ]`);
        log.ok(`Re-fetching ${gamesToFetch.length} games (${recentlyPlayed.length} recent + ${extraCount} cached with unlocks)`);
    } else {
        // Incremental: seed from cache, only fetch recently played (always up-to-date)
        Object.assign(achievementProgress, cachedProgress);
        gamesToFetch = recentlyPlayed;
        if (Object.keys(cachedProgress).length > 0) {
            log.section(`Phase 2a — Achievement Details  [ ${recentlyPlayed.length} recently played ]`);
            log.ok(`Loaded ${Object.keys(cachedProgress).length} cached game(s) from games/ dir`);
        } else {
            log.section(`Phase 2a — Achievement Details  [ ${recentlyPlayed.length} recently played ]`);
            log.skip('No existing games/ dir found — starting fresh');
        }
    }

    let idx = 0;
    let failedCount = 0;
    for (const game of gamesToFetch) {
        idx++;
        const appId = game.appId;

        process.stdout.write(`  [${idx}/${gamesToFetch.length}] [${appId}] ${game.name}...`);
        try {
            // Sequential, not parallel: bursts of three calls per game trigger throttling
            const achRes = await steamGet(url.playerAchievements(appId));
            const noStats = achRes.playerstats?.success === false
                && /no stats/i.test(achRes.playerstats?.error ?? '');
            if (!noStats && achRes.playerstats?.success === false) {
                // e.g. "Profile is not public" — not an answer about this game
                throw new TransientError(achRes.playerstats?.error ?? 'playerstats.success = false');
            }
            const schemaRes = noStats ? {} : await steamGet(url.gameSchema(appId));
            const schemaAchs  = schemaRes.game?.availableGameStats?.achievements ?? [];
            const globalRes = (noStats || schemaAchs.length === 0) ? {} : await steamGet(url.globalAchPct(appId));

            const playerAchs  = achRes.playerstats?.achievements ?? [];
            const schemaMap   = Object.fromEntries(schemaAchs.map(a => [a.name, a]));
            const globalAchs  = globalRes.achievementpercentages?.achievements ?? [];
            const globalPctMap = Object.fromEntries(globalAchs.map(a => [a.name, a.percent]));
            const unlocked    = playerAchs.filter(a => a.achieved === 1).length;

            if (noStats || schemaAchs.length === 0) {
                // Steam says this game has no achievements — pipeline-only sentinel
                sentinelCache[appId] = { gameName: game.name };
                console.log(` →  (no achievements)`);
            } else if (unlocked === 0) {
                // Has achievements but none unlocked — cache so card can show locked list,
                // but keep unlocked:0 so --refresh-games still re-checks it (not a sentinel)
                achievementProgress[appId] = {
                    hasAchievements: true,
                    total:    schemaAchs.length,
                    unlocked: 0,
                    gameName: achRes.playerstats?.gameName ?? game.name,
                    achievements: playerAchs.map(a => {
                        const schema = schemaMap[a.apiname] ?? {};
                        return {
                            apiName:     a.apiname,
                            unlocked:    false,
                            unlockedAt:  null,
                            displayName: schema.displayName ?? a.apiname,
                            description: schema.description ?? '',
                            iconUrl:     achIconHash(schema.icon)     ?? null,
                            iconGrayUrl: achIconHash(schema.icongray) ?? null,
                            hidden:      schema.hidden === 1,
                            globalPct:   globalPctMap[a.apiname] != null
                                ? Math.round(globalPctMap[a.apiname] * 10) / 10
                                : null,
                        };
                    }),
                };
                console.log(` →  (none unlocked — locked list cached)`);
            } else {
                achievementProgress[appId] = {
                    hasAchievements: true,
                    total:    schemaAchs.length,
                    unlocked,
                    gameName: achRes.playerstats?.gameName ?? game.name,
                    achievements: playerAchs.map(a => {
                        const schema = schemaMap[a.apiname] ?? {};
                        return {
                            apiName:     a.apiname,
                            unlocked:    a.achieved === 1,
                            unlockedAt:  a.achieved === 1 && a.unlocktime
                                ? new Date(a.unlocktime * 1000).toISOString()
                                : null,
                            displayName: schema.displayName ?? a.apiname,
                            description: schema.description ?? '',
                            iconUrl:     achIconHash(schema.icon)     ?? null,
                            iconGrayUrl: achIconHash(schema.icongray) ?? null,
                            hidden:      schema.hidden === 1,
                            globalPct:   globalPctMap[a.apiname] != null
                                ? Math.round(globalPctMap[a.apiname] * 10) / 10
                                : null,
                        };
                    }),
                };
                console.log(` ✓  (${unlocked}/${schemaAchs.length} unlocked)`);
            }
            if (!noStats && schemaAchs.length > 0) delete sentinelCache[appId];
        } catch (e) {
            // Transient or unexpected failure: keep any cached data, record nothing new
            failedCount++;
            console.log(` ✗  (${e.message}${achievementProgress[appId] ? ' — kept cached data' : ''})`);
        }
        await sleep(1500);
    }

    if (failedCount > 0) log.fail(`${failedCount} game(s) failed after retries — cached data kept`);

    return { achievementProgress, sentinelCache };
}

// =========================================================
// Phase 3: Local JSON Serialization
// =========================================================

function serializeLocally(payload, achievementProgress, sentinelCache, owned) {
    log.section('Phase 3 — Local Serialization');

    const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'steam');
    const ACH_DIR    = path.join(OUTPUT_DIR, 'achievements');
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        log.ok(`Created output directory: ${OUTPUT_DIR}`);
    }
    if (!fs.existsSync(ACH_DIR)) {
        fs.mkdirSync(ACH_DIR, { recursive: true });
        log.ok(`Created achievements directory: ${ACH_DIR}`);
    }
    const GAMES_DIR = path.join(OUTPUT_DIR, 'games');
    if (!fs.existsSync(GAMES_DIR)) {
        fs.mkdirSync(GAMES_DIR, { recursive: true });
        log.ok(`Created games directory: ${GAMES_DIR}`);
    }

    const write = (filename, data, dir = OUTPUT_DIR) => {
        const filePath = path.join(dir, filename);
        const json     = JSON.stringify(data, null, 4);
        const sizeKb   = (Buffer.byteLength(json, 'utf8') / 1024).toFixed(1);
        fs.writeFileSync(filePath, json, 'utf8');
        log.ok(`${filename.padEnd(24)} ${sizeKb} KB  →  ${filePath}`);
    };

    // Derive aggregate achievement stats
    const achEntries         = Object.values(achievementProgress).filter(g => g.hasAchievements && g.unlocked > 0);
    const totalAchievements  = achEntries.reduce((acc, g) => acc + (g.total   ?? 0), 0);
    const unlockedAchievements = achEntries.reduce((acc, g) => acc + (g.unlocked ?? 0), 0);

    // Compile recent achievements across all cached games — 1 year window, sorted newest first
    const oneYearAgo = new Date(payload.metadata.extractionTimestamp);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const recentAchievements = [];
    for (const [appId, game] of Object.entries(achievementProgress)) {
        if (!game.hasAchievements || !game.achievements) continue;
        for (const ach of game.achievements) {
            if (!ach.unlocked || !ach.unlockedAt) continue;
            if (new Date(ach.unlockedAt) < oneYearAgo) continue;
            recentAchievements.push({
                appId:       Number(appId),
                gameName:    game.gameName,
                apiName:     ach.apiName,
                displayName: ach.displayName,
                description: ach.description,
                iconUrl:     ach.iconUrl
                    ? `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/${appId}/${ach.iconUrl}`
                    : null,
                unlockedAt:  ach.unlockedAt,
                globalPct:   ach.globalPct ?? null,
            });
        }
    }
    recentAchievements.sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt));

    // Build playtime/last-played/icon map from owned games (already fetched in Phase 2)
    const ownedMap = {};
    (owned || []).forEach(g => {
        ownedMap[g.appid] = {
            playtimeForever: g.playtime_forever ?? 0,
            lastPlayedTs:    g.rtime_last_played
                ? new Date(g.rtime_last_played * 1000).toISOString()
                : null,
            iconUrl: g.img_icon_url
                ? `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`
                : null,
        };
    });

    // Enrich achievementProgress entries with playtime + icon data
    const enrichedProgress = {};
    for (const [appId, data] of Object.entries(achievementProgress)) {
        const om = ownedMap[Number(appId)];
        enrichedProgress[appId] = om
            ? { appId: Number(appId), ...data, playtimeForever: om.playtimeForever, lastPlayedTs: om.lastPlayedTs, iconUrl: om.iconUrl }
            : { appId: Number(appId), ...data };
    }

    // Pre-compute perfect games (100% completion) sorted by completion date desc
    const perfectGames = Object.entries(enrichedProgress)
        .filter(([, d]) => d.hasAchievements && d.total > 0 && d.unlocked >= d.total)
        .map(([appId, d]) => {
            const unlockedAchs = d.achievements
                ? d.achievements.filter(a => a.unlocked && a.unlockedAt)
                : [];
            const lastAch = unlockedAchs.length
                ? unlockedAchs.reduce((max, a) => a.unlockedAt > max.unlockedAt ? a : max)
                : null;
            return {
                appId:              Number(appId),
                gameName:           d.gameName,
                total:              d.total,
                playtimeForever:    d.playtimeForever ?? 0,
                completedAt:        lastAch?.unlockedAt ?? null,
                lastAchName:        lastAch?.displayName ?? null,
                lastAchIconUrl:     lastAch?.iconUrl
                    ? `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/${appId}/${lastAch.iconUrl}`
                    : null,
                lastAchGlobalPct:   lastAch?.globalPct ?? null,
                iconUrl:            d.iconUrl ?? null,
            };
        })
        .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));

    // profile.json — everything needed to render the hub card + overview
    const totalPlaytimeMin = payload.stats.totalPlaytimeMin ?? 0;
    const gamesWithPlaytime = payload.stats.gamesWithPlaytime ?? 0;
    write('profile.json', {
        metadata:       payload.metadata,
        profile:        payload.profile,
        stats: {
            ...payload.stats,
            totalAchievements,
            unlockedAchievements,
            gamesWithAchievements: achEntries.length,
            perfectCount: perfectGames.length,
            // Pre-computed so JS doesn't calculate on every load
            completionPct:   totalAchievements > 0
                ? Math.floor((unlockedAchievements / totalAchievements) * 100)
                : 0,
            avgPlaytimeMin:  gamesWithPlaytime > 0
                ? Math.floor(totalPlaytimeMin / gamesWithPlaytime)
                : 0,
        },
        // Augment recentlyPlayed with achievement counts from cache
        recentlyPlayed: payload.recentlyPlayed.map(g => {
            const ach = achievementProgress[g.appId];
            return {
                ...g,
                achUnlocked: ach?.unlocked ?? null,
                achTotal:    ach?.total    ?? null,
            };
        }),
        // Pre-computed shortcuts
        mostRecentGame:    payload.recentlyPlayed[0] ?? null,
        mostRecentUnlock:  recentAchievements[0] ?? null,
        perfectGames,
    });

    // achievements/heatmap.json — compact day→count map for the Activity heatmap
    const heatmap = {};
    recentAchievements.forEach(a => {
        if (!a.unlockedAt) return;
        const day = a.unlockedAt.substring(0, 10);
        if (!heatmap[day]) heatmap[day] = { count: 0 };
        heatmap[day].count++;
    });
    write('heatmap.json', { activityHeatmap: heatmap }, ACH_DIR);

    // achievements/N.json — 1 year of unlocks split into 4 quarterly chunks
    // Chunk 1 = most recent (0–91 days), Chunk 4 = oldest (273–364 days)
    const CHUNK_MS = 91 * 24 * 60 * 60 * 1000;
    const extractionTime = new Date(payload.metadata.extractionTimestamp).getTime();
    for (let i = 0; i < 4; i++) {
        const toMs   = extractionTime - (i * CHUNK_MS);
        const fromMs = extractionTime - ((i + 1) * CHUNK_MS);
        const chunk  = recentAchievements.filter(a => {
            const t = new Date(a.unlockedAt).getTime();
            return t > fromMs && t <= toMs;
        });
        write(`${i + 1}.json`, { recentAchievements: chunk }, ACH_DIR);
    }

    // games/index.json — index without achievements[], for fast initial load
    const gamesIndex = {};
    for (const [appId, data] of Object.entries(enrichedProgress)) {
        const { achievements, ...rest } = data;
        const unlockedAchs = (achievements || []).filter(a => a.unlocked && a.unlockedAt)
            .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt));
        const lockedAchs = (achievements || []).filter(a => !a.unlocked);
        const preview = [...unlockedAchs, ...lockedAchs].slice(0, 6).map(a => ({
            apiName:     a.apiName,
            displayName: a.displayName,
            unlocked:    a.unlocked,
            unlockedAt:  a.unlockedAt,
            iconUrl:     a.iconUrl,
            iconGrayUrl: a.iconGrayUrl,
            globalPct:   a.globalPct,
        }));
        const lastUnlock = unlockedAchs[0] ?? null;
        gamesIndex[appId] = {
            ...rest,
            lastUnlockedAt: lastUnlock?.unlockedAt ?? null,
            lastUnlockName: lastUnlock?.displayName ?? null,
            preview,
        };
    }
    write('index.json', { achievementProgress: gamesIndex }, GAMES_DIR);

    // games/{appId}.json — full data per game including achievements[]
    for (const [appId, data] of Object.entries(enrichedProgress)) {
        const unlockedAchs = (data.achievements || []).filter(a => a.unlocked && a.unlockedAt)
            .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt));
        const lockedAchs = (data.achievements || []).filter(a => !a.unlocked);
        const preview = [...unlockedAchs, ...lockedAchs].slice(0, 6).map(a => ({
            apiName:     a.apiName,
            displayName: a.displayName,
            unlocked:    a.unlocked,
            unlockedAt:  a.unlockedAt,
            iconUrl:     a.iconUrl,
            iconGrayUrl: a.iconGrayUrl,
            globalPct:   a.globalPct,
        }));
        const lastUnlock = unlockedAchs[0] ?? null;
        write(`${appId}.json`, {
            ...data,
            lastUnlockedAt: lastUnlock?.unlockedAt ?? null,
            lastUnlockName: lastUnlock?.displayName ?? null,
            preview,
        }, GAMES_DIR);
    }

    // games/sentinel.json — pipeline-only, never loaded by frontend
    write('sentinel.json', sentinelCache, GAMES_DIR);
}

// =========================================================
// Phase 4: ETL Orchestration
// =========================================================

async function runPipeline() {
    try {
        const { payload, owned } = await executeProfileExtraction();
        const { achievementProgress, sentinelCache } = await executeGameExtraction(payload.recentlyPlayed, owned);
        serializeLocally(payload, achievementProgress, sentinelCache, owned);

        log.section('Pipeline Complete');
        log.ok(`Extraction timestamp  : ${payload.metadata.extractionTimestamp}`);
        log.ok(`Display name          : ${payload.profile.displayName}`);
        log.ok(`Total games           : ${payload.stats.totalGames}`);
        log.ok(`Total playtime        : ${payload.stats.totalPlaytimeHrs}h`);
        log.ok(`Recently played       : ${payload.recentlyPlayed.length} games`);
        log.ok(`Games with achievements: ${Object.values(achievementProgress).filter(g => g.hasAchievements).length}`);
        console.log();
        process.exit(0);
    } catch (error) {
        log.fail(`Pipeline aborted: ${error.message}`);
        process.exit(1);
    }
}

runPipeline();
