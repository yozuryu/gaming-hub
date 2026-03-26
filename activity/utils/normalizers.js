import { RA_MEDIA } from './constants.js';

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
