# Changelog — Page Context

## Data Source
Fetches `../changelog.md` as raw text and parses it client-side.

## Version Format
Headers use `## vYY.MM.DD` (e.g. `## v26.04.11`). The `Release` component displays this string as-is — no date reformatting. Optionally followed by a label: `## v25.03.23 — Initial release`.

## Parser (`parseChangelog`)
Splits markdown by newline and builds `[{ date, summary, sections: [{ title, entries[] }] }]`:
- `## ...` → new release (the full string after `## ` is stored as `date`)
- `### ...` → new section within current release
- `- ...` → entry within current section
- Any non-heading, non-list line after the `## ` but before the first `### ` → `summary`

## Section Order (`SECTION_ORDER`)
RetroAchievements, Steam, Hub, Completions, Activity, Pipelines, Structure, Admin

Sections are sorted by this order regardless of their order in the markdown file.

## Section Colors (`SECTION_COLORS`)
- RetroAchievements: `#e5b143` (gold)
- Steam: `#66c0f4` (blue)
- Hub / Completions / Activity: `#c6d4df` (text primary)
- Pipelines / Structure: `#8f98a0` (gray)
- Admin: `#ff6b6b` (red)

## Inline Code
Backtick spans `` `foo` `` are rendered as `<code>` with cyan text (`#57cbde`) and dark background.

## Refresh App Button
Header has a "Refresh app" button (`refreshApp`): deletes all Cache Storage entries, calls `serviceWorker.getRegistration().update()`, then reloads. Only app files are affected — data is always network-first. This is the mobile entry point (the hub footer copy is desktop-only).
