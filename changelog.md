# Changelog

## 2026-03-26

### Activity feed

- New combined activity page at `/activity/` — heatmap, platform filter (All / RA / Steam), timeline grouped by day → game session → achievement
- Day headers are collapsible; click any heatmap cell to filter to that day
- Game sessions show platform icon, game icon, console name (RA only), and unlock time range
- Achievement rows show icon, name, description, and unlock time; left border colored by platform (gold = RA, blue = Steam)
- RA game names parsed for subset and tilde tags; subset badge + name rendered inline in session header
- Heatmap colors switch to gold/blue palette based on active platform filter

### Hub

- Recent Activity section added: 8 most recent combined achievements with "View all →" link to `/activity/`
- Activity section toggled by `activity.visible` in `config.json`; hidden by default until config loads (no skeleton flash when disabled)
- Steam horizontal overflow on mobile fixed (`overflow-x: hidden` on `html, body`)

### Pipelines

- RA and Steam workflows now use differentiated commit messages: `update` for incremental, `full refresh` for full game refresh, `unlock refresh` for Steam unlock-only runs

---

## 2026-03-25

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

### RetroAchievements

- Recently played games with 0 earned achievements now always fetched so they appear in the dashboard
- Most Recently Unlocked game name hover color changed to soft white (`#c6d4df`) for clearer feedback
- Sticky topbar and tab bar added

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

### Steam pipeline

- Env var renamed from `STEAM_ID` to `STEAM_USER_ID` to match GitHub Actions workflow secret name

---

## 2026-03-24

- Hub profile data (`username`, `motto`, `tags`, `platforms`) moved to `data/hub/profile.json`; `index.html` renders it dynamically
- Want-to-play list now paginates to fetch all items beyond the 500-item API limit
- `profile.js` refactored: non-JSX code extracted into `utils/constants.js`, `utils/helpers.js`, and `utils/transform.js`
- Stats pills: points shown in gold to improve visual hierarchy
- Activity tab now lazy-loads achievements in 3-month chunks; heatmap stays complete using precomputed data from `profile.json`
- Game title tilde tags (`~Homebrew~`, `~Hack~`, etc.) displayed as badges across dashboard and hub
- Pipeline supports incremental mode (skips cached games) and splits achievement data into quarterly files
- Automated GitHub Actions workflow — fetches data every 3 hours and does a full refresh at midnight, commits results to main
- Scripts reorganized into `scripts/` folder; `package.json` at root with `npm run` commands for all tasks

---

## 2025-03-23 — Initial release

- Hub page with RetroAchievements card; Steam and Xbox coming-soon placeholders
- RA dashboard: Overview, Recent Games, Completion Progress, Activity (heatmap + timeline), Watchlist
- Shimmer skeleton loading, mobile-responsive layout
- ETL pipeline with 1-year achievement fetch, Firebase Firestore sync (disabled)
