// "Playing": the games in rotation, so games played in parallel don't get lost.
// Built in the browser from files the pipelines already write, so "3d ago" is never stale:
// play sessions (RA + Steam), achievement chunk 1 (all three platforms, covers 91 days),
// RA awards, the per-game files of the Steam/Xbox candidates and their win conditions.
// Plain ES module (no JSX), imported by the Activity page and, via import(), by the hub.
import { toMs, dayKey, addDays, keyToDate } from './time.js';

export const PLAYING_WINDOW_DAYS = 90;
// A game needs real time in it to count: an hour of play in the window (RA, Steam), or unlocks
// on two different days (Xbox, which has no playtime). This drops tryouts, demos and checking
// that an RA hash loads
export const PLAYING_MIN_MINUTES = 60;
export const PLAYING_MIN_DAYS    = 2;
// Play in the same sitting as the beat isn't post-game play
const BEATEN_GRACE_MS = 30 * 60000;
// Groups by days since the game was last played or had an unlock (local calendar days)
export const PLAYING_GROUPS = [
    { id: 'playing',  label: 'Playing',  maxDays: 14, hint: 'Played in the last 2 weeks' },
    { id: 'onhold',   label: 'On hold',  maxDays: 45, hint: 'Not played for 2–6 weeks' },
    { id: 'drifting', label: 'Drifting', maxDays: PLAYING_WINDOW_DAYS, hint: 'Not played for 6+ weeks, unfinished' },
];
// Same rule as Analytics (FARM_* in analytics/utils.js): achievement farms aren't games in rotation
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
// { key, platform, gameId, name, icon, consoleName, lastMs, daysAgo, minutes, unlocks, days, beaten, group }
export async function loadPlaying(fetchJson, base = './', now = Date.now()) {
    const today   = dayKey(now);
    const startMs = keyToDate(addDays(today, -(PLAYING_WINDOW_DAYS - 1))).getTime();
    const years   = [...new Set([new Date(startMs).getUTCFullYear(), new Date(now).getUTCFullYear()])];

    const [playFiles, chunks, raProfile, steamWc, xboxWc] = await Promise.all([
        Promise.all(['ra', 'steam'].flatMap(p => years.map(y =>
            fetchJson(`${base}data/${p}/playtime/${y}.json`).then(f => ({ p, f }))))),
        Promise.all(['ra', 'steam', 'xbox'].map(p =>
            fetchJson(`${base}data/${p}/achievements/1.json`).then(c => ({ p, list: c?.recentAchievements ?? [] })))),
        fetchJson(`${base}data/ra/profile.json`),
        fetchJson(`${base}data/steam/win-conditions.json`),
        fetchJson(`${base}data/xbox/win-conditions.json`),
    ]);

    const games = {};
    const game = (platform, gameId) => (games[`${platform}:${gameId}`] ??= {
        key: `${platform}:${gameId}`, platform, gameId: String(gameId), name: null, icon: null, consoleName: null,
        lastMs: 0, minutes: 0, unlocks: 0, dayKeys: new Set(), activity: [],
    });

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
            g.dayKeys.add(dayKey(end));
            g.activity.push(end);
        }
    }
    for (const { p, list } of chunks) {
        for (const a of list) {
            const ms = toMs(p === 'ra' ? a.date : a.unlockedAt);
            if (ms < startMs || ms > now) continue;
            const g = game(p, p === 'ra' ? a.gameId : p === 'steam' ? a.appId : a.titleId);
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
    const wc = { steam: steamWc ?? {}, xbox: xboxWc ?? {} };

    const out = (await Promise.all(Object.values(games).map(async g => {
        let beatenMs = 0;
        if (g.platform === 'ra') {
            const d = raDone[g.gameId];
            if (d?.complete) return null;
            beatenMs = d?.beatenMs ?? 0;
        } else {
            const file = await fetchJson(`${base}data/${g.platform}/games/${g.gameId}.json`);
            if (file) {
                const total = file.total ?? 0, unlocked = file.unlocked ?? 0;
                if (total > 0 && unlocked >= total) return null;
                if (g.platform === 'steam' && unlocked >= FARM_MIN_UNLOCKS
                    && unlocked / Math.max((file.playtimeForever ?? 0) / 60, 0.1) > FARM_PER_HOUR) return null;
                g.name ??= file.gameName ?? null;
                g.icon ??= file.iconUrl ?? null;
                beatenMs = beatenAt(wc[g.platform][g.gameId], file.achievements ?? []);
            }
        }
        // A beaten game only counts what happened after it was beaten
        const activity = beatenMs ? g.activity.filter(t => t > beatenMs + BEATEN_GRACE_MS) : g.activity;
        if (!activity.length) return null;
        const lastMs = Math.max(...activity);
        const days = g.dayKeys.size;
        if (g.platform === 'xbox' ? days < PLAYING_MIN_DAYS : g.minutes < PLAYING_MIN_MINUTES) return null;
        const ago = daysAgo(lastMs, today);
        const group = PLAYING_GROUPS.find(x => ago <= x.maxDays)?.id;
        if (!group || (beatenMs && group !== 'playing')) return null;
        const { dayKeys, activity: _a, ...rest } = g;
        return { ...rest, name: g.name ?? `#${g.gameId}`, lastMs, daysAgo: ago, days, beaten: !!beatenMs, group };
    }))).filter(Boolean).sort((a, b) => b.lastMs - a.lastMs);

    const groups = Object.fromEntries(PLAYING_GROUPS.map(x => [x.id, out.filter(g => g.group === x.id)]));
    return { games: out, groups };
}
