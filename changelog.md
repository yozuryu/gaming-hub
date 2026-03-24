# Changelog

## 2026-03-24

- Hub profile data (`username`, `motto`, `tags`, `platforms`) moved to `data/hub/profile.json`; `index.html` renders it dynamically
- Want-to-play list now paginates to fetch all items beyond the 500-item API limit
- `profile.js` refactored: non-JSX code extracted into `utils/constants.js`, `utils/helpers.js`, and `utils/transform.js`
- Stats pills: points shown in gold to improve visual hierarchy
- Activity tab now lazy-loads achievements in 3-month chunks; heatmap stays complete using precomputed data from `profile.json` — [`425a2a2`](https://github.com/yozuryu/gaming-profile/commit/425a2a29d314684ffa1d49c42158a0fa436efbea)
- Game title tilde tags (`~Homebrew~`, `~Hack~`, etc.) displayed as badges across dashboard and hub — [`425a2a2`](https://github.com/yozuryu/gaming-profile/commit/425a2a29d314684ffa1d49c42158a0fa436efbea)
- Pipeline supports incremental mode (skips cached games) and splits achievement data into quarterly files — [`425a2a2`](https://github.com/yozuryu/gaming-profile/commit/425a2a29d314684ffa1d49c42158a0fa436efbea)
- Automated GitHub Actions workflow — fetches data every 3 hours and does a full refresh at midnight, commits results to main — [`e68d4c5`](https://github.com/yozuryu/gaming-profile/commit/e68d4c5a1e495c87ccb8ea40654fbe63e39dac25)
- Scripts reorganized into `scripts/` folder; `package.json` at root with `npm run` commands for all tasks — [`e68d4c5`](https://github.com/yozuryu/gaming-profile/commit/e68d4c5a1e495c87ccb8ea40654fbe63e39dac25)

---

## 2025-03-23 — Initial release

- Hub page with RetroAchievements card; Steam and Xbox coming-soon placeholders — [`914acb1`](https://github.com/yozuryu/gaming-profile/commit/914acb12c813616eaf7c6bd6f4dc5911b879201f)
- RA dashboard: Overview, Recent Games, Completion Progress, Activity (heatmap + timeline), Watchlist — [`914acb1`](https://github.com/yozuryu/gaming-profile/commit/914acb12c813616eaf7c6bd6f4dc5911b879201f)
- Shimmer skeleton loading, mobile-responsive layout — [`4b72bbe`](https://github.com/yozuryu/gaming-profile/commit/4b72bbe0556ce6a50f0a160f6f47e6caa137dd8c)
- ETL pipeline with 1-year achievement fetch, Firebase Firestore sync (disabled) — [`914acb1`](https://github.com/yozuryu/gaming-profile/commit/914acb12c813616eaf7c6bd6f4dc5911b879201f)
