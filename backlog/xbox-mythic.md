# Xbox Mythic Achievements

**Status:** Parked (revisit later) · **Priority:** 7 · Written 2026-10-04

## What it is

Xbox's answer to PlayStation's Platinum trophy, rolling out to Xbox Insiders from September 2026 ([Pure Xbox](https://www.purexbox.com/news/2026/09/mythic-achievements-are-officially-on-the-way-as-rollout-begins-today-for-xbox-insiders), [Thurrott](https://www.thurrott.com/?p=342187)).

- Earned by completing all of a game's **original** achievements. Achievements added later (DLC, updates) are not required, and the Mythic stays once earned.
- Retroactive, including Xbox 360 titles ([Notebookcheck](https://www.notebookcheck.net/New-Xbox-reward-for-achievement-hunters-goes-all-the-way-back-to-Xbox-360.1412061.0.html)).
- Shown on a new Gaming tab on Xbox profiles ([Windows Report](https://windowsreport.com/?p=1510598)).

## Why it matters here

The hub's Xbox "Completed" means 100% of gamerscore, DLC included. Mythic is base-game only, so a game can be Mythic without being Completed (the library has 0 Completed today, but may have Mythics). It's also closer to RA Mastered / Steam Perfect as a "finished the game's set" milestone.

## To find out first

- [ ] Does OpenXBL expose Mythic? Check `/achievements` (title list) and `/achievements/player/{xuid}/{titleId}` responses for a new field once the feature is out of Insiders.
- [ ] If not: can base-game achievements be told apart from DLC/update ones in the achievement list (an add-on/product id, a release date, or similar)? Without that, Mythic can't be computed.
- [ ] Xbox 360 titles only list unlocked achievements (`partial: true`); check whether Mythic for them is derivable at all, or only via a flag.

## If it's available

- Pipeline: store a `mythic` flag (and date) per title in `games/index.json` / `games/{titleId}.json`, plus a `mythicGames` list in `profile.json`.
- Decide the terminology with the user: replace Xbox "Completed" with Mythic as the gold tier, or keep 100% as Completed and add Mythic alongside.
- Surfaces: Xbox profile, hub card + completions strip, Completions page, Analytics funnel and completion counts, game card stripes (gold ladder).
