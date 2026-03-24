# Changelog

## 2026-03-24

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
