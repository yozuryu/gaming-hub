# Changelog

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

---

## 2026-03-24

- Hub profile data (`username`, `motto`, `tags`, `platforms`) moved to `data/hub/profile.json`; `index.html` renders it dynamically ([`783acdd`](https://github.com/yozuryu/gaming-profile/commit/783acdda26d2cfd0842d22be9042d5848a1aeb86))
- Want-to-play list now paginates to fetch all items beyond the 500-item API limit ([`783acdd`](https://github.com/yozuryu/gaming-profile/commit/783acdda26d2cfd0842d22be9042d5848a1aeb86))
- `profile.js` refactored: non-JSX code extracted into `utils/constants.js`, `utils/helpers.js`, and `utils/transform.js` ([`783acdd`](https://github.com/yozuryu/gaming-profile/commit/783acdda26d2cfd0842d22be9042d5848a1aeb86))
- Stats pills: points shown in gold to improve visual hierarchy ([`783acdd`](https://github.com/yozuryu/gaming-profile/commit/783acdda26d2cfd0842d22be9042d5848a1aeb86))
- Activity tab now lazy-loads achievements in 3-month chunks; heatmap stays complete using precomputed data from `profile.json` ([`425a2a2`](https://github.com/yozuryu/gaming-profile/commit/425a2a29d314684ffa1d49c42158a0fa436efbea))
- Game title tilde tags (`~Homebrew~`, `~Hack~`, etc.) displayed as badges across dashboard and hub ([`425a2a2`](https://github.com/yozuryu/gaming-profile/commit/425a2a29d314684ffa1d49c42158a0fa436efbea))
- Pipeline supports incremental mode (skips cached games) and splits achievement data into quarterly files ([`425a2a2`](https://github.com/yozuryu/gaming-profile/commit/425a2a29d314684ffa1d49c42158a0fa436efbea))
- Automated GitHub Actions workflow — fetches data every 3 hours and does a full refresh at midnight, commits results to main ([`e68d4c5`](https://github.com/yozuryu/gaming-profile/commit/e68d4c5a1e495c87ccb8ea40654fbe63e39dac25))
- Scripts reorganized into `scripts/` folder; `package.json` at root with `npm run` commands for all tasks ([`e68d4c5`](https://github.com/yozuryu/gaming-profile/commit/e68d4c5a1e495c87ccb8ea40654fbe63e39dac25))

---

## 2025-03-23 — Initial release

- Hub page with RetroAchievements card; Steam and Xbox coming-soon placeholders ([`914acb1`](https://github.com/yozuryu/gaming-profile/commit/914acb12c813616eaf7c6bd6f4dc5911b879201f))
- RA dashboard: Overview, Recent Games, Completion Progress, Activity (heatmap + timeline), Watchlist ([`914acb1`](https://github.com/yozuryu/gaming-profile/commit/914acb12c813616eaf7c6bd6f4dc5911b879201f))
- Shimmer skeleton loading, mobile-responsive layout ([`4b72bbe`](https://github.com/yozuryu/gaming-profile/commit/4b72bbe0556ce6a50f0a160f6f47e6caa137dd8c))
- ETL pipeline with 1-year achievement fetch, Firebase Firestore sync (disabled) ([`914acb1`](https://github.com/yozuryu/gaming-profile/commit/914acb12c813616eaf7c6bd6f4dc5911b879201f))
