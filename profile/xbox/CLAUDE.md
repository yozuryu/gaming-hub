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
- **Images follow RA, not Steam** (Steam uses wide art only because it has no square game art): card thumbnail (64/80px), modal header (64px), Most Recently Played (56px) and Completions sidebar tiles use the square box art `iconUrl`; the wide `heroUrl` is only the faded card background
- **Always wrap Xbox image URLs in `xboxImg(url, width)`** (`utils/helpers.js`). Originals are huge (box art up to 2160², achievement art 1920×1080, avatar 1080²); `xboxImg` asks the image server for ~2× the display width. `images-eds` only accepts widths 64/128/150/200/208/300/424 (others return HTTP 400), so it snaps up to one of those. The full Progress tab went from ~120 MB of images to ~5.5 MB
- Completions sidebar shows the **game** box art for Completed and Beaten (Steam shows the last / win-condition achievement art because it lacks square game art)
- Game links go to xbox.com search (`xboxSearchUrl`) — OpenXBL gives no store product ID
- Profile link: `xboxProfileUrl(gamertag)`. No online status
- 100% label is **Completed** (not Perfect); Beaten is silver like everywhere else
- Each achievement shows its gamerscore (`10G`) in the modal and Activity timeline
- **Xbox 360 titles** (`partial: true`): the data only has unlocked achievements, so `withPlaceholders()` adds one "Locked achievement" row per missing achievement (lock icon, no gamerscore/rarity) in the modal and fills the card's 6-icon preview strip. Placeholders are created in the page, not stored in the data files
- Progress sorts (`utils/constants.js`): Completion, Gamerscore, Last Played

## Colors
- Same section scheme as RA and Steam: **blue `#66c0f4`** for general sections (Most Recently Played, User Stats, Activity), tabs, floating pill, links and filter chips; **gold `#e5b143`** for achievement sections (Most Recently Unlocked, Recent Unlocks, Completions)
- Heatmap: same blue ramp as Steam, gold peak
- Xbox green `#52b043` (`XBOX_GREEN`) only marks Xbox: avatar border here; elsewhere the hub card, activity feed border, Activity-page Xbox filter, changelog section
- Status colors: completed gold, beaten silver `#b8c4ce`, in progress blue
