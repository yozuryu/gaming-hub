import { RA_MEDIA } from './constants.js';
import { xboxImg } from './helpers.js';

export const normalizeRA = (a) => ({
    platform: 'ra',
    id: `ra-${a.achievementId}-${a.date}`,
    achievementName: a.title,
    description: a.description || a.title,
    achievementIcon: `${RA_MEDIA}/Badge/${a.badgeName}.png`,
    gameName: a.gameTitle,
    gameId: a.gameId,
    gameIcon: `${RA_MEDIA}${a.gameIcon}`,
    gameUrl: `https://retroachievements.org/game/${a.gameId}`,
    consoleName: a.consoleName,
    unlockedAt: a.date.replace(' ', 'T') + 'Z',
});

// Play sessions from data/{ra,steam}/playtime/{YYYY}.json; `games` is that file's name/icon map
export const normalizeSession = (platform, s, games) => {
    const g = games?.[s.gameId] ?? {};
    const isRA = platform === 'ra';
    return {
        platform,
        id: `${platform}-${s.gameId}-${s.end}`,
        gameId: s.gameId,
        gameName: g.name ?? `#${s.gameId}`,
        gameIcon: g.icon ? (isRA ? `${RA_MEDIA}${g.icon}` : g.icon) : null,
        gameUrl: isRA ? `https://retroachievements.org/game/${s.gameId}` : `https://store.steampowered.com/app/${s.gameId}`,
        startMs: Date.parse(s.start),
        endMs: Date.parse(s.end),
        minutes: s.minutes,
        approx: !!s.approx,
    };
};

export const normalizeSteam = (a) => ({
    platform: 'steam',
    id: `steam-${a.appId}-${a.apiName}`,
    achievementName: a.displayName,
    description: a.description || a.displayName,
    achievementIcon: a.iconUrl,
    gameName: a.gameName,
    gameId: a.appId,
    gameIcon: `https://cdn.akamai.steamstatic.com/steam/apps/${a.appId}/capsule_184x69.jpg`,
    gameUrl: `https://store.steampowered.com/app/${a.appId}`,
    unlockedAt: a.unlockedAt,
});

export const normalizeXbox = (a) => ({
    platform: 'xbox',
    id: `xbox-${a.titleId}-${a.apiName}`,
    achievementName: a.displayName,
    description: a.description || a.displayName,
    achievementIcon: xboxImg(a.iconUrl, 128),
    gameName: a.gameName,
    gameId: a.titleId,
    gameIcon: null,   // filled from data/xbox/games/index.json
    gameUrl: `https://www.xbox.com/en-US/Search/Results?q=${encodeURIComponent(a.gameName ?? '')}`,
    unlockedAt: a.unlockedAt,
});
