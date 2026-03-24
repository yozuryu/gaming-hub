import { getMediaUrl, formatTimeAgo, formatDate, parseTitle } from './helpers.js';

export const transformData = (data) => {
  if (!data) return { profile: null, games: [], backlog: { total: 0, games: [] }, recentAchievements: [] };

  const refTime = data.metadata.extractionTimestamp;
  const refTimeMs = new Date(refTime).getTime();
  const totalUnlocked = data.gameAwardsAndProgress.results.reduce((acc, game) => acc + game.numAwarded, 0);
  const totalHardcoreUnlocked = data.gameAwardsAndProgress.results.reduce((acc, game) => acc + (game.numAwardedHardcore || 0), 0);

  const mostRecentGame = data.mostRecentGame ? {
    id: data.mostRecentGame.gameId,
    title: data.mostRecentGame.title,
    ...parseTitle(data.mostRecentGame.title),
    console: data.mostRecentGame.consoleName,
    icon: getMediaUrl(data.mostRecentGame.imageIcon),
    timeAgo: formatTimeAgo(data.mostRecentGame.lastPlayed, refTime)
  } : null;

  const gameMap = new Map();

  // 1. Seed with Recently Played Games
  if (data.recentlyPlayedGames) {
    data.recentlyPlayedGames.forEach(rg => {
      gameMap.set(rg.gameId, {
        id: rg.gameId,
        title: rg.title,
        ...parseTitle(rg.title),
        console: rg.consoleName,
        progress: 0,
        rawProgress: 0,
        achievementsUnlocked: 0,
        achievementsTotal: 0,
        playtime: "Unknown",
        lastPlayedStr: rg.lastPlayed,
        lastPlayed: formatTimeAgo(rg.lastPlayed, refTime),
        hardcore: false,
        isMastered: false,
        isBeaten: false,
        icon: getMediaUrl(rg.imageIcon),
        background: getMediaUrl(rg.imageIngame || rg.imageTitle || rg.imageIcon),
        totalPlayers: 1,
        achievements: []
      });
    });
  }

  // 2. Overwrite / Merge with Completion Progress
  if (data.gameAwardsAndProgress?.results) {
    data.gameAwardsAndProgress.results.forEach((game) => {
      const existing = gameMap.get(game.gameId) || {
        id: game.gameId,
        title: game.title,
        console: game.consoleName,
        playtime: "Unknown",
        lastPlayedStr: game.mostRecentAwardedDate,
        lastPlayed: formatTimeAgo(game.mostRecentAwardedDate, refTime),
        icon: getMediaUrl(game.imageIcon),
        background: getMediaUrl(game.imageIngame || game.imageTitle || game.imageIcon),
        totalPlayers: 1,
        achievements: []
      };

      const rawProgressRaw = game.maxPossible > 0 ? (game.numAwarded / game.maxPossible) * 100 : 0;

      gameMap.set(game.gameId, {
        ...existing,
        progress: Math.floor(rawProgressRaw),
        rawProgress: rawProgressRaw,
        achievementsUnlocked: game.numAwarded,
        achievementsTotal: game.maxPossible,
        hardcore: game.numAwardedHardcore > 0,
        isMastered: game.numAwarded === game.maxPossible && game.maxPossible > 0,
        isBeaten: game.highestAwardKind === 'beaten-hardcore' || game.highestAwardKind === 'beaten-softcore',
      });
    });
  }

  // 3. Enrich ALL games using Detailed Game Progress
  gameMap.forEach((game, gameId) => {
    const details = data.detailedGameProgress ? data.detailedGameProgress[gameId] : null;
    if (details) {
      if (details.userTotalPlaytime) {
        const totalSeconds = details.userTotalPlaytime;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        game.playtime = `${hours}h ${minutes}m`;
      }

      game.background = getMediaUrl(details.imageIngame || details.imageTitle) || game.background;
      game.totalPlayers = details.numDistinctPlayersCasual || details.numDistinctPlayersHardcore || game.totalPlayers;

      const parsed = parseTitle(game.title);
      game.isSubset = !!details.parentGameId || parsed.isSubset;
      game.baseTitle = parsed.baseTitle;
      game.subsetName = parsed.subsetName;
      game.tags = parsed.tags;

      game.genre = details.genre || null;
      game.developer = details.developer || null;
      game.released = details.released ? details.released.substring(0, 4) : null;

      if (details.achievements && Object.keys(details.achievements).length > 0) {
        const achs = Object.values(details.achievements);
        const maxPossibleFromDetails = achs.length;
        const unlockedFromDetails = achs.filter(a => a.dateEarned).length;

        if (!game.achievementsTotal && maxPossibleFromDetails > 0) {
          game.achievementsTotal = maxPossibleFromDetails;
          game.achievementsUnlocked = unlockedFromDetails;
          game.rawProgress = (game.achievementsUnlocked / game.achievementsTotal) * 100;
          game.progress = Math.floor(game.rawProgress);
        }

        achs.sort((a, b) => {
          const aUnlocked = !!a.dateEarned;
          const bUnlocked = !!b.dateEarned;
          if (aUnlocked && !bUnlocked) return -1;
          if (!aUnlocked && bUnlocked) return 1;
          return a.displayOrder - b.displayOrder;
        });

        game.achievements = achs.map(ach => ({
          id: ach.id,
          title: ach.title,
          description: ach.description,
          points: ach.points,
          trueRatio: ach.trueRatio || ach.points || 0,
          isUnlocked: !!ach.dateEarned,
          isHardcore: !!ach.dateEarnedHardcore,
          unlockDate: ach.dateEarned,
          hardcoreUnlockDate: ach.dateEarnedHardcore,
          badgeName: ach.badgeName,
          type: ach.type,
          numAwardedCasual: ach.numAwarded || 0,
          numAwardedHardcore: ach.numAwardedHardcore || 0
        }));
      }
    }
  });

  const ALL_GAMES = Array.from(gameMap.values());

  // --- Stats Calculations ---
  const retroRatio = data.coreProfile.totalPoints > 0
    ? (data.coreProfile.totalTruePoints / data.coreProfile.totalPoints).toFixed(2)
    : "0.00";

  const beatenGamesCount = data.pageAwards.visibleUserAwards.filter(a => a.awardType === "Game Beaten" || a.awardType === "Game Mastered").length;

  const startedGames = ALL_GAMES.filter(g => g.achievementsUnlocked > 0 && g.achievementsTotal > 0);
  const startedGamesCount = startedGames.length;

  const avgCompletion = startedGamesCount > 0
    ? (startedGames.reduce((acc, g) => acc + g.rawProgress, 0) / startedGamesCount).toFixed(2) + "%"
    : "0.00%";

  const startedGamesBeatenPct = startedGamesCount > 0
    ? ((beatenGamesCount / startedGamesCount) * 100).toFixed(2) + "%"
    : "0.00%";

  let points7Days  = data.points7Days  ?? 0;
  let points30Days = data.points30Days ?? 0;

  if (!data.points7Days && Array.isArray(data.recentAchievements)) {
    const sevenDaysMs  = 7  * 24 * 60 * 60 * 1000;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    data.recentAchievements.forEach(ach => {
      const achDate = new Date(ach.Date || ach.dateEarned || ach.date || 0).getTime();
      const pts = ach.Points || ach.points || 0;
      if (refTimeMs - achDate <= thirtyDaysMs) {
        points30Days += pts;
        if (refTimeMs - achDate <= sevenDaysMs) points7Days += pts;
      }
    });
  }

  const memberSinceMs = new Date(data.coreProfile.memberSince).getTime();
  const weeksSince = Math.max(1, (refTimeMs - memberSinceMs) / (7 * 24 * 60 * 60 * 1000));
  const avgPointsPerWeek = Math.round(data.coreProfile.totalPoints / weeksSince);

  return {
    profile: {
      username: data.coreProfile.user,
      bio: data.coreProfile.motto,
      richPresenceMsg: data.coreProfile.richPresenceMsg,
      status: data.userSummary?.status || null,
      rank: data.userSummary?.rank || "N/A",
      totalPoints: data.coreProfile.totalPoints,
      totalUnlocked: totalUnlocked,
      topPercentage: data.userSummary?.rank && data.userSummary?.totalRanked
        ? `${((data.userSummary.rank / data.userSummary.totalRanked) * 100).toFixed(1)}%`
        : "--%",
      lastActivity: data.userSummary?.lastActivity?.timestamp
        ? formatTimeAgo(data.userSummary.lastActivity.timestamp, refTime)
        : data.recentlyPlayedGames?.[0]?.lastPlayed
        ? formatTimeAgo(data.recentlyPlayedGames[0].lastPlayed, refTime)
        : 'Unknown',
      memberSince: formatDate(data.coreProfile.memberSince),
      avatar: getMediaUrl(data.coreProfile.userPic),
      mostRecentGame: mostRecentGame,
      mostRecentAchievement: (() => {
        if (!data.mostRecentAchievement) return null;
        const ach = data.mostRecentAchievement;
        return {
          id: ach.achievementId,
          title: ach.title,
          description: ach.description,
          points: ach.points,
          trueRatio: ach.trueRatio,
          badgeName: ach.badgeName,
          hardcoreMode: ach.hardcoreMode,
          gameTitle: ach.gameTitle,
          gameId: ach.gameId,
          gameIcon: getMediaUrl(ach.gameIcon),
          consoleName: ach.consoleName,
          timeAgo: formatTimeAgo(ach.date, refTime),
          date: ach.date,
        };
      })(),

      statsLeft: [
        { label: "Points", value: `${data.coreProfile.totalPoints.toLocaleString()} (${data.coreProfile.totalTruePoints.toLocaleString()})` },
        { label: "Site rank", value: `#${data.userSummary?.rank?.toLocaleString() || 'N/A'} of ${data.userSummary?.totalRanked?.toLocaleString() || 'N/A'}` },
        { label: "Achievements unlocked", value: totalUnlocked.toLocaleString() },
        { label: "RetroRatio", value: retroRatio },
        { label: "Points earned in the last 7 days", value: points7Days.toLocaleString() },
        { label: "Points earned in the last 30 days", value: points30Days.toLocaleString() },
        { label: "Average points per week", value: avgPointsPerWeek.toLocaleString() }
      ],
      statsRight: [
        { label: "Points (softcore)", value: data.coreProfile.totalSoftcorePoints.toLocaleString() },
        { label: "Softcore rank", value: data.userSummary?.softcoreRank ? `#${data.userSummary.softcoreRank.toLocaleString()}` : "requires 250 points" },
        { label: "Achievements unlocked (softcore)", value: (totalUnlocked - totalHardcoreUnlocked).toLocaleString() },
        { label: "Started games beaten", value: startedGamesBeatenPct },
        { label: "Total games beaten", value: beatenGamesCount.toString() },
        { label: "Average completion", value: avgCompletion }
      ],

      siteAwards: data.pageAwards.visibleUserAwards
        .filter(a => a.awardType !== "Game Beaten" && a.awardType !== "Game Mastered")
        .map((a, i) => {
          let iconUrl = getMediaUrl(a.imageIcon);
          if (a.awardType && a.awardType.toLowerCase().includes('patreon')) {
            iconUrl = "https://static.retroachievements.org/assets/images/badge/patreon.png";
          }
          return { id: i, title: a.awardType, icon: iconUrl };
        }),
      gameAwards: data.pageAwards.visibleUserAwards
        .filter(a => a.awardType === "Game Beaten" || a.awardType === "Game Mastered")
        .map((a, i) => ({
          id: i,
          title: a.title || "Unknown Game",
          type: a.awardType,
          console: a.consoleName || "Unknown Console",
          date: formatDate(a.awardedAt),
          icon: getMediaUrl(a.imageIcon)
        }))
    },
    games: ALL_GAMES,
    recentAchievements: Array.isArray(data.recentAchievements)
      ? [...data.recentAchievements].sort((a, b) => new Date(b.date) - new Date(a.date))
      : [],
    backlog: {
      total: data.wantToPlayList?.total || 0,
      games: (data.wantToPlayList?.results || []).map(g => {
        const progressEntry = data.gameAwardsAndProgress?.results?.find(p => p.gameId === g.id);
        const detailEntry = data.detailedGameProgress?.[g.id];
        const numAwarded = progressEntry?.numAwarded ?? detailEntry?.numAwardedToUser ?? 0;
        const totalPlayers = detailEntry?.numDistinctPlayersCasual ?? null;
        return {
          id: g.id,
          title: g.title,
          ...parseTitle(g.title),
          console: g.consoleName,
          icon: getMediaUrl(g.imageIcon),
          pointsTotal: g.pointsTotal || 0,
          achievementsTotal: g.achievementsPublished || 0,
          numAwarded,
          inProgress: numAwarded > 0,
          totalPlayers,
        };
      }).sort((a, b) => (a.baseTitle || a.title).localeCompare(b.baseTitle || b.title))
    }
  };
};
