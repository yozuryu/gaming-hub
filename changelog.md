# Changelog

## 2026-03-24

### RA Dashboard
- **Activity tab: lazy load by quarter** — timeline loads 3 months at a time via scroll (IntersectionObserver); clicking a heatmap day auto-loads the relevant chunk
- **Heatmap always complete** — moved heatmap data (`activityHeatmap`) into `profile.json` so the full 365-day view is available immediately, independent of lazy-loaded timeline data
- **Tilde tag support** — `~Homebrew~`, `~Demo~`, `~Prototype~`, `~Hack~` tags parsed from game titles and shown as colour-coded badges in game cards, recently played, and watchlist
- **Watchlist search** — now searches subset name and tilde tags in addition to title

### Hub
- **Stats card** — replaced "Member since" with "Mastered" count; fixed beaten count logic
- **Recently played** — shows subset and tilde tag badges; extracted title parsing helpers
- Updated genre tags

### Pipeline
- **Incremental mode** — default run skips already-cached games; `--refresh-games` forces full re-fetch
- **Quarterly achievement chunks** — writes `achievements_1.json` → `achievements_4.json` instead of a single `achievements.json`
- **`activityHeatmap` added to `profile.json`** — precomputed day→{points, count} map for the full year
- **`points7Days` / `points30Days` precomputed** — stored in `profile.json`, no longer calculated client-side

---

## 2025-03-23 — Initial release

- Hub page with RetroAchievements card; Steam and Xbox coming-soon placeholders
- RA dashboard: Overview, Recent Games, Completion Progress, Activity (heatmap + timeline), Watchlist
- Shimmer skeleton loading, mobile-responsive layout
- ETL pipeline with 1-year achievement fetch, Firebase Firestore sync (disabled)
