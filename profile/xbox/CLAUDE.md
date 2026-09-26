# Xbox Profile — Page Context

Built from `profile/steam/` and kept structurally parallel to it. When changing shared behavior (Progress views, Completions panel, floating pill, Activity tab), check whether the Steam page needs the same change.

## Data Sources
- `../../data/xbox/profile.json` — fetched on mount (profile, stats, recentlyPlayed, perfectGames)
- `../../data/xbox/games/index.json` — fetched when any game tab opens (no `achievements[]`)
- `../../data/xbox/games/{titleId}.json` — lazy-fetched when the achievement modal opens (`handleViewDetails`)
- `../../data/xbox/achievements/heatmap.json` + `1.json` — fetched when Activity tab opens; `2–4.json` lazy via IntersectionObserver
- `../../data/xbox/win-conditions.json` — beaten games (edited in admin → Xbox → Win Conditions)

## Differences from the Steam page
- IDs are `titleId`, not `appId`
- **No playtime** (OpenXBL has none): no Hours stats or sort. Cards and "Most Recently Played" show gamerscore (`earned / total G`) and last played instead
- Achievement icons are **full URLs** in the data (no hash → URL helper); locked icons are the same image with `grayscale`
- Card thumbnail/background use `heroUrl` (wide art), falling back to `iconUrl` (620×620 square)
- Game links go to xbox.com search (`xboxSearchUrl`) — OpenXBL gives no store product ID
- Profile link: `xboxProfileUrl(gamertag)`. No online status
- 100% label is **Completed** (not Perfect); Beaten is silver like everywhere else
- Each achievement shows its gamerscore (`10G`) in the modal and Activity timeline
- **Xbox 360 titles** (`partial: true`): only unlocked achievements exist; the modal shows a note and totals come from the title data
- Progress sorts (`utils/constants.js`): Completion, Gamerscore, Last Played

## Colors
- Same section scheme as RA and Steam: **blue `#66c0f4`** for general sections (Most Recently Played, User Stats, Activity), tabs, floating pill, links and filter chips; **gold `#e5b143`** for achievement sections (Most Recently Unlocked, Recent Unlocks, Completions)
- Heatmap: same blue ramp as Steam, gold peak
- Xbox green `#52b043` (`XBOX_GREEN`) only marks Xbox: avatar border here; elsewhere the hub card, activity feed border, Activity-page Xbox filter, changelog section
- Status colors: completed gold, beaten silver `#b8c4ce`, in progress blue
