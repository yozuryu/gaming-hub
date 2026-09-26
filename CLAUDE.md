# gaming-hub — Project Context for Claude

## Working Style

- **Be honest with opinions.** When asked for a preference or recommendation, give a direct, genuine answer — not a diplomatic non-answer.
- **Push back before implementing bad ideas.** If asked to add or change something that seems like a poor UX, visual, or technical decision, say so clearly and explain why before doing it. Do not silently implement something you think is wrong — always confirm first.
- **Discuss before building when uncertain.** For UI/UX decisions especially, a short discussion upfront saves rework.

---

Personal gaming statistics dashboard aggregating RetroAchievements (RA) and Steam data. Static site with no build tool — React, Tailwind, and Lucide are all loaded via CDN. Data is fetched by Node.js pipelines running on GitHub Actions hourly, stored as JSON files committed to the repo, and consumed directly by the browser.

---

## Directory Structure

```
gaming-hub/
├── index.html                      # Hub landing page (vanilla JS, no React)
├── manifest.json                   # PWA manifest
├── sw.js                           # Service worker (network-first data, cache-first assets)
├── changelog.md                    # Project changelog (Markdown, parsed by changelog app)
├── CLAUDE.md                       # This file
│
├── assets/
│   ├── mobile-nav.js               # Shared bottom nav bar, injected into all pages via <script>
│   ├── avatar.png                  # User avatar
│   ├── appicon.png                 # Source icon (1024×1024, used to generate PWA icons)
│   ├── icon-192.png / icon-512.png # PWA icons (generated from appicon.png)
│   └── icon-ra.png / icon-steam.png / icon-xbox.png
│
├── data/                           # JSON written by pipelines, read by browser
│   ├── hub/config.json             # Username, motto, tags, platform visibility flags
│   ├── ra/
│   │   ├── profile.json            # RA profile, stats, awards, recently played
│   │   ├── games.json              # All RA games with per-achievement details
│   │   ├── watchlist.json          # Want-to-play list (fetched separately by profile page)
│   │   ├── series.json             # Named series with game ID arrays
│   │   └── achievements/
│   │       ├── 1.json – 4.json     # Recent achievements chunked by 91-day windows
│   │       └── heatmap.json        # { "YYYY-MM-DD": { count, points } }
│   └── steam/
│       ├── profile.json            # Steam profile, stats, recently played
│       ├── games/
│       │   ├── index.json          # All games, no achievements[] — fast initial load (~200KB)
│       │   ├── {appId}.json        # Full game data + achievements[], lazy-fetched per game
│       │   └── sentinel.json       # Pipeline-only: no-achievement game cache (never loaded by frontend)
│       └── achievements/
│           ├── 1.json – 4.json     # Recent achievements chunked by 91-day windows
│           └── heatmap.json        # { "YYYY-MM-DD": { count } }
│
├── profile/
│   ├── ra/                         # CLAUDE.md in this directory
│   └── steam/                      # CLAUDE.md in this directory
│
├── activity/                       # CLAUDE.md in this directory
├── completions/                    # CLAUDE.md in this directory
├── changelog/                      # CLAUDE.md in this directory
│
├── admin/
│   └── index.html                  # Admin panel (series management, guides, config)
│
├── scripts/
│   ├── ra-pipeline.js              # RA ETL: API → data/ra/ (~600 LOC)
│   └── steam-pipeline.js           # Steam ETL: API → data/steam/ (~800 LOC)
│
└── .github/workflows/
    ├── fetch-ra-data.yml            # Hourly cron + manual dispatch
    └── fetch-steam-data.yml         # Hourly cron (offset :10) + manual dispatch
```

---

## Hub Page (`index.html`)

Vanilla JS, no React. Reads `data/hub/config.json`, `data/ra/profile.json`, `data/steam/profile.json`.

**Platform cards** — on desktop: full cards with header, stats grid, recently played rows, footer link. On mobile: header + stats grid only (recently played and footer hidden via CSS). Cards are not shown if `platforms[key].visible` is false in config.json.

**Stats order and colors** (by relevance):
- RA: Points (gold) → Rank (white) → Mastered (gold) → Beaten (silver) → Achievements (blue) → Games (muted)
- Steam: Hours (blue) → Perfect (gold) → Achievements (blue) → Games (muted) → Played (muted) → w/ Unlocks (muted)

**Completions strip** (desktop only, hidden on mobile via CSS):
- Shows: N total · N Completed (gold) · N Beaten (silver)
- "Completed" = RA Mastered + Steam Perfect merged — they are the same concept
- Most recent completion shown with icon, name, and time ago

**Recent Activity feed** — up to 8 rows, combined RA + Steam sorted by date. On mobile collapses to 4 rows with a "Show more / Show less" toggle button below the feed.

---

## Mobile / PWA

### Bottom navigation (`assets/mobile-nav.js`)
Self-contained IIFE injected into every page via `<script src="...assets/mobile-nav.js">`. Visible only on screens < 768px.

- 5 tabs: Home, Profile (popup), Activity, Done (Completions), Log (Changelog)
- **Profile tab** fetches `data/hub/config.json` and builds a vertical pill popup showing only `visible: true` platforms. Popup slides up/down via CSS transition (no JS animation). If only one platform, navigates directly.
- `BASE` is derived from `document.currentScript.src` — works on any host (GitHub Pages `/gaming-hub/`, local `/`, etc.)
- Mobile CSS injected via `<style>`: hides `.page-topbar` and `footer`, adds `padding-bottom` to body, repositions `.scroll-top-btn`
- All pages must have `class="page-topbar"` on the breadcrumb topbar div
- Safe area: `env(safe-area-inset-bottom)` used on nav, body padding, scroll-top button, and floating pills

### PWA
- `manifest.json` + `sw.js` at root
- `viewport-fit=cover` on all 6 `index.html` viewport meta tags
- Icons: `assets/icon-192.png` and `assets/icon-512.png` generated from `assets/appicon.png`
- Service worker: network-first for `data/**` and `changelog.md`, cache-first for all other static assets

### Page headers (mobile)
All page headers use `pt-8 pb-5 md:pt-5` — extra top padding on mobile compensates for the hidden breadcrumb bar. Desktop keeps the original `pt-5`. Apply this to any new pages.

### Hub page (mobile)
- Platform cards: header + stats grid only — recently played rows (`.recent-label`, `#ra-recent`, `#steam-recent`) and card footers (`.card-ftr`) hidden via `@media (max-width: 767px)` CSS in `index.html`
- Completions strip (`#completions-strip`): hidden on mobile entirely via same media query — redundant with Done nav tab
- Activity feed: collapses to 4 rows on mobile; rows 4+ have `data-activity-extra="1"` attribute and class `activity-row-hidden`; toggle button `#activity-toggle-btn` shown/hidden by JS after feed renders

### RA Profile stats (mobile)
- Stats are split into `statsLeft` and `statsRight` columns in `transform.js`
- On mobile, `statsRight` is hidden by default (`hidden sm:flex`)
- `statsExpanded` state + "Show more / Show less" toggle button (`sm:hidden`) controls visibility
- Toggle button has a rotating `ChevronDown` icon

### Floating tab pill (RA and Steam profile pages)
- Appears when the natural tab bar scrolls off screen (`getBoundingClientRect().bottom < 0`)
- Slides up on appear (`slideUpPill` keyframe), slides down on disappear (`slideDownPill` keyframe)
- Exit animation: `pillLeaving` state + 210ms deferred unmount so animation completes before DOM removal
- Positioned above bottom nav: `bottom: calc(68px + env(safe-area-inset-bottom, 0px))`
- Scroll-to-top button shifts up to `calc(120px + ...)` when pill is visible

---

## Data Pipelines

### RA Pipeline (`scripts/ra-pipeline.js`)
Env vars: `RA_USERNAME`, `RA_API_KEY`. Uses `@retroachievements/api` package.
- Default (incremental): fetches profile + recent achievements + progress
- `--refresh-games`: re-fetches per-game achievement details
- `--watchlist-only`: fetches only want-to-play list → `watchlist.json`
- Game details cached in Firestore to avoid re-fetching unchanged games
- Outputs: `profile.json`, `games.json`, `watchlist.json`, `achievements/1-4.json`, `achievements/heatmap.json`

### Steam Pipeline (`scripts/steam-pipeline.js`)
Env vars: `STEAM_API_KEY`, `STEAM_USER_ID`.
- Default: recently played games only
- `--refresh-unlocked-games`: re-fetches games with any unlocked achievements
- `--refresh-games`: all owned games
- `games/index.json` pre-computes `lastUnlockedAt`, `lastUnlockName`, `preview` (top 6 icon hashes) per game
- `games/sentinel.json` tracks no-achievement games (pipeline-only, never fetched by frontend)
- Outputs: `profile.json`, `games/index.json`, `games/{appId}.json`, `games/sentinel.json`, `achievements/1-4.json`, `achievements/heatmap.json`

### Shared behavior
- Both pipelines write JSON to `data/{ra,steam}/` and commit to main via GitHub Actions
- Concurrency group `data-pipeline` prevents overlapping runs
- `--debug` flag prints API responses without writing files
- Chunk files split by 91-day windows: chunk 1 = 0–91 days, chunk 2 = 91–182, etc.

---

## Tech Stack

| Layer | Tool | Notes |
|---|---|---|
| UI framework | React 18.2 | Via CDN (`esm.sh`), no build step |
| Styling | Tailwind CSS | Via CDN, arbitrary values used heavily |
| Icons | Lucide React 0.263.1 | Via CDN |
| JS transform | Babel standalone | Transpiles JSX in-browser |
| Node scripts | Node.js 20 | Pipelines only, not frontend |
| CI/CD | GitHub Actions | Hourly data fetch + commit |
| Hosting | GitHub Pages | Static files served as-is |

There is **no bundler, no npm for the frontend, no TypeScript**. All frontend files are plain `.js` (JSX transpiled in-browser by Babel).

---

## Code Conventions

### Styling
- **Tailwind className** for fixed/structural styles
- **Inline `style={{}}`** for dynamic values (colors from data, animations with delays)
- **`<style>` tag with `@keyframes`** for CSS animations — injected inside the React return. Established pattern across all pages.
- Arbitrary Tailwind values are used extensively: `text-[11px]`, `w-[140px]`, `tracking-[0.07em]`

### Component patterns
- All functional components with hooks (`useState`, `useEffect`, `useMemo`, `useRef`, `useCallback`)
- `useMemo` used aggressively for derived data
- Large `app.js` files contain all components for that page — no separate component files
- Sub-components defined at module level, not inline

### Data flow
- Data fetched on mount with `useEffect` + `fetch()`
- Loading skeletons shown while data is `null`/loading
- Chunk-based lazy loading via `IntersectionObserver` with a sentinel `ref` at the bottom of the list

### RA title parsing
RA game titles use special syntax handled by `parseTitle()`:
- `~Tag~` prefix → tag (Homebrew, Demo, Prototype, Hack)
- `[Subset - Name]` suffix → subset game, extract parent title and subset name

---

## Design System

### Color palette
```
Background:        #171a21   (page bg)
Card bg:           #1b2838   (primary card)
Card bg darker:    #202d39   (secondary card, hover)
Card bg dark:      #131a22   (topbar, FAB buttons)
Border:            #2a475e   (standard border)
Border dark:       #101214   (inner/inset border)
Text primary:      #c6d4df
Text secondary:    #8f98a0
Text muted:        #546270

RA gold:           #e5b143
Steam blue:        #66c0f4
Cyan accent:       #57cbde
```

### Completion status colors
- Mastered / Perfect / Completed: `#e5b143` (gold)
- Beaten: `#b8c4ce` (silver) — second tier, pairs with gold like a medal; badge bg `#2a3440`, badge text `#c6d4df`
- In Progress: `#66c0f4` (blue)
- Not started / border: `#323f4c`

### Stat number colors (hub cards + profile stats)
- Gold `#e5b143` — earned value: Points, Mastered, Perfect
- White `#c6d4df` — identity: Rank
- Blue `#66c0f4` — engagement: Hours, Achievements
- Silver `#b8c4ce` — second tier: Beaten
- Muted `#546270` — context/breadth: Games, Played, w/ Unlocks

### Rarity colors (Steam achievements)
- Ultra Rare (<5%): `#e5b143` (gold)
- Very Rare (<10%): `#c8901a` (dark gold)
- Rare (<25%): `#66c0f4` (blue)
- Uncommon (<50%): `#8f98a0` (gray)
- Common (≥50%): `#546270` (muted)

### Tilde tag colors
- Hack: red `#ff6b6b`
- Homebrew: blue `#66c0f4`
- Demo: cyan `#57cbde`
- Prototype: gray `#8f98a0`

### Typography
- Font: `'Segoe UI', Arial, sans-serif`
- Sizes: 7–15px (very compact, dashboard-style)
- Labels: `uppercase tracking-[0.07em]` or `tracking-[0.1em]` with `font-semibold`
- Border radius: mostly 2–3px (sharp, minimal)

### Section headers
Consistent pattern across all pages:
```jsx
<span className="w-[3px] h-[14px] bg-[#66c0f4] rounded-[1px] shrink-0" />
<span className="text-[13px] text-white tracking-wide uppercase font-medium">Title</span>
```
RA sections use `#e5b143`, Steam/Activity/Hub sections use `#66c0f4`.

### Shimmer skeleton
Defined in each `index.html` `<style>` block (not in app.js). Class name: `.shimmer`. Used on loading placeholders before data arrives.

### Scroll-to-top button
Rounded FAB: `w-10 h-10 rounded-full bg-[#131a22] border border-[#2a475e] active:scale-90`. Has class `scroll-top-btn` so mobile-nav.js can reposition it above the nav bar.

---

## Overflow / Mobile Notes

- `html, body { overflow-x: clip }` must be on **both** `html` and `body` — `clip` on `body` alone does not propagate to the viewport scroller.
- The RA profile `index.html` has no overflow rule (its content fits without it).
- Heatmaps use `overflow-x: auto` wrapper with `minWidth: ${53 * 14}px` inner — intentional.
- Page headers use `pt-8 pb-5 md:pt-5` — extra top padding on mobile compensates for the hidden breadcrumb.

---

## Changelog Convention

**Always update `changelog.md` after making any code changes.** Every feature, fix, or improvement must be logged — do not wait for the user to ask.

Version format: `## vYY.MM.DD` (e.g. `## v26.04.11`). **If an entry for today's date already exists, add to it — never create a second `## vYY.MM.DD` header for the same date.** Check the top of `changelog.md` before adding a new header.

Structure:
- One-line summary after the version
- `### SectionName` subsections matching the page changed
- Bullet points per change, technical but readable

Section order (matches `SECTION_ORDER` in `changelog/app.js`): RetroAchievements, Steam, Hub, Completions, Activity, Pipelines, Structure.
