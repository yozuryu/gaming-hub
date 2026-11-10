# Changelog — Page Context

## Data Source
Fetches `../changelog.md` as raw text and parses it client-side.

## Version Format
Headers use `## vYY.MM.DD` (e.g. `## v26.04.11`), optionally followed by a label: `## v25.03.23 — Initial release`. The page shows the date ("10 Nov", `parseVersion`) with the version small beside it, under month headings (`groupByMonth`).

## Parser (`parseChangelog`)
Splits markdown by newline and builds `[{ date, summary, sections: [{ title, entries: [{ kind, text, detail[], subs[] }] }] }]`:
- `## ...` → new release (the full string after `## ` is stored as `date`)
- `### ...` → new section within current release
- `- ...` → entry; an optional `new: ` / `improved: ` / `fix: ` prefix is its `kind` (`KINDS`: a coloured tag; the folded release counts entries per kind, else "N changes")
- Indented plain lines under an entry → `detail`, folded behind a tap on the entry (chevron)
- Indented `- ` lines → `subs`, under the entry; folded with the detail when the entry has a kind, else always shown. Not counted as changes
- Any non-heading, non-list line after the `## ` but before the first `### ` → `summary`, shown on the folded release (two lines) and in full when open

## Section Order (`SECTION_ORDER`)
RetroAchievements, Steam, Xbox, Hub, Completions, Activity, Analytics, Pipelines, Structure, Admin

Sections are sorted by this order regardless of their order in the markdown file.

## Section Colors (`SECTION_COLORS`)
- RetroAchievements: `#e5b143` (gold)
- Steam: `#66c0f4` (blue)
- Xbox: `#52b043` (green)
- Hub: `#c6d4df` (text primary)
- Completions: `#bef264` (lime)
- Activity: `#e879f9` (magenta)
- Analytics: `#8b5cf6` (violet)
- Hub-page colors are chosen to stay apart from the platform colors, Admin red and each other (OKLab ΔE ≥ 16 with normal vision). A new page section needs its own entry in both `SECTION_ORDER` and `SECTION_COLORS`
- Pipelines / Structure: `#8f98a0` (gray)
- Admin: `#ff6b6b` (red)

## Inline Code
Backtick spans `` `foo` `` are rendered as `<code>` with cyan text (`#57cbde`) and dark background; `**bold**` as `<b>` in the primary text colour.

## Refresh App Button
Header has a "Refresh app" button (`refreshApp`): deletes all Cache Storage entries, calls `serviceWorker.getRegistration().update()`, then reloads. Only app files are affected — data is always network-first. This is the mobile entry point (the hub footer copy is desktop-only).
