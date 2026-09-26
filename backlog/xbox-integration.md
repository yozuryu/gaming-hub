# Xbox integration

**Status:** To do · **Priority:** 1 (ahead of [data-branch-migration.md](data-branch-migration.md))

## Goal

Bring Xbox to the same level as Steam: a data pipeline, a real hub card, an Xbox profile page, and Xbox in the Activity feed, Completions page and hub completions strip.

Today Xbox is only a placeholder: the hub's "coming soon" card (`index.html`, `#card-xbox`), an Xbox entry in `assets/mobile-nav.js`, `assets/icon-xbox.png`, and `platforms.xbox` (`visible: false`, `active: false`) in `data/hub/config.json`.

## Data source: OpenXBL

- [OpenXBL](https://xbl.io/): third-party Xbox Live API. Sign up with the Microsoft account, verify a phone number, copy the API key from the dashboard. Requests send the key in the `X-Authorization` header.
- Free tier: **150 requests/hour** ([source](https://xbl.io/blog/getting-started-xbox-live-api)). Enough for hourly incremental runs; the first full import has to be spread across runs.
- Rejected: the official Xbox Live REST API. It needs a Microsoft user token that rotates, so every run would have to write the new refresh token back into GitHub secrets.
- Endpoints to use (confirm exact paths and response shapes in the [API docs](https://api.xbl.io/docs) before writing the pipeline):
  - Account / profile for the key owner: gamertag, gamerscore, avatar, XUID.
  - Title history / achievement summary per title: title ID, name, current vs total achievements and gamerscore, last played.
  - Per-title achievement list: name, description, icon, gamerscore, unlock state and time, rarity %.

### Known gaps

- **Playtime is unreliable** (minutes played isn't dependably exposed). Hours stats and the Hours sort are hidden or partial for Xbox, not faked.
- **Xbox 360 titles** may lack rarity or unlock timestamps. The UI must treat those fields as optional.
- **No "beaten" concept.** Reuse the Steam win-conditions approach: `data/xbox/win-conditions.json`, edited in the admin.

## Setup (user)

1. Create the OpenXBL account and API key. This needs the Microsoft sign-in and phone number, so it can't be done for you.
2. Add GitHub secrets: `XBOX_API_KEY` (and `XBOX_XUID` if the account endpoint doesn't return it).
3. Add the same to the local `.env` for testing.

First pipeline run in `--debug` mode reports the number of titles with achievements. That answers how big the first import is (unknown today).

## Phase 1: Pipeline

`scripts/xbox-pipeline.js`, modelled on `scripts/steam-pipeline.js`.

- **Output** (`data/xbox/`, same shapes as Steam where possible):
  - `profile.json`: gamertag, avatar, gamerscore, stats (games, achievements, perfect, gamerscore), recently played, pre-computed `perfectGames`.
  - `games/index.json`: all titles without achievement lists (id, name, icon, unlocked/total, gamerscore earned/total, last played, `lastUnlockedAt`, `lastUnlockName`, `preview` icons).
  - `games/{titleId}.json`: full title data with `achievements[]`, lazy-loaded by the profile page.
  - `achievements/1.json`–`4.json`: recent unlocks in 91-day chunks.
  - `achievements/heatmap.json`: `{ "YYYY-MM-DD": { count, gamerscore } }`.
- **Hand-edited:** `data/xbox/win-conditions.json` (starts as `{}`).
- **Incremental:** compare each title's summary (unlocked count, last played) with the cached `games/index.json`; fetch achievement lists only for changed titles.
- **Rate-limit budget:** per run, 1–2 calls for profile + title history, then per-title calls capped (e.g. 120) with a pending queue saved to a pipeline-only cache file, so the first import resumes on the next hourly run. Log remaining quota if the API returns it.
- **Flags:** `--debug`, `--refresh-games` (full), matching the other pipelines.
- **Workflow:** `.github/workflows/fetch-xbox-data.yml`, hourly at `:20` (RA `:00`, Steam `:10`), same `data-pipeline` concurrency group, commits `data/xbox/`.
- `package.json` scripts: `xbox-fetch`, `xbox-fetch:debug`, `xbox-fetch:full`.
- Exclude any pipeline-only cache file from the site in `_config.yml` (like Steam's `sentinel.json`).

## Phase 2: Hub

- Replace the "coming soon" card with a real card following the RA/Steam pattern: header, stats grid, recently played rows, footer link.
- **Stats order:** Gamerscore (gold) → Perfect (gold) → Achievements (blue) → Games (muted) → Played (muted). No Hours unless playtime turns out to be reliable.
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
