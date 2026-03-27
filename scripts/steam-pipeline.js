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

const steamGet = (endpoint) => new Promise((resolve, reject) => {
    https.get(endpoint, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
            try {
                const parsed = JSON.parse(data);
                if (DEBUG) {
                    const sanitized = endpoint.replace(STEAM_API_KEY, '***');
                    console.log(`\n  [DEBUG] GET ${sanitized}`);
                    console.log(JSON.stringify(parsed, null, 2));
                }
                resolve(parsed);
            } catch (e) {
                reject(new Error(`JSON parse failed: ${e.message}`));
            }
        });
    }).on('error', reject);
});

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
    const gamesJsonPath     = path.join(OUTPUT_DIR, 'games.json');
    const sentinelCachePath = path.join(OUTPUT_DIR, 'sentinel-cache.json');

    // Load achievement cache (frontend data — only games with achievements)
    let cachedProgress = {};
    if (fs.existsSync(gamesJsonPath)) {
        try {
            const existing = JSON.parse(fs.readFileSync(gamesJsonPath, 'utf8'));
            cachedProgress = existing.achievementProgress || {};
        } catch (e) {
            log.fail(`Could not read games.json: ${e.message}`);
        }
    }

    // Load sentinel cache (pipeline-only — no-achievement games, never sent to frontend)
    let sentinelCache = {};
    if (fs.existsSync(sentinelCachePath)) {
        try {
            sentinelCache = JSON.parse(fs.readFileSync(sentinelCachePath, 'utf8'));
        } catch (e) {
            log.fail(`Could not read sentinel-cache.json: ${e.message}`);
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
            log.ok(`Loaded ${Object.keys(cachedProgress).length} cached game(s) from games.json`);
        } else {
            log.section(`Phase 2a — Achievement Details  [ ${recentlyPlayed.length} recently played ]`);
            log.skip('No existing games.json found — starting fresh');
        }
    }

    let idx = 0;
    for (const game of gamesToFetch) {
        idx++;
        const appId = game.appId;

        process.stdout.write(`  [${idx}/${gamesToFetch.length}] [${appId}] ${game.name}...`);
        try {
            const [achRes, schemaRes, globalRes] = await Promise.all([
                steamGet(url.playerAchievements(appId)),
                steamGet(url.gameSchema(appId)),
                steamGet(url.globalAchPct(appId)),
            ]);

            const playerAchs  = achRes.playerstats?.achievements ?? [];
            const schemaAchs  = schemaRes.game?.availableGameStats?.achievements ?? [];
            const schemaMap   = Object.fromEntries(schemaAchs.map(a => [a.name, a]));
            const globalAchs  = globalRes.achievementpercentages?.achievements ?? [];
            const globalPctMap = Object.fromEntries(globalAchs.map(a => [a.name, a.percent]));
            const unlocked    = playerAchs.filter(a => a.achieved === 1).length;

            if (schemaAchs.length === 0) {
                // No achievements — write to sentinel cache (pipeline-only, not sent to frontend)
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
        } catch (e) {
            // Game doesn't support stats API (e.g. no achievements, delisted) — cache sentinel
            sentinelCache[appId] = { gameName: game.name, error: e.message };
            console.log(` →  (no stats: ${e.message})`);
        }
        await sleep(1500);
    }

    return { achievementProgress, sentinelCache };
}

// =========================================================
// Phase 3: Local JSON Serialization
// =========================================================

function serializeLocally(payload, achievementProgress, sentinelCache, owned) {
    log.section('Phase 3 — Local Serialization');

    const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'steam');
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        log.ok(`Created output directory: ${OUTPUT_DIR}`);
    }

    const write = (filename, data) => {
        const filePath = path.join(OUTPUT_DIR, filename);
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
        mostRecentGame:  payload.recentlyPlayed[0] ?? null,
        perfectGames,
    });

    // achievements.json — 1 year of unlocks compiled from all cached games
    write('achievements.json', {
        mostRecentUnlock: recentAchievements[0] ?? null,
        recentAchievements,
    });

    // games.json — per-game achievement progress enriched with playtime
    write('games.json', {
        achievementProgress: enrichedProgress,
    });

    // sentinel-cache.json — pipeline-only, never loaded by frontend
    write('sentinel-cache.json', sentinelCache);
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
