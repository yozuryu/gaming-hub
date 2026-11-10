// Shared series (all platforms): data/hub/series.json (hand-made in the admin) → data/hub/series-games.json,
// one small file with every series game's progress, so the hub and series/ never load the per-platform
// game lists (RA games.json is 5 MB, the Steam index 1.8 MB).
//   node scripts/build-series.js [siteRoot]     (default: the repo; deploy.yml passes _site)
// Runs in deploy.yml after the site is assembled, and in the admin server after the series file is saved.
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const read = (rel, fallback = null) => {
    try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); } catch { return fallback; }
};
const ms = s => {
    if (!s) return 0;
    const t = Date.parse(/^\d{4}-\d{2}-\d{2} \d/.test(s) ? s.replace(' ', 'T') + 'Z' : s);
    return Number.isNaN(t) ? 0 : t;
};

const RA_MEDIA = 'https://media.retroachievements.org';
const STEAM_CDN = 'https://cdn.akamai.steamstatic.com/steam/apps';

function raGames() {
    // games/index.json (per-game split, with a summary), else the old single games.json
    const games = read('data/ra/games/index.json', null)?.games ?? read('data/ra/games.json', {})?.detailedGameProgress ?? {};
    const watch = read('data/ra/watchlist.json', {})?.results ?? [];
    const profile = read('data/ra/profile.json', {});
    const awards = profile?.pageAwards?.visibleUserAwards ?? [];
    const beaten = new Set(awards.filter(a => a.awardType === 'Game Beaten').map(a => String(a.awardData)));
    const played = Object.fromEntries((profile?.recentlyPlayedGames ?? []).map(g => [String(g.gameId), ms(g.lastPlayed)]));
    const wide = read('data/ra/art.json', {})?.games ?? {};   // SteamGridDB art picked in the admin
    // The hero picked in the admin (thumbnail for rows and cards, full size behind sheet headers)
    const wideOf = id => wide[id]?.grid
        ? { art: wide[id].hero?.thumb ?? wide[id].grid.thumb, artFull: wide[id].hero?.url ?? wide[id].grid.url, wide: true }
        : null;
    const out = {};
    for (const w of watch) {
        // Want-to-play entries carry only an icon, so the picked hero is their only art
        out[w.id] = { title: w.title, console: w.consoleName, icon: w.imageIcon ? RA_MEDIA + w.imageIcon : null, ...wideOf(w.id),
            unlocked: 0, total: w.achievementsPublished ?? 0, lastMs: 0, url: `https://retroachievements.org/game/${w.id}` };
    }
    for (const d of Object.values(games)) {
        const achs = Object.values(d.achievements ?? {});
        const lastUnlock = d.summary ? ms(d.summary.lastUnlock?.date) : Math.max(0, ...achs.filter(a => a.dateEarned).map(a => ms(a.dateEarned)));
        const shot = [d.imageIngame, d.imageTitle].find(x => x && !x.endsWith('/000002.png'));
        out[d.id] = {
            title: d.title, console: d.consoleName, icon: d.imageIcon ? RA_MEDIA + d.imageIcon : null,
            // Background: the hero picked in the admin, else the screenshot
            ...(wideOf(d.id) ?? { art: shot ? RA_MEDIA + shot : null }),
            unlocked: d.numAwardedToUser ?? 0, total: d.numAchievements ?? 0, minutes: Math.round((d.userTotalPlaytime ?? 0) / 60),
            beaten: beaten.has(String(d.id)), lastMs: Math.max(lastUnlock, played[d.id] ?? 0),
            sheet: (d.numAchievements ?? 0) > 0,   // has a set: the series page opens its achievements
            // Points and progression [earned, total] for the sheet header, so it is complete before the game's file loads
            ...raSums(d, achs),
            last: lastOfRA(d),
            url: `https://retroachievements.org/game/${d.id}`,
        };
    }
    return out;
}

const raSums = (d, achs) => {
    const sum = d.summary;
    if (sum) return { pts: [sum.pointsEarned ?? 0, sum.points ?? 0], prog: [sum.progEarned ?? 0, sum.prog ?? 0] };
    const isProg = a => a.type === 'progression' || a.type === 'win_condition';
    return {
        pts: [achs.reduce((n, a) => n + (a.dateEarned ? a.points || 0 : 0), 0), achs.reduce((n, a) => n + (a.points || 0), 0)],
        prog: [achs.filter(a => isProg(a) && a.dateEarned).length, achs.filter(isProg).length],
    };
};

// A game's latest unlock: name, badge, date (RA from the index summary, else the full list)
const lastOfRA = d => {
    let a = d.summary?.lastUnlock;
    if (!a && d.achievements) {
        for (const x of Object.values(d.achievements)) if (x.dateEarned && (!a || x.dateEarned > a.date)) a = { title: x.title, badgeName: x.badgeName, date: x.dateEarned };
    }
    return a ? { name: a.title, icon: `${RA_MEDIA}/Badge/${a.badgeName}.png`, at: a.date } : null;
};

// Steam and Xbox: the index, plus win conditions (beaten) checked against the per-game files
function indexGames(platform) {
    const idx = read(`data/${platform}/games/index.json`, {})?.achievementProgress ?? {};
    const wc = read(`data/${platform}/win-conditions.json`, {}) ?? {};
    const beaten = new Set();
    for (const [id, w] of Object.entries(wc)) {
        const names = Array.isArray(w) ? w : (w.achievements ?? []);
        const mode = Array.isArray(w) ? 'or' : (w.mode || 'or');
        const g = read(`data/${platform}/games/${id}.json`);
        const hit = (g?.achievements ?? []).filter(a => names.includes(a.apiName) && a.unlocked);
        if (mode === 'and' ? hit.length === names.length && names.length : hit.length) beaten.add(id);
    }
    const out = {};
    for (const [id, d] of Object.entries(idx)) {
        const steam = platform === 'steam';
        out[id] = {
            title: d.gameName ?? id,
            icon: steam ? d.headerUrl ?? `${STEAM_CDN}/${id}/header.jpg` : d.iconUrl ?? null,   // headerUrl: banner Steam moved
            // Square game icon for the small icon strips (Steam's icon is the community one; the header is wide)
            ...(steam && d.iconUrl ? { square: d.iconUrl } : {}),
            art: steam ? `${STEAM_CDN}/${id}/library_hero.jpg` : d.heroUrl ?? null,
            unlocked: d.hasAchievements ? d.unlocked ?? 0 : 0, total: d.hasAchievements ? d.total ?? 0 : 0,
            minutes: steam ? d.playtimeForever ?? 0 : undefined, beaten: beaten.has(id),
            ...(!steam && d.totalGamerscore > 0 ? { pts: [d.gamerscore ?? 0, d.totalGamerscore] } : {}),
            sheet: !!(d.hasAchievements && d.total > 0),
            // Latest unlock: its name and date from the index, its icon from the preview (which always holds the newest unlocks)
            last: d.lastUnlockedAt ? (() => {
                const pv = (d.preview ?? []).find(a => a.displayName === d.lastUnlockName);
                const icon = pv?.iconUrl ? (steam ? `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/${id}/${pv.iconUrl}` : pv.iconUrl) : null;
                return { name: d.lastUnlockName, icon, at: d.lastUnlockedAt };
            })() : null,
            lastMs: Math.max(ms(d.lastUnlockedAt), ms(d.lastPlayedTs)),
            url: steam ? `https://store.steampowered.com/app/${id}` : `https://www.xbox.com/en-US/Search/Results?q=${encodeURIComponent(d.gameName ?? '')}`,
        };
    }
    return out;
}

const series = read('data/hub/series.json', []) ?? [];
const sources = { ra: raGames(), steam: indexGames('steam'), xbox: indexGames('xbox') };
const out = {
    metadata: { builtAt: new Date().toISOString() },
    series: series.filter(s => s.showProgress !== false).map(s => {
        // Games the platform data doesn't know (sold, hidden, not yet synced) are left out
        const games = s.gameIds.map(key => {
            const [p, id] = key.split(':');
            const g = sources[p]?.[id];
            return g ? { key, p, id, ...g } : null;
        }).filter(Boolean);
        // Cover: the ★ pick (admin), else the game with the most achievements unlocked, else the first
        // game that has achievements (nothing played yet), else the first game
        const mostUnlocked = games.filter(g => g.unlocked > 0).sort((a, b) => b.unlocked - a.unlocked)[0];
        const cover = s.coverGameId ?? mostUnlocked?.key ?? games.find(g => g.total > 0)?.key ?? s.gameIds[0] ?? null;
        // Sub-series (admin): only games that made it into `games`, empty ones dropped
        const known = new Set(games.map(g => g.key));
        const groups = (s.groups ?? []).map(g => ({ id: g.id, name: g.name, keys: g.gameIds.filter(k => known.has(k)) })).filter(g => g.keys.length);
        return { id: s.id, name: s.name, cover, games, ...(groups.length ? { groups } : {}) };
    }),
};
const file = path.join(ROOT, 'data/hub/series-games.json');
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(out) + '\n');
console.log(`series-games.json: ${out.series.length} series, ${out.series.reduce((n, s) => n + s.games.length, 0)} games, ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
