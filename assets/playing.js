// "Playing": the games in rotation, so games played in parallel don't get lost.
// Built in the browser from files the pipelines already write, so "3d ago" is never stale:
// play sessions, achievement chunk 1 (covers 91 days), RA awards and progress, the per-game
// files of the Steam candidates and their win conditions.
// RA and Steam only: rotation is measured in play time, and Xbox reports none (judging it by
// unlocks would miss games played without unlocking anything).
// Plain ES module (no JSX), imported by the Activity page and, via import(), by the hub.
import { toMs, dayKey, addDays, keyToDate } from './time.js';
import { raIcon } from './ra-icon.js';

// 13 weeks, so the weekly play strip and the session stats cover the same days
export const PLAYING_WEEKS = 13;
export const PLAYING_WINDOW_DAYS = PLAYING_WEEKS * 7;
// A game needs real time in it to count, which drops demos and checking that an RA hash loads:
// an hour of play in the window. A game touched in the last 2 weeks needs only 30 minutes, so
// one you just started shows up
export const PLAYING_MIN_MINUTES    = 60;
export const PLAYING_RECENT_DAYS    = 14;
export const PLAYING_RECENT_MINUTES = 30;
// A game with 5+ hours in the window stays Playing until On hold ends: a long RPG you come
// back to every few weeks is still in rotation
export const PLAYING_INVESTED_MINUTES = 300;
export const PLAYING_ONHOLD_DAYS      = 45;
// Play in the same sitting as the beat isn't post-game play
const BEATEN_GRACE_MS = 30 * 60000;
// Groups by local calendar days since the game was last played or had an unlock
export const PLAYING_GROUPS = [
    { id: 'playing',  label: 'Playing',  hint: 'Played in the last 2 weeks, or 5h+ in and played in the last 6' },
    { id: 'onhold',   label: 'On hold',  hint: 'Not played for 2–6 weeks' },
    { id: 'drifting', label: 'Drifting', hint: 'Not played for 6+ weeks, unfinished' },
];
const groupOf = (ago, minutes) =>
    ago <= PLAYING_RECENT_DAYS || (minutes >= PLAYING_INVESTED_MINUTES && ago <= PLAYING_ONHOLD_DAYS) ? 'playing'
    : ago <= PLAYING_ONHOLD_DAYS ? 'onhold'
    : ago <= PLAYING_WINDOW_DAYS ? 'drifting'
    : null;
// Same rule as Analytics (FARM_* in analytics/utils.js): achievement farms aren't games in rotation.
// data/hub/farm-games.json (admin, General → Farm Games) adds games by hand (`farms`) and overrules the rule (`notFarms`)
const FARM_PER_HOUR = 15;
const FARM_MIN_UNLOCKS = 10;
const RA_MEDIA = 'https://media.retroachievements.org';

// Days between a timestamp's local day and today's
const daysAgo = (ms, today) => Math.round((keyToDate(today) - keyToDate(dayKey(ms))) / 86400000);

// Win condition met? `cond` is an array of apiNames (any) or { mode: 'and' | 'or', achievements }.
// Returns the unlock time that beat the game, or 0
const beatenAt = (cond, achs) => {
    if (!cond) return 0;
    const isArr = Array.isArray(cond);
    const mode  = isArr ? 'or' : (cond.mode || 'or');
    const names = isArr ? cond : (cond.achievements || []);
    const hits  = achs.filter(a => a.unlocked && names.includes(a.apiName));
    if (!hits.length || (mode === 'and' && hits.length < names.length)) return 0;
    const times = hits.map(a => toMs(a.unlockedAt)).filter(Boolean);
    return times.length ? (mode === 'and' ? Math.max(...times) : Math.min(...times)) : 1;
};

// `fetchJson(url)` resolves to parsed JSON or null; `base` is the site root ('./' or '../').
// Resolves to { games, groups } — games sorted most recent first, each with
// { key, platform, gameId, name, icon, cover, consoleName, lastMs, daysAgo, minutes, unlocks, days,
//   sessions, weeks, totalMinutes, progress: { unlocked, total } | null, beaten, group }.
// `minutes`, `sessions` and `weeks` cover the 13 weeks; `weeks` holds minutes per week, oldest
// first. `totalMinutes` is lifetime playtime (null for an RA game the pipeline hasn't written it
// for). `cover` is the Steam header, or for RA the banner picked in the admin (data/ra/art.json), else null
export async function loadPlaying(fetchJson, base = './', now = Date.now()) {
    const today   = dayKey(now);
    const startMs = keyToDate(addDays(today, -(PLAYING_WINDOW_DAYS - 1))).getTime();
    const years   = [...new Set([new Date(startMs).getUTCFullYear(), new Date(now).getUTCFullYear()])];

    const [playFiles, chunks, raProfile, steamWc] = await Promise.all([
        Promise.all(['ra', 'steam'].flatMap(p => years.map(y =>
            fetchJson(`${base}data/${p}/playtime/${y}.json`).then(f => ({ p, f }))))),
        Promise.all(['ra', 'steam'].map(p =>
            fetchJson(`${base}data/${p}/achievements/1.json`).then(c => ({ p, list: c?.recentAchievements ?? [] })))),
        fetchJson(`${base}data/ra/profile.json`),
        fetchJson(`${base}data/steam/win-conditions.json`),
    ]);

    const games = {};
    const game = (platform, gameId) => (games[`${platform}:${gameId}`] ??= {
        key: `${platform}:${gameId}`, platform, gameId: String(gameId), name: null, icon: null, consoleName: null,
        lastMs: 0, minutes: 0, unlocks: 0, sessions: 0, weeks: Array(PLAYING_WEEKS).fill(0), dayKeys: new Set(), activity: [],
    });
    // Week cell of a timestamp: 7-day blocks counted back from today, the last cell is the current one
    const weekOf = (ms) => PLAYING_WEEKS - 1 - Math.floor(daysAgo(ms, today) / 7);

    // Sessions: counted by end time (a session still running at the window start counts whole)
    for (const { p, f } of playFiles) {
        for (const s of f?.sessions ?? []) {
            const end = toMs(s.end);
            if (end < startMs || end > now) continue;
            const g = game(p, s.gameId);
            const meta = f.games?.[s.gameId] ?? {};
            g.name ??= meta.name ?? null;
            g.icon ??= meta.icon ? (p === 'ra' ? `${RA_MEDIA}${meta.icon}` : meta.icon) : null;
            g.consoleName ??= meta.console ?? null;
            g.minutes += s.minutes;
            g.sessions++;
            g.weeks[weekOf(end)] += s.minutes;
            g.dayKeys.add(dayKey(end));
            g.activity.push(end);
        }
    }
    for (const { p, list } of chunks) {
        for (const a of list) {
            const ms = toMs(p === 'ra' ? a.date : a.unlockedAt);
            if (ms < startMs || ms > now) continue;
            const g = game(p, p === 'ra' ? a.gameId : a.appId);
            g.name ??= p === 'ra' ? a.gameTitle : a.gameName;
            if (p === 'ra') { g.icon ??= a.gameIcon ? `${RA_MEDIA}${a.gameIcon}` : null; g.consoleName ??= a.consoleName ?? null; }
            g.unlocks++;
            g.dayKeys.add(dayKey(ms));
            g.activity.push(ms);
        }
    }

    // Completion. Mastered/Perfect: never listed. Beaten: listed only while played after beating it
    const raDone = {};
    for (const aw of raProfile?.pageAwards?.visibleUserAwards ?? []) {
        const id = String(aw.awardData);
        if (aw.awardType === 'Mastery/Completion') raDone[id] = { complete: true };
        else if (aw.awardType === 'Game Beaten' && !raDone[id]?.complete) {
            raDone[id] = { beatenMs: Math.min(raDone[id]?.beatenMs ?? Infinity, toMs(aw.awardedAt)) };
        }
    }
    // RA wide art picked in the admin (data/ra/art.json): the banner becomes the tile cover, like Steam's header
    const raArt = (await fetchJson(`${base}data/ra/art.json`))?.games ?? {};
    // RA progress (unlocked / total) for every game with an unlock, from the same profile file
    const raProgress = Object.fromEntries((raProfile?.gameAwardsAndProgress?.results ?? []).map(r => [String(r.gameId), r]));
    const farmMarks = (await fetchJson(`${base}data/hub/farm-games.json`)) ?? {};
    const markedFarm = new Set(farmMarks.farms ?? []), notFarm = new Set(farmMarks.notFarms ?? []);

    const out = (await Promise.all(Object.values(games).map(async g => {
        if (markedFarm.has(g.key)) return null;
        let beatenMs = 0, progress = null, cover = null, totalMinutes = null;
        if (g.platform === 'ra') {
            const d = raDone[g.gameId];
            if (d?.complete) return null;
            beatenMs = d?.beatenMs ?? 0;
            const r = raProgress[g.gameId];
            if (r) {
                progress = { unlocked: Math.max(r.numAwarded ?? 0, r.numAwardedHardcore ?? 0), total: r.maxPossible ?? 0 };
                g.name ??= r.title ?? null;
                g.icon ??= r.imageIcon ? `${RA_MEDIA}${r.imageIcon}` : null;
                g.consoleName ??= r.consoleName ?? null;
                totalMinutes = r.playtime ?? null;
            }
            cover = raArt[g.gameId]?.grid?.thumb ?? null;
            g.icon = raIcon(g.icon, g.gameId, raArt);   // RA's placeholder → the square picked in the admin
        } else {
            const file = await fetchJson(`${base}data/steam/games/${g.gameId}.json`);
            if (file) {
                const total = file.total ?? 0, unlocked = file.unlocked ?? 0;
                if (total > 0 && unlocked >= total) return null;
                if (!notFarm.has(g.key) && unlocked >= FARM_MIN_UNLOCKS
                    && unlocked / Math.max((file.playtimeForever ?? 0) / 60, 0.1) > FARM_PER_HOUR) return null;
                g.name ??= file.gameName ?? null;
                g.icon ??= file.iconUrl ?? null;
                if (total > 0) progress = { unlocked, total };
                totalMinutes = file.playtimeForever ?? null;
                beatenMs = beatenAt(steamWc?.[g.gameId], file.achievements ?? []);
            }
            cover = file?.headerUrl ?? `https://cdn.akamai.steamstatic.com/steam/apps/${g.gameId}/header.jpg`;   // headerUrl: banner Steam moved
        }
        // A beaten game only counts what happened after it was beaten
        const activity = beatenMs ? g.activity.filter(t => t > beatenMs + BEATEN_GRACE_MS) : g.activity;
        if (!activity.length) return null;
        const lastMs = Math.max(...activity);
        const days = g.dayKeys.size;
        const ago = daysAgo(lastMs, today);
        const minMinutes = ago <= PLAYING_RECENT_DAYS ? PLAYING_RECENT_MINUTES : PLAYING_MIN_MINUTES;
        if (g.minutes < minMinutes) return null;
        const group = groupOf(ago, g.minutes);
        if (!group || (beatenMs && group !== 'playing')) return null;
        const { dayKeys, activity: _a, ...rest } = g;
        return { ...rest, name: g.name ?? `#${g.gameId}`, cover, progress, totalMinutes, lastMs, daysAgo: ago, days, beaten: !!beatenMs, group };
    }))).filter(Boolean).sort((a, b) => b.lastMs - a.lastMs);

    const groups = Object.fromEntries(PLAYING_GROUPS.map(x => [x.id, out.filter(g => g.group === x.id)]));
    return { games: out, groups };
}
