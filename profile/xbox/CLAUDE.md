# Xbox Profile — Page Context

Built from `profile/steam/` and kept structurally parallel to it. When changing shared behavior (Progress views, Completions panel, tabs, Activity tab), check whether the Steam page needs the same change.

## Data Sources
- `../../data/xbox/profile.json` — fetched on mount (profile, stats, recentlyPlayed, perfectGames)
- `../../data/xbox/games/index.json` — fetched when any game tab opens (no `achievements[]`)
- `../../data/xbox/games/{titleId}.json` — lazy-fetched when the achievement modal opens (`handleViewDetails`): the modal opens at once with `loading: true` (skeleton list) and fills in when the file arrives, its height animating (`useAnimatedHeight`), same as Steam
- `../../data/xbox/achievements/1–4.json` — all four fetched when Activity tab opens (the heatmap is built in the browser from these chunks, in the viewer's timezone); the timeline reveals them one at a time (`shownChunks`) via IntersectionObserver
- `../../data/xbox/win-conditions.json` — beaten games (edited in admin → Xbox → Win Conditions)

## Differences from the Steam page
- IDs are `titleId`, not `appId`
- **No playtime** (OpenXBL has none): no Hours stats or sort. Cards and "Most Recently Played" show gamerscore (`earned / total G`) and last played instead
- Achievement icons are **full URLs** in the data (no hash → URL helper); locked icons are the same image with `grayscale`
- **Images follow RA, not Steam** (Steam uses wide art only because it has no square game art): list row icon (44px), tile icon, modal header (64px), Most Recently Played (56px) and Completions use the square box art `iconUrl`; the wide `heroUrl` is the faded row background, the blurred tile background, the blurred modal and profile header background
- Game lists: same list / tiles views as Steam (`GameListRow` / `GameTile`, `useGameView()`), with gamerscore where Steam shows playtime. The modal is the shared sheet (`assets/sheet.js`)
- **Always wrap Xbox image URLs in `xboxImg(url, width)`** (`utils/helpers.js`). Originals are huge (box art up to 2160², achievement art 1920×1080, avatar 1080²); `xboxImg` asks the image server for ~2× the display width. `images-eds` only accepts widths 64/128/150/200/208/300/424 (others return HTTP 400), so it snaps up to one of those. The full Progress tab went from ~120 MB of images to ~5.5 MB
- Completions sidebar shows the **game** box art for Completed and Beaten (Steam shows the last / win-condition achievement art because it lacks square game art)
- Game links go to xbox.com search (`xboxSearchUrl`) — OpenXBL gives no store product ID
- Profile link: `xboxProfileUrl(gamertag)`. No online status
- 100% label is **Completed** (not Perfect); Beaten is silver like everywhere else
- Each achievement shows its gamerscore (`10G`) in the modal and Activity timeline
- **Xbox 360 titles** (`partial: true`): the data only has unlocked achievements, so `withPlaceholders()` adds one "Locked achievement" row per missing achievement (lock icon, no gamerscore/rarity) in the modal and fills the card's 6-icon preview strip. Placeholders are created in the page, not stored in the data files
- Progress sorts (`utils/constants.js`): Completion, Gamerscore, Last Played

## Colors
- Same section scheme as RA and Steam: **blue `#66c0f4`** for general sections (Most Recently Played, User Stats, Activity), links and filter chips; the tab bar's active icon and underline are Xbox green; **gold `#e5b143`** for achievement sections (Recent unlocks, Completions)
- Overview on ≥1024px: User Stats and Completions in the right rail; Recent unlocks adds the `ovUnlocks` rows (gamerscore, icons through `xboxImg`) from chunk 1, as on RA
- Heatmap: same blue ramp as Steam, gold peak
- Xbox green `#52b043` (`XBOX_GREEN`) only marks Xbox: avatar border here; elsewhere the hub card, activity feed border, Activity-page Xbox filter, changelog section
- Status colors: completed gold, beaten silver `#b8c4ce`, in progress blue

## Series
- `data/xbox/series.json` (hand-made in the admin, Xbox → Series; same shape as RA's: `{ id, name, gameIds, showProgress, coverGameId }`, ids are titleIds). The tab only appears when a series has `SERIES_MIN` (3) of its games in `games/index.json`
- `buildSeries()` → cards (`.scard`, the square title icon, hero art behind, `.smooth` = no pixelated scaling) and `SeriesSheet` (gamerscore · achievements · %, latest unlock from the index's `lastUnlockName`, groups In progress · Completed · Beaten · Not started · No achievements). Beaten = the win-condition games (`beatenGames`). Completed games use `CompletedRow` (`.smast` band: `perfectGames[].completedAt` and the final unlock, which is not the rarest). Opening a game sets `seriesBack`; `AchievementModal` then shows `.sheet-back`
- Same code as the Steam page (keep them in step), RA's version in `profile/ra/app.js`
