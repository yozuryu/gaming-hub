# Xbox integration

**Status:** To do · **Priority:** 2 (after the urgent fixes in [pipeline-improvements.md](pipeline-improvements.md), ahead of [data-branch-migration.md](data-branch-migration.md)). Build the pipeline on Part A's HTTP helper (status checks, retries).

## Goal

Bring Xbox to the same level as Steam: a data pipeline, a real hub card, an Xbox profile page, and Xbox in the Activity feed, Completions page and hub completions strip.

Today Xbox is only a placeholder: the hub's "coming soon" card (`index.html`, `#card-xbox`), an Xbox entry in `assets/mobile-nav.js`, `assets/icon-xbox.png`, and `platforms.xbox` (`visible: false`, `active: false`) in `data/hub/config.json`.

## Data source: OpenXBL

- [OpenXBL](https://xbl.io/): third-party Xbox Live API. Sign up with the Microsoft account, verify a phone number, copy the API key from the dashboard. Requests send the key in the `X-Authorization` header.
- Free tier: **150 requests/hour** ([source](https://xbl.io/blog/getting-started-xbox-live-api)). Responses carry `x-ratelimit-limit`, `x-ratelimit-remaining` and `x-ratelimit-spent` headers.
- Rejected: the official Xbox Live REST API. It needs a Microsoft user token that rotates, so every run would have to write the new refresh token back into GitHub secrets.

### Verified endpoints (tested 2026-09-26)

Base `https://xbl.io/api/v2`. Every request sends `X-Authorization: <key>`, `Accept: application/json` and **`Accept-Language: en-US`**.

| Endpoint | Returns |
|---|---|
| `GET /account` | `content.profileUsers[0]`: `id` (XUID, 16 digits) and `settings[]` as `{ id, value }`: `Gamertag`, `Gamerscore`, `GameDisplayPicRaw` (avatar), `AccountTier`, `Bio`, `Location`, … |
| `GET /achievements` | `content.titles[]` for the key owner: `titleId`, `name`, `devices[]` (`PC`, `XboxOne`, `XboxSeries`, `Xbox360`), `displayImage`, `achievement { currentAchievements, totalAchievements, currentGamerscore, totalGamerscore, progressPercentage }`, `titleHistory.lastTimePlayed`, `stats` (always `null`), `gamePass`, `images`. All 87 titles in one response (no paging seen). |
| `GET /achievements/player/{xuid}/{titleId}` | Modern titles: `achievements[]` with `id`, `name`, `description`, `lockedDescription`, `isSecret`, `progressState` (`Achieved` / `NotStarted` / …), `progression.timeUnlocked`, `mediaAssets[]` (icon URL), `rewards[]` (`type: "Gamerscore"`, `value` as a string), `rarity { currentCategory, currentPercentage }`. Returns every achievement, locked or not. Returns an empty list for Xbox 360 titles. |
| `GET /achievements/x360/{xuid}/title/{titleId}` | Xbox 360 titles: `achievements[]` with `id`, `name`, `description`, `lockedDescription`, `unlocked`, `timeUnlocked`, `gamerscore` (number), `isSecret`, `imageId`, `rarity`. **Only unlocked achievements** (Lost Odyssey: 1 returned, 42 total). |

### Response gotchas

- **Errors come back as HTTP 200.** The body is `{ content, code }`; on failure `code` is the real status (e.g. `400`) and `content` is a JSON string of messages. Without `Accept-Language`, `/achievements` returned HTTP 200 with `code: 400` and "invalid locale value: *". The pipeline must check `code`, not just the HTTP status, or it will write empty data as if you had no games.
- **`content` may be an object or a JSON-encoded string.** Parse it when it's a string.
- **`totalAchievements` in the title list is unreliable:** 39 of 87 titles report `0` while having a nonzero `totalGamerscore`. Take achievement totals from each title's achievement list; `currentGamerscore` / `totalGamerscore` from the title list are correct (they sum to the profile's 8,031).
- **Modern and 360 achievements have different shapes** (`progressState` vs `unlocked`, `rewards[]` string vs `gamerscore` number, `mediaAssets` vs `imageId`). Normalize both into one shape in the pipeline.

### Library size (2026-09-26)

- Gamertag **Yozuryu**, gamerscore **8,031**.
- **87 titles**, 83 with achievements, 40 started, 0 at 100%.
- Devices: 83 Xbox Series, 67 Xbox One, 34 PC, 11 Xbox 360 (3 started); titles can count on several.
- **The full import fits in one run:** 1 (account) + 1 (title list) + 83 (achievement lists) ≈ 85 calls, under the 150/hour limit.

### Known gaps

- **No playtime.** `stats` is `null` for every title. Hours stats and the Hours sort are not shown for Xbox, not faked.
- **Xbox 360 titles list only unlocked achievements.** Progress bars still work from the title list totals, but a 360 game's page can only show what's been unlocked, with a note that locked achievements aren't available.
- **No "beaten" concept.** Reuse the Steam win-conditions approach: `data/xbox/win-conditions.json`, edited in the admin.

## Setup (user)

1. ~~Create the OpenXBL account and API key.~~ Done; `XBOX_API_KEY` is in the local `.env`.
2. Add the GitHub secret `XBOX_API_KEY`.
3. `XBOX_XUID` is not needed: the pipeline reads the XUID from `GET /account`. The `XBOX_XUID` in `.env` is 9 digits, not the real 16-digit XUID; remove it or correct it.

## Phase 1: Pipeline — done 2026-09-26

Built as `scripts/xbox-pipeline.js` + `.github/workflows/fetch-xbox-data.yml` (see root `CLAUDE.md` → Xbox Pipeline). Differences from the plan below: **no sentinel or pipeline-only cache file** (the title list reports titles without achievements on every run, for free); change detection uses a `syncKey` stored in `games/index.json`; cron is `:27` hourly and `00:27` full refresh; chunk boundaries anchored at UTC midnight and unchanged files not rewritten (Part B patterns from day one).

Original plan:

- **Output** (`data/xbox/`, same shapes as Steam where possible):
  - `profile.json`: gamertag, avatar, gamerscore, stats (games, achievements, perfect, gamerscore), recently played, pre-computed `perfectGames`.
  - `games/index.json`: all titles without achievement lists (id, name, icon, unlocked/total, gamerscore earned/total, last played, `lastUnlockedAt`, `lastUnlockName`, `preview` icons).
  - `games/{titleId}.json`: full title data with `achievements[]`, lazy-loaded by the profile page.
  - `achievements/1.json`–`4.json`: recent unlocks in 91-day chunks.
  - `achievements/heatmap.json`: `{ "YYYY-MM-DD": { count, gamerscore } }`.
- **Hand-edited:** `data/xbox/win-conditions.json` (starts as `{}`).
- **Incremental:** compare each title's `currentAchievements`, `currentGamerscore` and `lastTimePlayed` with the cached `games/index.json`; fetch achievement lists only for changed titles. Pick the endpoint by device: `/achievements/x360/...` when `devices` is only `Xbox360`, otherwise `/achievements/player/...`.
- **Rate-limit budget:** 2 calls (account + title list) plus one per changed title. The full import is ~85 calls, so no resume queue is needed today. Keep a safety cap (e.g. 130 per run) and log `x-ratelimit-remaining`; if the library grows past the cap, the remaining titles are picked up next run because their cache is still stale.
- **Rarity refresh:** follow the pipeline-improvements Part B pattern: refresh rarity for all titles once a day, not every hour, to avoid committing rarity drift.
- **Flags:** `--debug`, `--refresh-games` (full), matching the other pipelines.
- **Workflow:** `.github/workflows/fetch-xbox-data.yml`, hourly at `:20` (RA `:00`, Steam `:10`), same `data-pipeline` concurrency group, commits `data/xbox/`.
- `package.json` scripts: `xbox-fetch`, `xbox-fetch:debug`, `xbox-fetch:full`.
- Exclude any pipeline-only cache file from the site in `_config.yml` (like Steam's `sentinel.json`).

## Phase 2: Hub

- Replace the "coming soon" card with a real card following the RA/Steam pattern: header, stats grid, recently played rows, footer link.
- **Stats order:** Gamerscore (gold) → Perfect (gold) → Achievements (blue) → Games (muted) → Played (muted). No Hours (playtime isn't available).
- Set `platforms.xbox.visible` / `active` to `true` in `data/hub/config.json` once data exists. The mobile nav's Profile popup already reads this.
- Add Xbox to the hub's Recent Activity feed and completions strip.

## Phase 3: Xbox profile page

- `profile/xbox/` (`index.html`, `app.js`, `utils/`), built from `profile/steam/`.
- Tabs: Recent Games · Completion Progress · Activity.
- Reuse: game card, achievement modal (lazy-load `games/{titleId}.json`), rarity colors, sidebar Completions panel (2 rows + Show all, silver border for beaten), `ProgressFilterBar` + `applyProgressView()` views (All / Nearly there / In progress / Abandoned), floating tab pill, scroll-to-top.
- Page conventions: `page-topbar`, header `pt-8 pb-5 md:pt-5`, `viewport-fit=cover`, SW registration, `mobile-nav.js`, shimmer skeletons, `html, body { overflow-x: clip }`.
- Add `profile/xbox/CLAUDE.md` and list it in `_config.yml` `exclude`.
- Add the new page files to `sw.js` `PRECACHE` and bump `CACHE_NAME`.

## Phase 4: Cross-platform pages and admin

- **Activity page:** Xbox as a third platform (normalizer, filter, heatmap).
- **Completions page:** Xbox Perfect (gold) and Beaten (silver, from win conditions); platform filter gains Xbox; `dedupeCompletions()` already keys by `platform-gameId`.
- **Admin:** Win Conditions module supports Xbox; add `data/xbox/win-conditions.json` and `data/xbox/games/index.json` to the admin server allowlist.
- Update root `CLAUDE.md` (directory structure, pipelines, hub stats, design system) and the changelog.

## Decisions to make before building

- **Xbox accent color** for section headers and the platform badge. Xbox green (`#107c10`) is too dark on `#171a21`; a lighter green such as `#52b043` reads better. Confirm, or keep the site's blue.
- **"Perfect" vs "Completed"** as the Xbox label for 100% (Steam uses Perfect, RA uses Mastered; the Completions page merges them as Completed).

## Interaction with the data-branch migration

Xbox lands first, so its workflow commits `data/xbox/` to `main` like RA and Steam do today (adds ~24 commits a day until the migration). When the migration runs, `data/xbox/` generated files move to the `data` branch with the rest; `data/xbox/win-conditions.json` stays on `main`. The migration plan's file split and deploy exclusions must include Xbox.
