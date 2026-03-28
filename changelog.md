# Changelog

## 2026-03-28

RA bug fixes; lazy loading across all activity pages; Steam progress hides perfect games by default; tilde tag and subset parsing extended site-wide; game card playtime row redesigned with clock icon and dot separator.

### RetroAchievements

- `RAchievementModal` HC/SC progress bars now show correct percentages — `numDistinctPlayersCasual` and `numDistinctPlayersHardcore` were mistakenly stripped by the pipeline; restored and re-fetched via `--refresh-games` full refresh; `totalPlayersHC` added as a separate denominator for the HC bar; bars hidden when player data is unavailable
- HC/SC labels replaced with `Flame`/`Feather` icons colored to match their respective bar fills (`#ff6b6b` HC, `#546270` SC); label row constrained to `max-w-[180px]` matching the bar so SC aligns to the right edge
- `mostRecentAchievement` now runs through `parseTitle()` — game name in the Overview card renders `baseTitle` and tilde tag badges instead of raw title
- All RA date strings (`"YYYY-MM-DD HH:MM:SS"` UTC) are now normalized to ISO UTC before `new Date()` parsing, fixing a 7-hour timezone offset for UTC+7 users; applied to both `formatTimeAgo` and `formatDate`
- Game awards popup (Completion Progress hover) now parses tilde tags and subset names via `parseTitle()` — renders `baseTitle` with inline tilde tag badges, or a `Subset` badge with the subset name as a subline
- Game card playtime row replaced with clock icon + playtime · Last Played value, matching Steam's layout; "Last Played" label capitalized on both RA and Steam game cards

### Steam

- Completion Progress tab hides perfect games (100%) by default; "Show Perfect" checkbox in the toolbar toggles them back in

### Activity

- Combined activity (`/activity/`) heatmap now uses precomputed `heatmap.json` from both platforms merged by day — complete data from mount regardless of loaded chunks
- All three activity pages (RA, Steam, combined) now use `IntersectionObserver` scroll sentinel for lazy loading — next chunk auto-loads when scrolled within 300px of the bottom, replacing the manual "Load more" button on Steam and the silent background streaming on the combined page
- Clicking a heatmap day that isn't in the loaded data auto-loads chunks until the day's achievements are available — implemented on Steam Activity tab and combined activity page (RA already had this)

### Hub

- Activity feed rows now show achievement description between the achievement name and the game line (falls back to achievement name if empty); platform-specific badges (points, rarity) removed in favour of a universal unlock time shown right-aligned on the game row
- Game name color changed to `#66c0f4` (blue) with hover-to-white; subset/tilde tag badges moved inline on the game name row
- Row separator border moved from Tailwind arbitrary-value class to inline style — Tailwind CDN does not reliably process arbitrary classes on dynamically injected HTML

### Completions

- Hub breadcrumb links (`../../`) corrected to `../` — one level deep from root; was breaking on non-root domain deployments
- Completions page (`/completions/`) now parses tilde tags and subset names — `CompletionCard` renders `baseTitle` with inline tilde tag badges or a `Subset` badge + subset name subline
- Hub completions strip parses the latest RA completion title and renders `baseTitle` + badges + subset subline; shared `_parseTitle`/`_tildeBadgesHtml`/`_BADGE_BASE` helpers moved to script scope so they're accessible outside `loadHubProfile`

### Activity

- RA activity tab session headers now render tilde tag badges inline alongside the game name
- Combined activity (`/activity/`) session headers now render tilde tag badges — `parseTitle` in `activity/utils/helpers.js` was discarding tags instead of collecting them; fixed to capture tags and return them alongside `baseTitle`/`isSubset`/`subsetName`; `TILDE_TAG_COLORS` added to `activity/utils/constants.js`

## 2026-03-27

Achievement detail modals for RA and Steam; achievement preview strips on game cards; completions page with hub strip; activity shimmer loading; data restructured with sharded achievement chunks and ~2.4MB pipeline savings.

### Completions

- New `/completions/` page listing all perfect (Steam) and mastered/beaten (RA) games grouped by month under collapsible year headers
- Current year expanded by default; past years collapsed
- Two-level hierarchy: year (bold, lighter) → months (indented with left border, muted) → cards
- Platform filter (All / RA / Steam) and "Also show beaten games" checkbox (default unchecked)
- Mastered and completed unified under single "Mastered" type; HC marker removed from beaten badge
- Each card shows game icon, name, type badge (Mastered / Beaten / Perfect), platform icon, console or last achievement name + rarity subline, and playtime / date
- Shimmer skeleton loading state mirrors year header → month header → card layout
- Linked from hub via completions strip

### Hub

- Completions strip added between platform grid and activity section: `★ Completions | N total · X Perfect · Y Mastered · Z Beaten | [icon] latest game ★ TYPE · time ago | View all →`
- Latest completion shows game icon, name, uppercase type badge, and time ago
- Mobile view simplified to `★ Completions | N total | View all →` — breakdown and latest hidden
- Strip visibility controlled by `completions.visible` in `config.json` (defaults to visible)
- Completions link removed from footer (replaced by strip)

### Activity

- Shimmer skeleton loading state added — heatmap grid, filter bar, day headers, session rows, and achievement rows all shimmer while data loads (previously just showed `Loading…`)

### Pipelines

- RA `games.json` strips unused fields before writing — removes `richPresencePatch`, `imageBoxArt`, `forumTopicId`, `flags`, `isFinal`, `releasedAtGranularity`, `numDistinctPlayers*`, `userCompletion*` from game objects and `memAddr`, `authorUlid`, `dateCreated`, `dateModified`, `author` from achievement objects (~1MB saved); `imageIngame` and `imageTitle` were mistakenly stripped in a prior run (causing game card backgrounds to show icons instead of screenshots) — restored to pipeline output
- Steam achievement icon URLs stored as filename hash only in `games.json` instead of full CDN URLs (~1.4MB saved); `achIconUrl(appId, hash)` helper in `helpers.js` reconstructs full URLs at render time; `achievements.json` and `profile.json` continue to store full URLs
- `appId` now embedded in each Steam achievement progress object so the Activity tab can reconstruct icon URLs without a separate lookup

### Structure

- RA data directory renamed `data/retroachievements/` → `data/ra/`
- RA achievement chunk files moved from `data/ra/achievements_N.json` → `data/ra/achievements/N.json`
- `activityHeatmap` extracted from `profile.json` into `data/ra/achievements/heatmap.json`; frontend fetches it separately when the Activity tab opens
- Steam achievements split into quarterly chunks at `data/steam/achievements/N.json` mirroring RA structure; `data/steam/achievements/heatmap.json` added with precomputed day→count map
- `mostRecentUnlock` moved from `achievements.json` into `profile.json` so it's available on mount without loading any chunk
- Steam `ActivityTab` now receives `heatmapData` as a prop (precomputed) instead of deriving it client-side from loaded achievements; chunks lazy-loaded when Activity tab opens
- Steam profile Activity tab now loads one chunk at a time via `loadNextChunk` (matching RA pattern) with a "Load more" button and shimmer skeleton; previously loaded all 4 chunks at once
- Combined activity page (`/activity/`) loads chunk 1 of both RA and Steam first for fast initial render, then streams chunks 2–4 in the background; previously loaded all 8 chunks concurrently on mount

### RetroAchievements

- `RAchievementModal` header now shows subset name as a subtext line (e.g. `Sonic the Hedgehog [Subset - Bonus]`) matching the `GameCard` display
- `GameCard` now shows a preview strip of up to 6 achievement badge icons (unlocked first) with hover tooltips showing name, description, points, and HC badge; clicking opens the detail modal
- `RAchievementModal`: full-screen achievement detail modal with game header (icon, console, status, progress bars), optional genre/developer/released meta row, Status (All/Unlocked/Locked) and Type (All/Progression/Missable) filter rows, and per-achievement rarity ratio badge (UR/VR/R/UC), type icons (Progression/Win Condition/Missable), HC/SC completion bars, and unlock date
- Modal popovers (rarity badge, type icons) use `position: fixed` + `getBoundingClientRect` — escapes the scroll container so tooltips are never clipped regardless of scroll position
- Progress percentage labels on `GameCard` now have text shadow to match Steam

### Steam

- `SteamGameCard` now shows the same achievement preview strip with hover tooltips showing name, description, and rarity gem + label + %; clicking opens the detail modal
- `AchievementModal`: achievement detail modal with game header image, progress bar, Status filter, and per-achievement rarity bar + gem + label + % and unlock date

---

## 2026-03-26

Combined activity feed launched at `/activity/`, hub gets a recent activity snippet, project restructured under `/profile/` and renamed to `gaming-hub`. Changelog page added.

### Hub

- Recent Activity section added: 8 most recent combined achievements with "View all →" link to `/activity/`
- Activity section toggled by `activity.visible` in `config.json`; hidden by default until config loads (no skeleton flash when disabled)
- Hub activity `timeAgo` now shows minute/hour granularity (`5m ago`, `2h ago`) instead of day-only (`today`)
- Steam horizontal overflow on mobile fixed (`overflow-x: hidden` on `html, body`)

### Hub Activity

- New combined activity page at `/activity/` — heatmap, platform filter (All / RA / Steam), timeline grouped by day → game session → achievement
- Day headers are collapsible; click any heatmap cell to filter to that day
- Game sessions show platform icon, game icon, console name (RA only), and unlock time range
- Achievement rows show icon, name, description, and unlock time; left border colored by platform (gold = RA, blue = Steam)
- RA game names parsed for subset and tilde tags; subset badge + name rendered inline in session header
- Heatmap colors switch to gold/blue palette based on active platform filter

### Structure

- Platform profiles moved under `/profile/` — RA at `/profile/ra/`, Steam at `/profile/steam/`
- `/profile/index.html` added as an instant redirect to hub (prevents directory listing)
- `profile.js` renamed to `app.js` across all pages for consistency
- Steam `app.js` split into `utils/constants.js` (`STEAM_STATUS`, `PROGRESS_SORTS`) and `utils/helpers.js` (formatting, URL, and rarity helpers)
- Activity `app.js` split into `utils/constants.js`, `utils/helpers.js`, and `utils/normalizers.js` (`normalizeRA`, `normalizeSteam`)
- Repo and app renamed from `gaming-profile` to `gaming-hub`; all "Gaming Profile" references updated to "Gaming Hub"
- Changelog page added at `/changelog/` — fetches and parses `changelog.md`, renders releases with collapsible sections, platform color coding, and per-release summaries
- Changelog linked from hub footer

### Pipelines

- RA and Steam workflows now use differentiated commit messages: `update` for incremental, `full refresh` for full game refresh, `unlock refresh` for Steam unlock-only runs

---

## 2026-03-25

Steam profile fully built out with achievement rarity system and pipeline automation; hub overhauled with dynamic config and per-platform visibility controls.

### Hub

- Sticky topbar added
- `data/hub/profile.json` renamed to `data/hub/config.json`
- Per-platform config with `visible` and `active` flags; active/coming soon counts derived dynamically
- Active/coming soon text hidden when count is 0
- Cards with `visible: false` are hidden; grid recenters for fewer than 3 visible platforms
- Header subtitle size bumped from 9px to 11px
- Back-to-top button added (same as RA page)
- Recently played row spacing improved; rows use `flex:1` to fill card height evenly on both RA and Steam cards
- Row text gap added (2px) between title and sub lines

### RetroAchievements

- Recently played games with 0 earned achievements now always fetched so they appear in the dashboard
- Most Recently Unlocked game name hover color changed to soft white (`#c6d4df`) for clearer feedback
- Sticky topbar and tab bar added

### Steam

- Achievement rarity system: Very Rare (<10%), Rare (<10–30%), Common (≥30%) with gold/blue/gray color coding via left border, title color, and gem icon
- Global achievement % fetched per game via `GetGlobalAchievementPercentagesForApp` API; stored as `globalPct` on each achievement
- Most Recently Unlocked card: 4-line layout (name, description with fallback, rarity, game+time); game name links to store page
- Most Recently Played card: latest achievement row added; consistent row spacing
- Activity tab: rarity gem icon + label + % shown per achievement; game name links to store page
- Game card: removed "Latest:" label; library portrait (`library_600x900.jpg`) used as card background with correct mask fade; portrait fallback to `header.jpg`
- Achievement expanded view: "Global: X%" replaced with rarity gem + label + %; locked achievement bar uses neutral color
- Completion tab: tiebreaker sort by last achievement unlocked date when pct is equal
- Perfect games sidebar: sorted by rarity ascending; shows rarity label + % with gem icon; available on all tabs (moved to `profile.json`)
- `sentinel-cache.json` separated from `games.json` — pipeline-only, not loaded by frontend
- Zero-unlock recently played games now cached with full locked achievement list
- `recentAchievements` entries include `globalPct` for Activity tab rarity display
- Sticky topbar and tab bar added
- Fixed inverted `mask-fade` CSS in `steam/index.html` (was fading wrong direction)
- GitHub Actions workflow added (`fetch-steam-data.yml`): incremental every 3h at :10, unlock refresh at midnight :10
- Env var renamed from `STEAM_ID` to `STEAM_USER_ID` to match GitHub Actions workflow secret name

---

## 2026-03-24

Hub rendered dynamically from config file; RA dashboard improvements including lazy-loaded activity, tilde tag badges, and refactored utils; automated data pipeline introduced.

### Hub

- Hub profile data (`username`, `motto`, `tags`, `platforms`) moved to `data/hub/config.json`; `index.html` renders it dynamically

### RetroAchievements

- Want-to-play list now paginates to fetch all items beyond the 500-item API limit
- `app.js` refactored: non-JSX code extracted into `utils/constants.js`, `utils/helpers.js`, and `utils/transform.js`
- Stats pills: points shown in gold to improve visual hierarchy
- Activity tab now lazy-loads achievements in 3-month chunks; heatmap stays complete using precomputed data from `profile.json`
- Game title tilde tags (`~Homebrew~`, `~Hack~`, etc.) displayed as badges across dashboard and hub

### Structure

- Pipeline supports incremental mode (skips cached games) and splits achievement data into quarterly files
- Automated GitHub Actions workflow — fetches data every 3 hours and does a full refresh at midnight, commits results to main
- Scripts reorganized into `scripts/` folder; `package.json` at root with `npm run` commands for all tasks

---

## 2025-03-23 — Initial release

First release — hub page with RA card, full RA dashboard with heatmap and timeline, and ETL pipeline for data fetching.

### Hub

- Hub page with RetroAchievements card; Steam and Xbox coming-soon placeholders

### RetroAchievements

- RA dashboard: Overview, Recent Games, Completion Progress, Activity (heatmap + timeline), Watchlist
- Shimmer skeleton loading, mobile-responsive layout

### Structure

- ETL pipeline with 1-year achievement fetch, Firebase Firestore sync (disabled)
