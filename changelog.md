# Changelog

## v26.11.10

An easier way to Activity on desktop, picked icons for RA games without one, picked art on unstarted series, and an easier-to-read changelog

### RetroAchievements

- new: **Games without an icon on RA** can show a square picked in the admin
  RA shows the same blank placeholder for every game without an icon, mostly want-to-play games with no set yet. A picked square stands in everywhere the icon shows, and RA's own icon takes over once it has one.
- improved: **Mega Man** series (RA and shared) gets the twelve classic games just added to the want-to-play list
  Mega Man 1 to 10, Rockman & Forte and Mega Man & Bass, all in the Classic sub-series (now 15 games in the shared series).
- improved: **Drakengard / NieR** shared series adds Drakengard 2
  RA has no Drakengard series: with 2 RA games it's under the 3-game minimum.
- fix: **Series** tab shows the picked art for series you haven't started
  A series whose cover is only on the want-to-play list showed the library mosaic, even with a hero picked in the admin. Picks only reached games you had played.

### Hub

- new: **All activity** bar under Recent activity on desktop
  The last 7 days as squares (blue on days you played or unlocked something), their hours and unlocks, and a link to the Activity page. The small arrow in the section header stays; phones have the Activity tab instead.
- improved: **Playing** and **Series** bars end in blue **All playing ›** and **All series ›**
  Instead of only a grey arrow. Series now says "36 series" on the left, so "All" isn't said twice.
- improved: **Sub-series** rows have their cover game's art behind them
  Faded in from the right like the series cards, in the list and in the series sheet. On the Series page and the RA and Steam Series tabs.
- fix: **Series** cards and the Series page show the picked art for want-to-play games
  The same fix as the RA Series tab, in `build-series.js`: the art behind the card and its sheet.

### Structure

- new: **Changelog** is easier to skim
  Releases show their date and summary while folded, grouped by month. New entries have a kind (new, improved, fix) and a short headline; tap one for its details.
- improved: **Every older release** rewritten in the new style
  All 617 entries back to the first release have a kind and a short headline, with the full text kept as their detail; sub-points fold away with it.
- fix: **Changelog** renders bold text and counts sub-points under their entry
  Bold showed as `**asterisks**`, and sub-points counted as separate changes (8 Nov said 68 changes for 33).

### Admin

- new: **RA Art** finds square icons for RA games without one
  A **no icon** button in the list's footer shows them; each gets an Icon section with SteamGridDB's square art and icons. A pick is only used until RA adds its own icon, and the admin offers to remove it then.

## v26.11.09

Platforms on the desktop hub are separate cards

### Hub

- improved: **Platforms** are three separate cards in the desktop rail
  RetroAchievements, Steam and Xbox have a gap between them and a left edge in the platform's colour (gold, blue, green), instead of one box split by a faint line. The phone keeps its compact rows.

## v26.11.08

Profiles: new Completions and Game awards; series get sub-series; Analytics: Most days, Binged and Comebacks lists, idle games can be hidden, farms can be marked by hand; the admin gets a new look

### RetroAchievements

- improved: **Game awards** redesigned as the same section as Steam's and Xbox's Completions
  One shared component, keeping RA's words:
  - The counts are big: **Mastered** in gold and **Beaten** in silver, instead of 10px numbers in the corner.
  - **Latest:** the newest award as a card with the game's art behind (the picked hero, else a screenshot), its date, console, playtime, and the rarest achievement (mastered) or the win condition (beaten) with its rarity.
  - The other games as square icons, 4 per row, a showcase like before. The tier is a border: gold with a glow, or silver. Mastered come first, then Beaten, newest first in each.
  - A **list** view, switched in the section header and remembered: one row per game with its name, console, tier and date. Before, the name and date were only in a hover tooltip, so a phone never showed them.
  - Tapping a game opens its achievement sheet.
  - Two rows folded. Show all opens a box that scrolls; with 9 awards everything fits, so there's no button.
- improved: **Final Fantasy** series loses four games only sold under that name in the US
  In both RA and the shared series: Final Fantasy Adventure (Seiken Densetsu 1) moves to **Seiken Densetsu**, Final Fantasy Legend II and III (SaGa 2 and 3) to **SaGa**'s Original next to their remakes, and Final Fantasy Chronicles: Chrono Trigger to **Chrono**.
- improved: **Harvest Moon / Rune Factory** series gets twelve games and two sub-series
  RA and shared: the twelve Harvest Moon games just added to the want-to-play list. Split into Harvest Moon / Story of Seasons and Rune Factory, Innocent Life in Other.
- improved: **Shin Megami Tensei** series gets the eight games it was missing
  RA and shared: Nocturne, IV, IV: Apocalypse, Strange Journey and its Redux, the PS1 Shin Megami Tensei and II, and Raidou Kuzunoha vs. the Soulless Army. Strange Journey and If... are spin-offs (Atlus calls Strange Journey one); Soul Hackers 2 is the fifth Devil Summoner game.
- improved: **Summon Night** series adds Summon Night 2 and 3, EX-These and Granthese
  Just added to the want-to-play list.
- improved: **Dragon Slayer** series adds Lord Monarch
- improved: **Metal Gear** series gets the seven games only the shared series had
  Metal Gear, Ghost Babel, Integral, VR Missions, MGS2 Substance, MGS3 Subsistence, The Twin Snakes. Every other RA series matches its shared one.
- new: **Sub-series** on the Series tab, set on 20 series
  The same as the Series page (see Hub): .hack (IMOQ, G.U.), Crash Bandicoot, Digimon, Final Fantasy, Fire Emblem (Archanea, Valentia, Jugdral, Elibe, Magvel, Tellius, Ylisse, Fates), Harvest Moon / Rune Factory, Kingdom Hearts, Mega Man, Metal Gear, Phantasy Star (Mainline, Online), Pokémon (Mainline, Mystery Dungeon, Ranger, Spinoff), Rayman (Mainline, Raving Rabbids), Resident Evil, SaGa (Original, Romancing SaGa, SaGa Frontier, Unlimited Saga), Shin Megami Tensei, Shining (Shining Force, Shining Soul), Suikoden (Mainline, Suikogaiden, Spinoff), Summon Night (Mainline, Swordcraft Story, Spinoff), Tales and The Legend of Heroes.
  The same names everywhere: **Mainline** for the main line (Classic for Mega Man, where every line is a main one), **Spinoff** for the spin-offs that aren't a named line of their own. A sub-series needs 2+ of the games (Mainline may hold one); the rest show as Other. Series that are one numbered line plus ports (Dragon Quest, Ys, Breath of Fire, Tetris, Zelda) have none.

### Steam

- fix: **Store banners** for newer games show again
  Steam now keeps them at a new address the site didn't know (SpongeBob SquarePants: Titans of the Tide was blank); the pipeline saves that address and every page uses it, and a banner that still fails shows the game's hero art instead of nothing.
- improved: **Completions** redesigned as the same section as RA's and Xbox's
  **Perfect** / **Beaten** counts, a **Latest** card (hero art, playtime, the final achievement or the win condition with its rarity), then the other games as store banners, 3 per row, or as a list with name, final achievement or win condition, tier and date. The banners replace the last achievement's icon, which didn't show which game it was. Perfect first, then Beaten. Tapping a game opens its sheet. Show all opens a box 4 rows high that scrolls.
- new: **Sub-series** on the Series tab, set on 6 series
  The same as RA's and the Series page: Trails (Liberl, Crossbell, Erebonia), Final Fantasy (Mainline, Spinoff), Resident Evil (Mainline, Revelations, Spinoff), Gunvolt (Azure Striker Gunvolt, Luminous Avenger iX, Mighty Gunvolt), Neptunia (Re;Birth, Spinoff) and Nihon Falcom (Xanadu, Zwei; Gurumin in Other). The others are too small to split or one line of games (Ys, Tales of, Batman).

### Xbox

- improved: **Completions** redesigned as the same section as RA's and Steam's
  **Completed** / **Beaten** counts, a **Latest** card (hero art, gamerscore, win condition), then the games as posters, 4 per row, or as a list (square box art) with name, win condition, tier and date. Tapping a game opens its sheet. Show all opens a box 3 rows high (posters are tall) that scrolls. Xbox 360 posters come with a black band at the bottom of the image (about 9%); it's replaced by a blurred, enlarged copy of the cover, so every poster fills its frame.


### Hub

- new: **.hack** shared series
  The eight RA games and .hack//G.U. Last Recode on Steam.
- new: **Dragon Slayer** shared series, Falcom's 1984 line
  The line The Legend of Heroes began in as Dragon Slayer VI: Mainline (Romancia, Legacy of the Wizard, Dragon Slayer: The Legend of Heroes, Lord Monarch) and Xanadu (Legend of Xanadu, Xanadu Next, Tokyo Xanadu eX+). Ys is a separate Falcom series, so it isn't in it.
- new: **Sub-series** on the Series page, set on 13 shared series
  .hack (IMOQ, G.U.), Mega Man (Classic, Mega Man X, Zero / ZX, Battle Network, Star Force, Legends), The Legend of Heroes (Gagharv, Liberl, Crossbell, Erebonia), Final Fantasy (Mainline, Crystal Chronicles, Tactics, Dissidia, FF7 Universe, Spinoff), Resident Evil (Mainline, Gun Survivor, Chronicles, Outbreak, Revelations, Spinoff), Tales of, Kingdom Hearts (Mainline, Spinoff), Shin Megami Tensei (Mainline, Persona, Devil Summoner, Devil Survivor, Digital Devil Saga, Spinoff), Metal Gear (Mainline, Acid, Spinoff), Crash Bandicoot (Mainline, Party Game), Digimon (Digimon World, Digimon Story, Rumble Arena, Spinoff), FromSoftware (Armored Core, Souls) and Harvest Moon / Rune Factory (Harvest Moon / Story of Seasons, Rune Factory):
  - In the list, a series with sub-series gets a bar under its card: the count and their icons stacked. It's folded by default; tapped, it opens one row per sub-series (cover, games, started / completed / beaten, %, bar). On desktop an open series takes the full width with its rows three across, and the next card moves up beside the one it left.
  - Tapping a row opens the series sheet on that sub-series: the header, Latest unlock and games cover only those games, with a link back to the whole series.
  - In the sheet, a chip row under the header: All, then each sub-series with its game count and a thin gold bar along its bottom edge showing its achievement %. The picked chip scrolls into view.
  - On All, a Sub-series strip (same look as the list bar) above Latest unlock opens the rows; each row opens its chip.
  - Search finds sub-series names ("Zero" finds Mega Man). `?open=<series>&sub=<sub-series id>` opens one directly.
  - Games in no sub-series are grouped as Other.
- new: **Playing**, **Series** and the **Analytics strip** can be switched off in the admin
  In Site Config → Hub sections, like the Activity feed and Completions strip already could.

- improved: **Status pills** for the counts on series cards and sub-series rows
  Instead of a line of words: ★ completed (mastered / perfect on the profiles) in gold, a medal for beaten in silver, ▶ in progress in blue, the number beside the icon and the words in the tooltip. The same on the Series page and the RA, Steam and Xbox Series tabs.
- fix: A series' sub-series count and stacked icons include **Other**
  Other is the games in none, so the number matches the rows and chips.
### Analytics

- new: **Most days** replaces Hardest in Top games
  The games you played or unlocked something in on the most days, which tells a habit from a binge (40h in one weekend vs an hour a day for a month). Hardest ranked playtime per unlock, so a game played for fun or an idle game left running came out "hardest"; rarity was tried instead and measured how far you got compared with other players, not difficulty.
- new: **Binged** replaces Almost done in Top games
  Hours per day played (games played on 2+ days, 2h+). Almost done showed current progress rather than the period's, and the profiles' Progress → Nearly there already lists it.
- new: **Comebacks** in New games, games you returned to after 60+ days
  Between New and Dropped (Tried and dropped, shortened to fit): games you returned to after 60+ days without playing or unlocking anything, ranked by time played since, with how long you were away.
- new: **Hide idle** next to Hide farms, on by default
  Games marked as idle in the admin (left running, so their playtime isn't play) are left out of every number. Poring Clicker is the first one. The hub's Analytics strip leaves them out too.
- improved: One **Hide** chip with a checklist instead of two chips
  It opens a checklist with Achievement farms and Idle games, both ticked by default. Each option shows its count and names its first 3 games, then "+N more". The names are ordered by playtime in the selected period, then unlocks, so the games that would move the numbers most come first. The names were only in a tooltip before, so a phone couldn't see them. The chip counts the games hidden right now.

### Structure

- fix: A **progress bar** at 0% is empty everywhere now
  The shared bar (game rows, series cards, sub-series, lists) kept a 2px sliver even at 0, so an untouched game looked barely started; it keeps the sliver only for real progress under 1%. Analytics' bar charts do the same for a 0 value.

### Admin

- new: **Sub-series** in the Shared Series, RA Series and Steam Series editors
  The series' games are listed in their sub-series, each with a header to rename, reorder or remove it (its games stay in the series), and No sub-series last. Tick games and **Move to…** a sub-series, none, or a new one made from them. **Suggest** proposes sub-series to add one by one or all at once: series that sit almost entirely inside this one (RA's Mega Man X inside Mega Man; for shared series, the RA series), then words the titles share after the series name, split by arc ("Trails in the Sky", "Trails of Cold Steel"). The Steam Series editor has them too, with the shared series' sub-series as its suggestions. Xbox series don't show sub-series on the site yet, so their editor stays as it was.
- new: **Idle Games** page to mark games left running
  In General: search RA and Steam games and mark the ones left running; saved to `data/hub/idle-games.json`.
- new: **Farm Games** page to mark which games are achievement farms
  In General: the Steam games the farm rule detects (unlocks, hours and rate per hour), each can be marked as not a farm, and any RA, Steam or Xbox game can be marked as a farm by hand; saved to `data/hub/farm-games.json`. Analytics' Hide farms, the hub's Analytics strip and Playing follow it. 8-Bit Bayonetta, Hell Girls and WayOut (21–51 unlocks an hour) are marked as not farms: they're real games the rule caught.
- improved: **New look** for the admin, same palette and sharp corners as the site
  - Sidebar with the app icon, the RA, Steam and Xbox icons on their sections, a Lists section (Shared Series, Idle Games, Farm Games), a link to the live site, and the server status (online, restarting, stopped) with restart / stop.
  - Lucide icons instead of emoji throughout.
  - Every page has a header: its icon, what it edits and the file it writes.
  - Save sits in that header on every page, flags unsaved changes, and ⌘S / Ctrl+S saves.
  - Shared parts: search fields with an icon and a clear button, buttons with icons, sentence-case field labels, larger text (10–12px floor instead of 8–11px), shimmer skeletons instead of "Loading…", and empty states that say what to do instead of "Select a series".
  - Site Config and Credentials are cards (platform icons, show / hide key buttons). Pipelines get a button per mode with its icon and a log panel with Running / Done / Failed. Win conditions use an Any / All switch. Idle and Farm Games are two cards each.
- improved: The admin server serves the **site's images** for the icons
  It serves `/assets/*.png|svg|ico|webp`; restart it once to pick this up.
- improved: **Site Config** shows each platform's sync and gets **Hub sections**
  The Platforms card drops the Active switch (nothing read it) and shows each platform's sync instead: every 30 min, or Sync paused for Xbox (read from `XBOX_ENABLED` in `fetch-data.yml`). "Pages" becomes **Hub sections** with switches for Playing, Series, Recent activity, Completions and Analytics, marked phone + desktop or desktop only.
- improved: **Credentials** lists every key in `.env` with what uses it
  Each card says what uses its key. New: SteamGridDB (the Art page), Scheduling (the GitHub token and the cron-job.org key), and the optional Xbox XUID.
- new: **Pipelines** can start real runs, list recent ones and manage the schedule
  - **Run on GitHub** starts a real data run: incremental, midnight, full refresh or watchlist, for all platforms or one, after a confirm step.
  - The right side lists the last 12 runs: status, how it started, when, how long, and a link to the run. It refreshes while one is running.
  - **Local tools:** pull live data (`data:pull`) and rebuild the shared series.
  - The local pipeline runs are labelled as test runs that never reach the live site.
  - **Schedule:** the two cron-job.org jobs (every 30 min, midnight), each with its last result, next run, a switch to pause or resume it, and **Run now**. cron-job.org has no run-now call, so Run now sends the job's own request (its mode and platforms) to GitHub. The job's headers, which hold the GitHub token, never leave the admin server.
- new: **Data Diff** groups changes and can commit, push and publish them
  - Three groups:
    - **Not committed:** hand-edited data files changed on this laptop.
    - **Ready to push:** every commit GitHub's main doesn't have, data or code. A data commit opens its diff file by file. A code commit (anything outside `data/`, which the admin can't commit) opens its details only: message, author, and the files with their added and removed lines.
    - **Local only:** pipeline output from local runs, compared with the last pull; it's never published.
  - Three buttons:
    - **Commit:** the data files only (other uncommitted work is left alone), not pushed.
    - **Push:** the waiting commits to main, which redeploys the site.
    - **Publish:** both in one go.
  - Each button has a confirm step listing what it commits and pushes. Push and Publish refuse when GitHub's main has commits this laptop lacks, and Commit refuses when the files changed since the comparison.
  - The bottom of the list shows who commits and who pushes:
    - The commit author comes from git config, and the label says whether that's the repo's config or the global one.
    - For pushes, the SSH key the remote's host resolves to and the GitHub account that key signs in as (`ssh -T`).

## v26.11.07

The profile Activity tabs get the Activity page's design; Analytics is reworked into tabs, the hub's Analytics card gets real visuals, and the achievement sheets get a new header.

### RetroAchievements

- improved: **Achievement sheet** drops the guide links and shows genre, developer and year
  The guide links (GameFAQs / YouTube and the custom guides) are gone, along with `data/ra/guides.json`; the genre, developer and year joined the console in the header's meta line.
- fix: **Achievement sheet** header is complete before the game's file loads
  Points and the progression meter come from the games index, so nothing pops in (points used to appear only once the file was in). Opened before the index (a `?game=` link, Overview), shimmers hold the places of points, played and progression until the file arrives. The filter bar fades in.
- improved: **Activity** tab redesigned like the Activity page
  A summary card (folded by default on phones: the last 14 days' unlocks and games with the 14 days as bars; open: past-year unlocks, points and best day, the 14 days with streak tiles, the heatmap), day headings that stay under the tab bar while scrolling, one card per run of unlocks in a game headed by its art (the hero picked in the admin), and compact rows that keep hardcore gold, points, ratio and the progression / win / missable icons. Days no longer collapse.

### Steam

- improved: **Activity** tab redesigned the same way
  Summary card, sticky day headings, game strips with the library hero, rows with rarity % in the tier colour.

### Xbox

- improved: **Activity** tab redesigned the same way
  Game strips use the title's hero art; rows show gamerscore and rarity.

### Hub

- improved: **Analytics card** on desktop gets big numbers, bars and the top game
  Hours played and unlocks in big numbers with their change vs the 30 days before, the 30 days as small bars (RA and Steam), a time-of-day bar with the busiest part named, and the top game with its icon, time and share. On tablets it's one row.

### Activity

- improved: Rows revealed by **Show N more** fade in
  Here and on the profile Activity tabs; folding the summary card back fades too.
- fix: **Loading placeholders** in the new shapes, so pages no longer jump
  The summary skeleton is folded or open as the card will be (it was the full open card, so the page jumped up ~290px on phones), the Playing view's skeleton has the group heading and tiles as tall as real ones, and the profile Activity tabs show the summary, heading and run cards instead of the old heatmap-and-list shape. One set for all four pages (`SummarySkeleton`, `TimelineSkeleton`, `ActivitySkeleton` in `assets/activity-ui.js`).

### Analytics

- improved: Analytics **split into four tabs** with the profiles' sticky tab bar and swipe
  **Overview**, **Time**, **Games**, **Achievements**. Each is one or two phone screens instead of one ~6,200px page.
- improved: **Overview** gets a Recap card and highlight cards
  In the Recap card the two big numbers (hours, unlocks) switch the trend chart under them, the other numbers in one row (points, gamerscore and completions only when there are any), then highlight cards that open the detail: top game over its art, peak time and favourite day with tiny bars, new games with their icons, rarest unlock.
- improved: **Time** gets Daily rhythm, one By hour chart and a tidier punchcard
  Daily rhythm (a 24-hour clock of play with the typical start in the middle, the answers beside it, the time-of-day bars), weekdays and weekends as two lines in one By hour chart, per weekday, sessions, and the unlock punchcard (cells no longer balloon on desktop). The Top unlock hours dial is gone: it repeated the punchcard.
- improved: **Games** and **Achievements** lists sit behind switches in one card
  Most played · Progress · Almost done · Hardest; New · Tried and dropped; console hours · achievements. Rows have bigger icons and the RA console or platform under the name; rarest unlocks show the game icon; the three funnels share one Completion card.
- improved: The **Table** toggle is a small icon in each card's corner
  The dates sit beside the title.
- fix: Each tab loads with a **skeleton** in its own shape
  Its cards drawn with their insides (title, numbers, ring, chart, list rows, bars) (Overview's plain blocks were used for all four, so a page opened on Time, Games or Achievements jumped when the data landed); the Hide farms count fades in.
- improved: **Top game**, **Completion** and **Daily rhythm** fill their empty spots better
  A top game without wide art shows the shared library mosaic (see Structure); Completion with none in the period shows the last completed game and when, and the period's completed games as icons when there are some; on desktop, Daily rhythm puts the time-of-day bars beside the clock.

### Structure

- new: **Achievement sheet header** on RA, Steam, Xbox and the shared Series page
  `SheetHead` in `assets/sheet.js`, `.shd-*` in `assets/ui.css`: cover, title, meta line and status tags, then one card with the completion % big on the left and the numbers beside it (RA: achievements, points, played; Steam: achievements, played, last played; Xbox: achievements, gamerscore, last played), RA's progression as a gold segmented meter (a chain over 20 is drawn in equal groups, 52 → 18 segments of 3, the one in progress partly lit), the card tinted up to the completion % with a hard edge (the whole card gold once complete), and the progress bar along the card's bottom edge: a lit track, the fill glowing blue or gold, never smaller than a nub so 1% still shows.
- improved: **Series sheets** get the game sheet's header
  On the profile Series tabs and the Series page: cover, name and game count (platform split on the Series page), the status counts as tags (★ mastered / perfect / completed, beaten, in progress), achievements with points, gamerscore or played, the completion % big, the card tinted to it, the glowing bar, and a Games meter: one segment per game in its status colour, started games lit to their %, with the number done (over 20 games, one segment per status sized by its number of games, so big series don't turn into hairlines).
- fix: **Sheet header** numbers no longer fade in on every open
  Only when they replace a loading shimmer. (A fill animation of the bar and tint on open was tried and removed: it blinked on the phone.) At 0% (anything under 1%) neither is drawn: no tint edge along the card's left side, no fill nub.
- improved: **Series page** game sheet shows points and progression from the start
  Points / gamerscore and RA's progression meter are in the header from the start (`build-series.js` adds `pts` and `prog` to each game), the panel height animates from the skeleton to the list, and the filter bar fades in. `useAnimatedHeight` moved from the three profile pages into `assets/sheet.js`, shared by all four sheets.
- improved: Games without art show a shared **library mosaic** instead of their blurred icon
  Games with no screenshot or wide art no longer show their own icon blown up and blurred behind cards, rows, strips and headers: they show one shared mosaic of art from the library (`assets/art-fallback.webp`): big and small RA / Xbox icons and wide Steam covers, uneven on purpose, tilted, each game at its own patch of it (`assets/art-fallback.js`) so neighbouring cards differ. Also the Playing tiles (hub and Activity) and the shared Series page's cards and sheets. One image for every page, cached once. `scripts/build-fallback-art.js` rebuilds it from the current library (`sharp` added as a dev dependency). In achievement sheets and page headers, where real art is blurred, the mosaic is blurred to match.
- new: **Timeline pieces** shared by the three profile Activity tabs
  In `assets/activity-ui.js`; the timeline styles moved from the Activity page into `assets/ui.css`.
- improved: **Heatmap legends** on the profiles sit on the right
  So they stay in view once the heatmap scrolls to the latest weeks.
- fix: **Sheet headers** no longer blink as they open on Android
  Both the achievement and series sheet headers: the blurred art faded in while the panel slid up, and the two together made the phone redraw the header for a frame. The art now fades in only if it arrives after the slide-up; art that's already loaded (most opens, it's cached from the list) just shows. Found with a temporary `?dbg` switch, now removed.

### Admin

- improved: **RA Guides** module removed
  The sheets no longer show guides.

## v26.11.06

RA games can have wide art from SteamGridDB, shown where Steam games show their store banner; Activity's Unlocks and Playtime views are redesigned.

### RetroAchievements

- improved: **Series covers** fall back to the game with the most unlocks
  On all Series tabs and the shared series: with no ★ cover set, a series uses the game where you've unlocked the most achievements, else the first game that has achievements, instead of simply the first game listed (Atelier showed a game with no achievement set).
- new: **Wide art** for RA games, shown in tiles like a Steam banner
  Picked in the admin, `data/ra/art.json`: a game with art shows its banner in tiles, like a Steam tile; rows (Recent, Progress, Last played, series sheets) and the achievement sheet keep the square icon, with the game's hero image faded behind rows and blurred behind the sheet and profile headers. Games without art, and any banner that fails to load, keep the icon-on-screenshot look.
- improved: **Series** with a wide-art cover game show its hero behind card and sheet
  A series whose cover (or most recently played) game has wide art shows its hero behind the card and the sheet header instead of the screenshot.

### Hub

- improved: **Shared series** show an RA cover game's wide-art hero
  An RA cover game with wide art shows its hero behind the card and sheet (and RA rows and game sheets there too).
- improved: **Header** blurs the latest RA game's hero when it has wide art
  When the latest game is an RA game with wide art, its hero is blurred behind the header instead of the screenshot, as on the RA profile.
- improved: **Playing tiles** use an RA game's wide-art banner as the cover
  Like a Steam game (same in Activity's Playing view).
- improved: Platform names and plain links become **platform icons** and **chips**
  "All 31 series across RA, Steam and Xbox" is now "All 31 series" with the three platform icons; the Playing link is chips with each group's colour dot (`+3 playing`, `2 on hold`); the desktop header's "RetroAchievements · Steam · Xbox" is platform chips with their icons.

### Completions

- improved: An RA **highlight** with wide art shows its banner
  An RA highlight (Mastered) with wide art shows its banner, like a Steam store banner; beaten rows keep the square icon with the hero faded behind (as on the RA profile rows), and the closed-year covers keep the icon.

### Activity

- improved: **Unlocks** and **Playtime** redesigned, platform filter at the top
  The platform filter sits at the top and drives the whole page.
- new: **Summary card** replaces the header counts, heatmap section and streak circles
  Three past-year numbers (unlocks or hours played, active days, best day), a bar with each platform's share, the last 14 days as bars (the current streak in gold, tap a bar to show that day) with the current and best streak as two small tiles (the current one gold while it runs), and the year heatmap. Folded by default on phones (a row with the last 14 days' total and the games played in them, the past-year total from tablet width up, and the 14 days as small bars at a fixed shape; tap to open, Less to fold, remembered per device) so the timeline starts on the first screen; open by default on desktop.
- fix: The **unlock count** covers the whole year, not only what's loaded
  The header unlock count was only the unlocks loaded so far (the last 91 days); the summary counts the whole year.
- improved: **Day headings** stick while scrolling; unlocks are one card per game run
  Day headings stick to the top while scrolling and say Today / Yesterday. Unlocks: one card per game run, headed by a band with the game's art faded in (Steam banner, the RA hero picked in the admin, else the icon blurred), a small icon and a bold title, with its achievements under it as rows with bigger badges (RA points, Steam rarity %), so game and achievement never look alike; runs longer than 5 fold after 4 with "Show N more". Days no longer collapse.
- improved: **Playtime** shows one row per game per day with a 24-hour track
  Instead of one card per session; the track shows when each session ran (estimated starts hatched), with the day's time and the unlocks it produced.
- improved: **Steam game strips** in Unlocks use the library hero instead of the banner
  The game's library hero is art without the logo, like RA's hero; it falls back to the store banner when Steam has no hero.
- improved: **Info text** hints removed, Playing's group rules become chips
  "Xbox doesn't report playtime" beside the filter and "tap a day to filter" removed (the split says Xbox n/a, the bars and heatmap are tappable). Playing's group rules are one chip at the end of each group heading (`Last 2 weeks, or 5h+ in 6`, `Idle 2–6 weeks`…) and "In rotation" has its own (`Unfinished · 1h+ played · Last 13 weeks`); the streak rule is a flame chip.

### Analytics

- improved: **Info text** redesigned: rules as chips, scopes as pills
  The grey sentence under each card title is gone. Rules show as a few small chips where they matter (Most progress `Sets of 10+ · ★ Completed`, Hardest earned `3+ unlocks · 30m+ played`), scopes as a pill beside the title (`Mon–Fri · 22 days`, `per unlock`), and cards whose list or legend already explains them carry nothing; lines that only restated the title are gone.
- improved: **Overview** change note becomes a chip with green ▲ / red ▼
  "change vs previous 30 days" is a chip with stacked green ▲ / red ▼ (`vs previous 30 days`), beside the playtime chip (`Playtime: RA + Steam`) that replaced the footnote.
- improved: **Notes** that repeated the filter chips are gone
  The period beside Top games, Focus and RA by console, "7 achievement farms hidden", the timezone beside When you play; tile notes "median start", "played or unlocked".

### All pages

- improved: **Series page**: "across RA, Steam and Xbox" is platform chips
- improved: **Profile Progress tabs**: the grey line under the views is chips
  Under the Nearly there / In progress / Abandoned views: `75%+ done` · `Fewest left first`, `Played in the last 30 days` · `Most recent first`, `Unfinished` · `Idle 30+ days`.
- improved: **Profile Activity tabs**: count and timezone chips, RA load meter
  The unlock count and timezone are chips ("click a day to filter" gone); RA: "Showing ~3 of 12 months — scroll to load more" is a bar of 3-month steps filling as you scroll, and the end of the year a chip with the year's unlocks.

## v26.11.05

Swiping between profile tabs looks like turning to another page; the RA Series tab is redesigned, with a sheet per series; desktop pages use the wider screen with a side rail.

### RetroAchievements

- improved: **Recent, Progress and Series** load a 12 KB game list instead of 5 MB
  About 440 KB less to download on a phone. A game's achievements load when its sheet opens, with a skeleton meanwhile.
- improved: **Series** redesigned as one card per series, with search and sort
  One card per series (two columns on desktop) with the cover icon, name, games · started · mastered, the completion % and last activity on the right, a progress bar and the strip of game icons, and the series art faded behind it. Search (series or game titles) with a sort (name, progress, recent) and All / Started / Not started chips. The art is the cover game's screenshot, else the screenshot of the most recently active game in the series (want-to-play entries only have an icon), else the cover icon blurred.
- new: **Icon strip** shows each game's status at a glance
  Mastered games have a gold border, started ones full colour, not started ones grey, and games without achievements are faint with a dashed border.
- new: **Series sheet** opens when you tap a series
  Points, achievements and % as value-over-label stats, the latest unlock, and the games grouped In progress / Mastered / Not started / No achievements in compact rows. A played game opens its achievement sheet, with a back arrow to the series; a want-to-play game links to RetroAchievements.
- fix: **Series sheet** sections are separate and game rows no longer stretch
  "Latest unlock" and "Games" are separate sections with the site's section headers (the status groups sit under Games), and game rows no longer stretch to fill a short sheet (the row class shares its name with Tailwind's `grow` utility).
- new: **Series sheet** shows mastery date and rarest achievement under mastered games
  A band under the row with the mastery date and the rarest achievement (badge, % of players, name), from the same award data as Completions.
- new: **Most games** sort on Series
  The same sort is on Steam and Xbox.
- improved: **Series** rechecked: 66 shown instead of 22
  Every series with 3+ games shows; 20 new ones (SaGa, Tetris, Monster Hunter, Metal Gear, DJMax, Ape Escape, Mother, Devil May Cry, Vanillaware, Chrono, Etrian Odyssey, Paper Mario, Disgaea…); missing games added to existing ones (about 30 Final Fantasy, 17 Pokémon, Persona and SMT, Tales, Zelda, Shining…). Subsets are no longer counted as games in a series, and a dead RA page left Mega Man. Sub-series nested in a bigger one (Mega Man X / Zero / Battle Network / Star Force, Crystal Chronicles, FF Tactics, Pokémon Mystery Dungeon, Swordcraft Story) stay hidden so games don't show twice.
- fix: **Last played** on Overview showed no achievements before the game list loaded
  The sheet now opens with a skeleton and fills in once the list arrives.
- new: **Beaten** group in the series sheet, counted on card and sheet
  Beaten games have their own group under Mastered (In progress · Mastered · Beaten · Not started · No achievements), and the card and sheet count them ("2 started · ★ 1 mastered · 1 beaten").
- fix: **Series sheet** rows keep the same height in long sheets
  A long sheet no longer squashes the mastered band onto its row; long game titles stay on one line (truncated) so every row is the same height.
- fix: **Back button** to the series no longer overlaps the game icon on desktop
  In the achievement sheet.
- improved: **Swiping between tabs** slides the next tab in as its own page
  The incoming tab slides in a gap away from the current one, and its skeleton has the tab's real shape (Overview's rows and stat tiles, Recent's search row and game rows or tiles, Progress's chips, Watchlist's rows, Activity's heatmap and timeline), capped to the screen height.
- improved: **Desktop** is 1200px wide with a two-column Overview
  At 1024px and wider the page is 1200px wide instead of 960, and Overview has two columns: Last played and Recent unlocks on the left, User stats (two across) and Game awards in a rail on the right. Recent unlocks shows the newest unlock and, on wide screens only, the next five as compact rows (badge, name, game, time, points) from the newest achievement file. The tab bar lines up with the header and content. Phones keep the same order; the section is now called "Recent unlocks".
- fix: **Watchlist** single games no longer stretch beside a subset card
  In two columns (tablet and desktop), a single game beside a game with subsets no longer stretches to the height of the subset card.

### Steam

- improved: **Tab swipe** as on RA, with skeletons in each tab's shape
  Skeletons shaped like Overview, Recent, Progress and Activity.
- improved: **Desktop** gets the wider layout with a side rail
  As on RA (User stats and Completions on the right); Recent unlocks lists the next five with their rarity.
- fix: **Achievement sheet** no longer hides the page's pinned tab bar
  The page behind no longer loses its pinned tab bar while a sheet is open (same on RA and Xbox).
- fix: **Game rows and series cards** show the store cover when hero art is missing
  Games without library hero art (Ys II, Tales of Symphonia, Atelier Sophie…) show their store cover faded behind instead of nothing.
- new: **Series** tab, like RA's
  Series you make in the admin (Steam → Series), shown once 3 of their games are in the library. Cards with the store banner, % complete and the icon strip; the sheet has hours played, achievements and %, the latest unlock (with the achievement's icon), and the games grouped In progress · Perfect · Beaten · Not started · No achievements, with the perfect date and the last achievement under perfect games. A game opened from it has a back button to the series.
- new: **29 series** to start with, from the library
  Franchises (Trails, Final Fantasy, Resident Evil, Ys, Gunvolt, Tales of, Mega Man, Neptunia, Batman, Warhammer 40,000 and Fantasy…) and studios (Supergiant, PlatinumGames, FromSoftware, Nihon Falcom, Inti Creates, Klei, To the Moon).

### Xbox

- improved: **Tab swipe** as on RA, with skeletons in each tab's shape
  Skeletons shaped like Overview, Recent, Progress and Activity.
- improved: **Desktop** gets the wider layout with a side rail
  As on RA (User stats and Completions on the right); Recent unlocks lists the next five with their gamerscore.
- new: **Series** tab, as on Steam
  Admin: Xbox → Series, 3+ games in the library, with gamerscore in place of hours and Completed for 100%.
- new: **4 series** to start with
  Fable (II, III, Anniversary), Final Fantasy, BioShock and Ninja Theory (Enslaved, both Hellblades).

### Hub

- new: **Series page** sheet shows the series' latest unlock
  Across RA, Steam and Xbox; tap it to open that game.
- new: **Series page** opens a game's achievements right there
  RA, Steam and Xbox in one list: points or gamerscore, rarity, unlock date, with a back button to the series and "Full details" to its profile sheet.
- improved: **Refresh** is an icon button after "Last change" in the header
  On phone and desktop (the icon turns while it works), next to a Changelog (newspaper) icon on phones, both centred on the text, so the app can be refreshed from Home. The duplicate "Refresh app" in the desktop footer is gone (the Changelog page keeps its own).
- improved: **Series page** opens a game's achievement sheet on its profile
  On RA, Steam or Xbox; want-to-play RA games and games without achievements still open their page on the platform. Profiles open a game's sheet from a link (`?game=`).
- new: **Series** section after Playing, and a Series page
  Series across RA, Steam and Xbox (Final Fantasy = 51 RA + 9 Steam + 5 Xbox games, FromSoftware with Elden Ring and Sekiro from Xbox, Armored Core from RA…), with the platform split on each card and a sheet of every game with its platform. Phone: the 3 most recently active series; desktop: 4 in two columns. 31 series to start with, edited in the admin.
- improved: **Desktop** is 1200px wide with a rail on the right
  At 1024px and wider: Playing and Recent activity in the main column and a rail on the right with the platforms stacked, then Completions and Analytics as cards (counts on one line with the latest completion below; the last-30-days numbers two across). The page is about a third shorter. Tablets and phones keep the single column.
- improved: **Recent activity** shows one row per game per day
  Instead of one per unlock, under day labels (Today, Yesterday, Sat 31 Oct). Each row has the game icon, the time played that day (RA and Steam play sessions), the unlock count, the unlocked badges with the newest one's name, and a Mastered / Beaten / Perfect tag on the day it happened. Games played without unlocking anything now show up. 6 rows, 4 on phones behind "Show more" (now in sentence case).
- improved: **Profile files** load once instead of up to three times
  The hub loads each platform's profile file once.

### All pages

- improved: **Sheet header art** is sharper and darker
  In achievement and series sheets: blur 3px instead of 6px, brightness 55% instead of 80%; art that falls back to an RA icon keeps the strong blur. The profile headers are unchanged.

### Pipelines

- improved: **RA games** split into an index plus one file per game
  Written as `games/index.json` (no achievement lists, with a summary per game) plus one file per game, like Steam; the old single `games.json` is removed on the first run.
- fix: **RA** games removed or reset on RetroAchievements now leave the site
  A game with unlocks that RA no longer lists is dropped from the games, its file and the unlock history, and counts as activity, so the next regular run publishes it. Before, every run started from the previous files and only ever added games, so a deleted game stayed for good (the Professor Oak Challenge hack).
- fix: **RA `--debug`** really writes nothing now
  It used to write the game files and skip only playtime and history.

### Admin

- new: **RetroAchievements → Art** to pick wide art from SteamGridDB
  Pick wide art for RA games (a banner, and optionally a hero for headers), searched by the game's title with the top match suggested; stored as image URLs in `data/ra/art.json`. Lookups go through the admin server (`scripts/lib/steamgriddb.js`, key `SGDB_API_KEY` in Credentials). A Marked filter (the default) lists the games worth doing first, with why: recently played, in Completions, or no screenshot (23 marked from the data); Mark / Unmark adds or removes any game, and "Unmark N done" clears the marks of games that already have art. The site doesn't use the art yet.
- new: **Shared Series** editor with every platform's games in one list
  Under General. Saving rebuilds the site's series file.
- new: **Series editors** for Steam and Xbox
  Same editor as RA, games from each platform's index; new series show on the site; a red count marks series under 3 games.
- fix: **Module title** could stay in the header after switching modules
  Two elements shared a React key, so the previous module's title could remain.

## v26.11.04

Filters and search look the same on every page: chips with their counts in one scrolling row, a roomy search with sort beside it, and one letter-case rule; Completions gets a stats band with the rarest achievement's icon.

### RetroAchievements

- improved: **Overview** Last played as a game row, user stats as tiles
  "Last played" is the same game row as Recent and Progress (tap opens the achievement sheet), with the rich presence inside it, marked with a cyan broadcast icon. User stats are tiles (value over label, two across on phones, three on desktop) instead of the dotted list; numbers already in the header aren't repeated, and the softcore and beaten stats sit behind "More stats".
- new: **Overview** tab and a pinned, swipeable tab bar
  Same on Steam and Xbox. A new **Overview** tab, the default, holds what used to sit above the tabs (most recently played and unlocked, user stats, game awards). The tab bar is one compact row (icon + label) that stays pinned to the top while you scroll, scrolls sideways when the tabs don't fit, and slides its underline to the active tab; picking a tab starts it at its top. On phones the tab content swipes like a carousel: it follows your finger with the next tab sliding in as a skeleton, which renders for real once it has landed; a short drag springs back (swipes on rows that scroll sideways, and vertical scrolls, are left alone). The floating tab pill is gone.
- new: **Recent** gets a search field over every game
  Replaces the "Recently played · 15 games" line, with the list / tiles switch at full size; it searches every game, newest played first. All profile searches ignore accents ("pokemon" finds "Pokémon").
- improved: **Watchlist** redesigned as a list in the style of the game rows
  Instead of the dense table: bigger icons and titles, console · points on one line, the status once on the right, two columns on desktop, with group headers that open and close.
- new: **Watchlist** stacks a game's subsets under it as one card
  The name and console on top, then a row per set, "Base set" first, each with its own icon, points and progress. Combined entries like "HeartGold | SoulSilver" collect the subsets of both games. New "Group: Subsets" option (with / without subsets; "Without subsets" starts closed).
- fix: **Watchlist** no longer blinks while scrolling
  Its rows were rebuilt (and replayed their fade-in) on every re-render, e.g. when the floating tab pill appeared.
- improved: **Profile header** redesigned with a three-number strip
  Same on Steam and Xbox: avatar beside the name, rank and last active, the motto under them, then the three headline numbers in a strip (Points · Achievements · Mastered) instead of small pills. On phone it's shorter and left-aligned with "member since" beside last active; on desktop the numbers sit on the right.
- fix: **Blurred header art** could stay invisible when the image was cached
  The load event was missed; fixed for headers and the achievement sheet.
- improved: **Completion Progress** filters in one chip row, search and sort below
  The views (All · Nearly there · In progress · Abandoned) and the "+ Mastered" toggle are one chip row; search, the Sort dropdown and the list / tiles switch share the next row; the game count and the view's rule are one muted line below. The SORT label and the separate sort chips are gone.
- improved: **Watchlist** filters as search, a Group dropdown and status chips
  Search and a Group dropdown on one row, then the status filters as chips with their counts (All · Not started · In progress · Mastered · No achievements), then one summary line with "Clear filters". It replaces three wrapped rows of uppercase buttons and the long stats line.
- improved: **Achievement modal** Status and Type filters in one chip row
  All · Unlocked · Locked │ Progression · Missable; tap an active type again to clear it.

### Steam

- improved: **Overview** Last played as a game row, user stats as tiles
  "Last played" shows the game's latest unlock inside it, and user stats are tiles, as on RA. The games index now also loads on Overview, for the row's progress.
- new: **Overview** tab, pinned tab bar, tab swipe and Recent search
  As on RA.
- improved: **Profile header** redesigned like RA's
  With Played · Games · Achievements in the number strip.
- improved: **Completion Progress and achievement modal** filters as chips
  In the same chip style as RA.

### Xbox

- improved: **Overview** Last played as a game row, user stats as tiles
  "Last played" shows the game's latest unlock inside it, and user stats are tiles, as on RA. The games index now also loads on Overview, for the row's progress.
- new: **Overview** tab, pinned tab bar, tab swipe and Recent search
  As on RA.
- improved: **Profile header** redesigned like RA's
  With Gamerscore · Games · Achievements in the number strip.
- improved: **Completion Progress and achievement modal** filters as chips
  In the same chip style as RA.

### Completions

- improved: **Filters** in one chip row, total as plain text
  All · RA · Steam · Xbox │ Beaten · Hacks · Homebrew · Prototypes, where "+" means left out and "✓" included. The total in the header is plain text instead of a box.
- new: **Stats band** under completed highlights, with the rarest achievement
  Like the Playing tiles (darker strip, value above its label): achievements, time played, and the rarest achievement with its icon, rate and name. Steam / Xbox take it from the game's own file, RA from the award (pipeline); bands line up at the bottom of each row.
- improved: **Stats band** has fixed proportions so values line up
  Achievements and time played in two equal centred columns, the rarest achievement in a wider left-aligned one, so short values no longer pile up on the left and most achievement names fit on one line; longer names wrap to two lines before truncating (phones have no hover to show the rest).
- improved: **Beaten rows** stay one line per line
  Long titles and achievement names are truncated (full text on hover); Steam / Xbox rarity shows as the coloured rate, the tier in the tooltip.
- improved: **Closed years** show ★ and medal counts in fixed columns
  Counts as ★ complete and a medal for beaten, in fixed columns so every cover strip starts at the same place; the covers (all of them now) scroll sideways on phone and the ★ badges are no longer cut off.
- fix: **Opening a closed year** keeps it in its place
  It stays between the others; before, open years jumped to the top.

### Pipelines

- new: **RA awards** carry their rarest achievement
  Mastery / completion awards carry `rarest` (name, badge, unlock rate among players of the award's mode) for the Completions highlights.

### Activity

- improved: **Header counts** are a plain text line
  The counts (unlocks, RA, Steam, Xbox; playtime totals; Playing groups) are a plain text line instead of boxes that looked like filters.
- improved: **Platform filter** is a chip row under the section title
  Instead of tiny boxes squeezed into it; the Unlocks / Playtime / Playing switch is in sentence case.

### Analytics

- improved: **Period and platform** filters are chip rows
  No more two-line uppercase period buttons on phone; "Hide farms" is a toggle chip with the farm count; the date range is a muted line.

### Hub

- new: **Header** in the profiles' style with a totals strip
  Avatar beside the name and last change, the motto, the genre tags in one row that scrolls sideways, and a totals strip across platforms (hours played, unlocks, completed). Your latest played game's art (RA or Steam) is blurred behind it; on desktop the totals fill the right side.

### All pages

- improved: **Filters** a size up, closer to the earlier redesign
  30px chips with 12.5px text, a 34px search field, the list / tiles switch at the same height, and sort / group as a button with a sliders icon.
- improved: **Counts** move inside the filter chips
  Completion Progress (All 85 · Nearly there 4 · In progress 3 · Abandoned 78, from the same rules as the list), the achievement sheet (All · Unlocked · Locked · Progression · Missable), Completions (All · RA · Steam · Xbox); the separate count lines are gone. The watchlist search reads "Search 808 games"; its summary line only shows while a filter narrows the list.
- improved: **Guides / Videos** links in the achievement sheet are regular chips
- improved: **Letter case** follows one rule everywhere
  UPPERCASE only for section headers, tabs, table headers and status tags; sentence case for everything you read or tap. Changed: Analytics tile, tooltip and legend labels, the Table button; Activity game names in the day groups (no longer uppercased), streak days, the Playing tiles' labels; profile header pills, the sheet's progress-bar labels, award details, Show all buttons; Steam / Xbox user stats and watchlist statuses from Title Case ("Total Games" → "Total games").

### Structure

- new: **Shared filter styles** in `assets/ui.css`
  `.frow`, `.fchip`, `.fsep`, `.fbar`, `.fsearch`, `.fselect`, `.fmeta`, now also linked from Activity and Analytics. A row that overflows fades out at its right edge until scrolled to the end (scroll-driven CSS, no script).

## v26.11.03

Five pieces from the design review folded into the current look: the achievement modal opens as a swipe-up sheet on phone, the Hub's platform cards become one compact strip, profile headers show your latest game's art, game lists get a list/tiles switch, and Completions gets a new layout.

### RetroAchievements

- new: **Achievement modal** slides up as a sheet on phone
  Full width, covers the bottom nav, and closes by dragging the header down, tapping outside, ✕ or Escape. On desktop it stays a centred dialog. Both get a new header: the game's screenshot blurred behind it and a round close button.
- new: **List / tiles** switch on Recent Games and Completion Progress
  Replaces the detailed game cards. List = one compact row per game (icon, title, console, Hardcore flame / Softcore feather, tags, playtime · last played, count and bar, with the screenshot fading in on the right and the status stripe); tiles = the icon over its blurred screenshot, last played, mode, title, console, one bar, count and playtime, status colour on the bottom edge. Two columns of rows or four tiles across on desktop. The choice is remembered per device and shared by the three profiles. Tap a game for its achievements.
- improved: **Guide links** moved into the achievement modal
  The guide links (GameFAQs, YouTube, your own guides) moved from the game cards into the modal, under the genre line; badge previews and the progression bar live there already.
- new: **Profile header** shows the latest game's screenshot behind it
  The most recently played game's screenshot, blurred and fading into the page; layout and content unchanged.
- fix: **Games with no screenshot** use their own icon instead of the placeholder
  A game with no screenshot (RA's "no image" placeholder, e.g. Poring Clicker) uses its own icon, zoomed and blurred, wherever the art sits behind something; before, the placeholder image showed.

### Steam

- new: **List / tiles** switch on Recent Games and Completion Progress
  The same switch as RA. Rows show the full store banner; tiles show it uncropped on top.
- new: **Profile header** shows the latest game's hero art behind it
  The most recently played game's store hero art, blurred.
- new: **Achievement modal** as a swipe-up sheet on phone
  With the game's store hero art blurred behind the header (the header banner when there's no hero) and the round close button.

### Xbox

- new: **List / tiles** switch on Recent Games and Completion Progress
  The same switch as RA. Rows and tiles show gamerscore where Steam shows playtime (Xbox doesn't report playtime).
- new: **Profile header** shows the latest title's hero art behind it
  The most recently played title's hero art, blurred.
- new: **Achievement modal** as a swipe-up sheet on phone
  With the title's hero art blurred behind the header and the round close button.

### Hub

- improved: **Platform strip** replaces the three tall platform cards
  On phone one row per platform with its three headline numbers (RA points · mastered · unlocks, Steam hours · perfect · unlocks, Xbox gamerscore · completed · unlocks) and a chevron to the profile, about a third of the height; on desktop three cells side by side, each with its three most recently played covers instead of the recent-games rows. Rank, beaten, games and the other counts are on each profile.

### Completions

- improved: **New layout** with highlights for completed games and rows for beaten
  A completed game (★ Mastered / Perfect / Completed) is a **highlight**: its art banner (Steam store banner uncropped, RA screenshot with the icon over it, Xbox hero), platform, Hardcore and date on the art, then achievements, time played and the **rarest achievement** in its rarity colour (from the unlock history). A beaten game is a compact silver row with its art faded behind and the achievement that beat it: Steam's hand-picked win condition with its rarity, RA's win condition with its hardcore (or softcore) unlock rate.
- new: **Year summary** line and month timeline
  Each open year starts with a summary line (`5 ★ complete · 4 beaten · 127h played`); on phone the entries follow a month timeline, on desktop the completed games sit three across with the beaten rows below. Closed years are one line each with their covers (★ on completed ones), two columns on desktop.
- improved: **Wider page** on desktop
  Wide enough to fit three highlights per row.

### Pipelines

- new: **RA awards** carry the game's screenshot and win condition
  Each game award in `profile.json` also carries the game's screenshot (`imageIngame`), for the Completions highlights without loading `games.json`, and each beaten award its win condition (`winCondition`: the first win-condition achievement unlocked, with its unlock rate among players of the same mode). Until the next RA run writes them, highlights use the game's icon, zoomed and blurred.

### Structure

- new: **`assets/tabs.js`** for the profile tab bar and tab swipe
  Profile tab bar + swipe between tabs, precached.
- new: **`assets/game-view.js`** remembers the list / tiles choice
  The remembered list/tiles choice, `gh:gameView`.
- new: **`assets/sheet.js`** and **`assets/ui.css`** shared by the profile pages
  `assets/sheet.js` (sheet behaviour: drag to close, close animation, Escape, scroll lock, art fallback chain) and `assets/ui.css` (sheet layout, blurred art backgrounds); both precached (`CACHE_NAME` v10).

## v26.11.01

A Playing list for the games in rotation, a platform filter on Analytics, and pipeline data moved to its own branch; the floating tab pill on the profile pages stays on screen again.

### Hub

- new: **Playing** section at the top of the hub
  On mobile and desktop: the 4 most recent games in rotation as tiles like the Activity view (cover, status, last played, achievement progress, 13-week play strip), 2×2 on mobile and one row on desktop, with a link line for the rest (`+4 more playing · 1 on hold`).

### Activity

- new: **Playing** view for the unfinished games you're putting time into
  `?view=playing`: the unfinished games you've put time into in the last 13 weeks, as a grid of game tiles (2 across on mobile, 4 on desktop) sorted by last played, filterable by platform. Each tile has the cover art, a Playing / On hold / Drifting chip, how long ago you played, achievement progress, a 13-week strip of the weeks you played it, and average session, session count (13 weeks) and all-time playtime. Mastered/Perfect games and achievement farms are left out; a Beaten game shows only while you keep playing it after the credits.
- improved: **Playing** tiles split into Playing, On hold and Drifting sections
  Each with its count and what it means; an empty group is left out. The status chip on each cover is gone (the section heading says it); the hub tiles keep theirs.
- improved: **Playing** covers RA and Steam only
  It's measured in play time, which Xbox doesn't report, and judging Xbox by unlocks missed games played without unlocking anything. The Xbox filter is gone from this view.
- improved: **Rotation rules** keep long games and new starts in Playing
  Playing = played in the last 2 weeks, or within 6 weeks for a game with 5+ hours in (a long RPG you come back to stays Playing); a game touched in the last 2 weeks needs 30 minutes instead of an hour, so one you just started shows up.
- improved: **View switch** reads Unlocks | Playtime | Playing
  The switch reads **Unlocks | Playtime | Playing** and sits on its own full-width row on mobile.

### Analytics

- new: **Platform filter** next to the period
  All · RA · Steam · Xbox, kept in the URL (`?platform=`). It scopes every section like the farm filter; charts narrow to that platform in its own colour, Overview drops tiles of other platforms (RA points, gamerscore), Time of day shows one row, RA by console only shows for All and RA. Xbox has no playtime, so its view keeps the achievement sections (unlocks, gamerscore, rarity, unlock hours, completion) and notes that playtime isn't reported.
- improved: **Farms hidden** note only shows when Steam is in view
  The "achievement farms hidden" note.

### Pipelines

- improved: **Pipeline output** moved off `main` to a **`data` branch**
  Each run restores the branch into `data/`, runs the pipelines and commits only there; the midnight run squashes it to one commit, so it holds at most a day of history. `main` now only gets code commits (it had 4,783 pipeline commits vs 139 code commits).
- new: **`deploy.yml`** deploys the site from `main` plus the `data` branch
  Pages source: GitHub Actions; combines `main` with the `data` branch at the same paths, and a pipeline run that changed data deploys right after. Site URLs, the app and the service worker are unchanged.
- improved: **Faster runs** by checking out only the tip of the `data` branch
  22 s → 2 s per run; the full checkout fetched every branch's history.

- new: **RA lifetime playtime** for every game in `profile.json`
  Every game in `gameAwardsAndProgress` gets its lifetime `playtime` (minutes), for the Playing tiles' all-time playtime without loading `games.json`.

### Structure

- new: **`scripts/data-paths.json`** lists what lives on the `data` branch
  One list for the workflow, the deploy and `npm run data:pull`; generated files are gitignored on `main`. `npm run data:pull` fetches them for local work and keeps an untouched copy for the admin Data Diff, which now diffs generated files against it.
- improved: **Private files** excluded by the deploy step instead of Jekyll
  Jekyll's `_config.yml` is deleted, along with the unused `data/steam/achievements.json`.
- new: **Backups of `main`** from before the move
  `backup/main-2026-11-01` and a local git bundle; `backfill-playtime.js` defaults to the backup branch, the last place the hourly snapshots exist.

- new: **`assets/playing.js`** holds the shared rules for the Playing list
  Computed in the browser from play sessions, recent unlocks, RA awards and win conditions (no new pipeline file). Added to the service worker precache (`gaming-hub-v9`).
- improved: **CLAUDE.md** says the site is mobile first
  Features join an existing bottom-nav tab instead of adding a sixth.

- fix: **Floating tab pill** on mobile shows above the nav bar again
  On RA, Steam and Xbox it only showed at the very bottom of the page instead of above the nav bar. The shared animation classes (`.anim-in`, `.anim-fade`, `.anim-pop`, `.anim-backdrop`, plus the admin copy and the hub fades) kept their end state with `animation-fill-mode: both`, and a transform animation that stays in effect makes `<main class="anim-in">` the containing block for its `position: fixed` children. They now use `backwards`, which looks the same once the animation ends.

## v26.10.13

Chevron icons and an Analytics strip on the hub; every component now animates.

### RetroAchievements

- improved: **Animations** added where things used to pop in
  The Guides/Videos dropdown, Activity content, expanded days, Clear filter, the "all 12 months loaded" line, Watchlist groups and Clear ×, the Progress empty state, the filter bar and its sort row on a view change, tab underlines, tooltips (modal and hover cards), the error screen and the scroll-to-top button.
- fix: **Series** tab shows card skeletons instead of jumping numbers
  Skeletons stay until the series list and games have loaded, instead of watchlist-only numbers that jumped, and "No series flagged" waits for the series list.
- fix: **Watchlist** tab shows skeleton rows while the list loads
  Shown while the want-to-play list loads, instead of flashing "No games match".
- fix: **Empty Activity day** gets its own message
  It now says "No achievements on this day." instead of the 180-days message.

### Steam

- improved: **Animations** added across the profile
  Activity content, its empty state, expanded days and Clear filter, the Recent list, the achievement modal's filter bar, the Beaten badge (the card stripe colour now transitions too), the last-unlock line, Completions "Show all", tab underlines, the filter bar, the error screen and the scroll-to-top button.

### Xbox

- improved: **Animations** added, the same as on Steam

### Hub

- improved: **Analytics strip** names the busiest part of the day by its hours
  It shows "Mostly 17:00–22:00" instead of "in the evening".
- improved: **Desktop footer** no longer links Analytics
  The strip covers it (Changelog and Refresh app stay).
- fix: **Completions** and **Analytics** strips no longer push Recent Activity down
  They show at once with skeletons and fade in, instead of appearing late and pushing Recent Activity down (they hide again if empty or on error). Header name, motto, last-change date, footer URL and the mobile "Show more" button fade in too.

- improved: **View all** links become a chevron icon
  The "View all →" text on the Completions strip and the Recent Activity header is now a chevron-right icon (inline Lucide SVG, the hub doesn't load Lucide). The Activity link keeps "View all activity" as its accessible label and tooltip, with a slightly larger click area.
- improved: **Platform cards** use the same chevron in their footer
  The "View full dashboard" footer arrow uses the same chevron.
- new: **Analytics strip** under Completions with your last 30 days
  On desktop: hours played, unlocks, the part of the day you play most and top game, linking to Analytics. It replaces the small "Analytics" text link in the header and matches the Analytics page's default view, farms hidden, in your timezone. The activity feed and the strip share the achievement file requests.
### Completions

- improved: **N total** badge fades in

### Activity

- fix: **Playtime pills** show skeletons instead of a jumping "0m"
  Skeletons stay until the playtime files load, instead of "0m" that jumped to the real values; both pill rows fade in and swap with a fade.
- improved: **Heatmap** and streaks fade together on a platform filter change
  Empty days, Clear ×, the "since" label and the scroll-to-top button fade in too.

### Analytics

- improved: **Scroll-to-top button** fades in

### Structure

- improved: **Animation rule** added to `CLAUDE.md`
  Every component that appears, loads, expands or swaps content animates, and late-loading sections show a skeleton instead of jumping in.
- fix: **Mobile nav** popup backdrop fades with the popup
  It snapped before; the popup also respects reduced motion.
- improved: **Changelog page** releases badge and load error fade in

### Admin

- improved: **Admin** page now animates with its own copy of the motion classes
  Copied in because its local server only serves that page: module switches, loaded views, detail panes on each selection, the series modal, Saved/Saving, added tags/groups/links, win-condition controls, server status and pipeline buttons now animate.

## v26.10.10

Xbox sync paused.

### Pipelines

- improved: **Scheduled data runs** skip Xbox for now
  Switched off with `XBOX_ENABLED` in `fetch-data.yml`: no Xbox play lately, and OpenXBL intermittently refused the first request with 429 even with quota left, failing about 1 in 20 runs (RA and Steam were unaffected). A manual run with `platforms: xbox` still syncs it.

## v26.10.04

Playtime is now logged as play sessions for Steam and RetroAchievements, with history back to late March; the Activity page gets a Playtime view, and a new Analytics page.

### Steam

- improved: **Win conditions** added for 65 played JRPGs
  Ending achievements that mark a game as beaten, for JRPGs and JRPG-style games, each checked against achievement guides: Ys, Trails, Final Fantasy, Tales, Agarest, Neptunia, God Eater, Digimon, Chained Echoes and more; usually any-difficulty or any-ending clears count.
- improved: **Win conditions** added for 127 played story-driven games
  Batman Arkham, BioShock, Resident Evil, Metro, Tomb Raider, Devil May Cry, Telltale, Hollow Knight, Celeste and more, each taken from the achievement's own wording or checked against guides; games with no achievement marking the ending are left without one.

### Activity

- new: **Achievements | Playtime** switch in the header
  The view is kept in the URL (`?view=playtime`).
- new: **Playtime view** with a minutes heatmap, streak and session timeline
  Heatmap of minutes played per day in your timezone (sessions crossing midnight are split between the two days), streak of days with 15+ minutes, and a timeline of play sessions with start–end time, duration and the number of achievements unlocked during each session.
- new: **Hours played** in the past year shown in the header
  For RA and Steam; Xbox is marked n/a (it doesn't report playtime).
- improved: **Streak panel** and streak calculation shared by both views
- improved: **Playtime streak circles** show only the largest unit
  `45m`, `2h`, `1d`, rounded down; hover for the exact time.

### Analytics

- new: **Analytics page** with one period selector for everything
  At `/analytics/`: the period (30 days, 12 months, this year, all time) scopes everything, in your timezone.
- new: **Overview tiles** with change vs the previous period
  Hours played, active days, sessions, average session, achievements, RA points, gamerscore, completed games.
- new: **Charts** for trends, when you play, top games, rarity and completion
  Trends (hours played, achievements unlocked), when you play (day × hour punchcards for playtime and unlocks), top games, session lengths, rarity profile with rarest unlocks, completion funnel per platform with median days to complete, and RetroAchievements by console.
- new: **Tooltips and a Table toggle** on every chart
  Hover/focus tooltips.
- new: **3 months** period between 30 days and 12 months
  With weekly bars; the ★ for games completed in the period is gold.
- new: **Hide achievement farms** checkbox, on by default
  Removes Steam games that hand out more than 15 achievements per hour of playtime (Slash It, Lines X, …) from every section.
- improved: **Top games** gets Most progress and Almost complete
  Most progress (share of each game's achievements earned in the period, sets of 10+) and Almost complete (unfinished games closest to 100%) replace "Most unlocks", which farm games dominated; minutes per achievement now lists the slowest first.
- improved: **Almost complete** only lists games played in the selected period
  Or with an unlock in it; All time still shows every unfinished game.
- improved: **Completion funnel** gets a Beaten stage for Steam and Xbox
  Games whose ending achievement from the admin's win conditions is unlocked, plus 100% games, like RA.
- improved: **RA games** show their subset badge and tilde tags
  Homebrew, Hack, Demo, Prototype, wherever they appear, so e.g. the original and Homebrew 2048 are told apart.
- improved: **Session lengths** start at "<30m"
  The "<5m" bar is gone now that launches of 5 minutes or less aren't logged.
- improved: **When you play** now answers the question directly
  Peak time (busiest 2-hour window of the week), favorite day, weekend and after-midnight share, typical start time and busiest day, plus a Time of day split (morning, afternoon, evening, night; overall, RA and Steam) and average playtime per weekday.
- new: **Weekdays by hour** and **Weekends by hour** charts
  Average playtime in each hour of a weekday and of a weekend day, bars with a line over them showing when play picks up and winds down. They replace the playtime-by-hour grid.
- improved: **Unlocks by hour** shows averages with a clearer color scale
  The average per weekday-hour instead of totals, with square cells and a square-root color scale, so wide ranges no longer turn every square the same dim blue. The tooltip shows the average and the total.
- new: **Top unlock hours** dial with your top 6 hours
  A 24-hour dial shaded by unlocks per day in each hour, with the top 6 hours numbered and listed with the weekday that peaks in each.
- new: **Focus** section on how spread out your play is
  Share of playtime on the top game, games per week, new games started (and completed) in the period, and games tried and dropped (under an hour played, untouched for 30+ days), each with a list.
- improved: **Minutes per achievement** renamed to **Hardest earned**
  Most playtime per achievement.

### Hub

- improved: **Mobile bottom nav** gets Stats (Analytics) in place of Log
  The changelog is linked from the hub header on mobile; on desktop the header links Analytics and the footer links both.
- improved: **Service worker** precaches the Analytics page
  Cache `gaming-hub-v7`.
- improved: **Changelog page** gives each section its own heading color
  Hub, Completions, Activity and the new Analytics section each get their own (they shared one); Analytics sorts after Activity.

### Structure

- new: **Motion** across the site: page cross-fades, content fade-ins, modal pops
  Page switches cross-fade (View Transitions; the top bar and bottom nav stay put), content fades in as it replaces the loading skeleton, and tab, view, period and filter changes fade the new content in. Modals pop in. Shared in `assets/motion.css`; off when the system asks for reduced motion.
- improved: **Filter changes** fade the updated list in
  Achievement modal filters, profile Progress sort and view, RA watchlist filters, picked heatmap days, the Activity heatmap platform filter, and the Analytics chart/table toggle; "Show all" items fade in.
- improved: **Achievement modals** animate their height and open immediately
  Height animates when the content changes (a filter, or loading finishing). Steam and Xbox modals now open immediately with a skeleton list and fill in place when the game's achievements arrive, instead of showing a separate loading box first.
- improved: **Shimmer skeletons** replace the remaining "Loading…" text
  Steam/Xbox game lists and Activity tab, the achievement modal while it loads, Activity's play sessions, and the hub's name, motto and "Last updated".
- improved: **Last updated** now reads "Last change"
  "Last updated" (hub, Steam and Xbox profiles) and "Data as of" (RA profile): the data only changes when you play or unlock something, plus the daily refresh.

### Pipelines

- new: **Play sessions** logged from Steam and RA lifetime playtime
  Each game's lifetime playtime becomes play sessions in `data/{steam,ra}/playtime/{YYYY}.json` (start, end, minutes), compared against a baseline in `playtime/state.json`. Session times come from the game's last-played time, which Steam moves to the session end when it closes.
- improved: **Playtime corrections** and unknown games aren't logged as play
  Server-side playtime corrections, negative changes and games the baseline never listed are not logged as play; the first run only records the baseline.
- fix: **Long sessions** no longer split in two
  A session that starts within 5 minutes of the same game's previous one is merged into it: Steam saves playtime every 30 minutes while a game runs, which split long sessions in two (e.g. Final Fantasy XVI on 22 Sept showed 1h + 29m instead of 1h 29m). History rebuilt: Steam 103 → 85 sessions, RA 331 → 301, same total hours.
- new: **Playtime backfill** from the snapshots in git history
  `scripts/backfill-playtime.js` replays the hourly snapshots through the same logic: 103 Steam sessions (76.5 h) since 2026-03-25 and 331 RA sessions (85.3 h) since 2026-03-27.
- improved: **Shared playtime logic** in one file, `state.json` kept off the site
  Shared logic lives in `scripts/lib/playtime.js`; `state.json` files are excluded from the site.
- new: **All-time unlock history** written by RA, Steam and Xbox runs
  `data/{ra,steam,xbox}/history/{YYYY}.json` (time, game, achievement, points, rarity) plus an `index.json` of the years, for the Analytics page (`scripts/lib/history.js`).
- improved: **RA play sessions** record each game's console
  For the Analytics console breakdown.
- improved: **Regular runs** only commit when you played or unlocked something
  Regular (incremental) RA and Steam runs only write (and commit) when you unlocked something, played, or changed the RA want-to-play list. Rarity, RA rank, 7/30-day points and Steam presence refresh in the midnight run instead of drifting in every commit.
- improved: **Files** are only rewritten when their content changes
  The 91-day achievement chunks are cut at UTC midnight instead of the run time, and RA chunks drop the unused `cumulScore`.
- improved: **Unlock history rarity** only refreshed at midnight
  Incremental runs keep the stored values and only add new unlocks.
- improved: **Data workflows** merged into one, `fetch-data.yml`
  The three workflows become one, running RA, Steam and Xbox one after another and making at most one commit per run (`chore: update data (ra, steam) …`). A platform that fails doesn't stop the others; the run is marked failed at the end. Manual runs pick a `mode` and `platforms`.
- fix: **Data runs** now start on time through cron-job.org
  Runs are started through the `workflow_dispatch` API (incremental every 30 minutes at :15 and :45, `midnight` refresh at 00:00 UTC): GitHub's scheduled runs arrived hours late (midnight refreshes at 03:00–05:30 UTC, "hourly" runs about every 3h). The run mode comes only from the `mode` input, never `github.event.schedule` (empty on a dispatch). A 6-hourly schedule stays as a fallback.
- fix: **Pushes** rebase and retry once when `main` moved during the run
- improved: **Short sessions** of 5 minutes or less are no longer logged
  They're launches (a wrong game, checking an RA hash), not play. A short piece that continues a logged session is still kept. The 85 existing ones were removed (RA 302 → 199 sessions, Steam 86 → 83).

## v26.09.27

Add a not-found page; sharper Xbox icon; days and times now follow your own timezone instead of UTC; new app icon.

### RetroAchievements

- fix: **Activity** tab days and times follow your timezone
  Heatmap days, the day timeline and session times now use your timezone (clock times were the raw UTC `HH:MM`); the timezone name (e.g. `Asia/Jakarta`) is shown in the Activity header.
- improved: **Heatmap** built in the browser from all four achievement chunks
  Loaded together when the tab opens, instead of `heatmap.json`, whose totals are per UTC day and can't be regrouped; the timeline still reveals one chunk at a time.
- fix: **RA dates** now parse as UTC
  RA's zone-less UTC dates (`2026-09-26 06:50:54`) were parsed as local time in the game modal's "Unlocked" date and in several sorts (and not at all in Safari); they now parse as UTC.
- fix: **Activity** lists sessions newest first and finds older heatmap days
  Sessions within a day were oldest first; clicking a heatmap day in an older part of the year now reveals chunks until that day appears (it stopped after one).

### Steam

- fix: **Activity** tab heatmap and timeline follow your local days
  Built from all chunks, with the timezone name in the header.
- improved: **Activity** tab groups a day into sessions, newest first
  Sessions of consecutive unlocks in the same game, like cheevo-tracker (all of a game's unlocks for the day were merged into one group, oldest group first).

### Xbox

- improved: **Xbox icon** replaced with the sharp official app icon
  The official 192×192 app icon from xbox.com (was a 15×15 favicon that looked blurry on the hub card, Activity feed, Completions page and Xbox profile header); `scripts/download-assets.js` now tries that source first.
- fix: **Activity** tab heatmap and timeline follow your local days
  Built from all chunks, with the timezone name in the header.
- improved: **Activity** tab gets the same session grouping as Steam

### Hub

- fix: **Today / Yesterday / Nd ago** labels count calendar days in your timezone
  They were 24-hour windows, and RA dates parse as UTC.

### Completions

- fix: **Completion dates** and month groups use your timezone
  Dates, month groups and the same-year dedupe all use it (dates and months were UTC while the dedupe year was local, so they could disagree around New Year); timezone name shown in the header.

### Activity

- fix: **Heatmap**, streaks, day groups and times use your timezone
  Times were shown in UTC and days grouped by UTC date; heatmaps are built from all chunks instead of `heatmap.json`; timezone name shown next to the heatmap title.
- improved: **Day groups** split into sessions of consecutive unlocks
  Sessions in the same game, newest first, like cheevo-tracker; playing A → B → A now shows three sessions in timeline order (all of a game's unlocks for the day were merged into one group).

### Structure

- new: **Save Crystal** app icon
  Three floating shards in RA gold, Steam blue and Xbox green forming one crystal, a JRPG save point for all your progress. Replaces the old trophy-on-controller icon in `appicon.png`, `icon-192.png`, `icon-512.png`; source kept as `assets/appicon.svg`. App icons are full-bleed with the art inside the maskable safe zone.
- new: **Favicon** and Apple touch icon on every page
  `favicon.svg` + `favicon.ico`, crystal enlarged so it reads at 16 px — previously only the 404 page had one.
- new: **Shared time helpers** in `assets/time.js`
  UTC parsing incl. RA's zone-less format, local day keys, local date/clock formatting, heatmap builder; precached in the service worker (cache `v6`). The pipelines no longer write `achievements/heatmap.json` (RA, Steam, Xbox) and the files are deleted — the site builds heatmaps from the chunks.
- new: **Not-found page** for missing pages under `/gaming-hub/`
  New `404.html`: a menu-styled "Area not found" card with links back to Gaming Hub and to the home page, instead of GitHub's default 404. It reuses the root site's design system (`/assets/noah-ui.css` from yozuryu.github.io) and uses absolute URLs so it works at any depth.
- fix: **Backlog** git remote command uses the SSH alias
  Corrected in `manual-todos.md` to use the `github-yozuryu` SSH alias.

## v26.09.26

Keep beaten and completed as separate milestones when they happen in different years; show RA playtime on completions; standardize Beaten on silver; app updates now show up without a manual cache bump; RA Game Awards and Steam Completions panels show 2 rows with a Show all toggle; Progress tabs get Nearly there / In progress / Abandoned views and a mobile-friendly filter bar; Xbox joins the site with its own profile page, hub card, and Activity/Completions support.

### RetroAchievements

- improved: **Watchlist rows** use the same stripe colors as game cards
  Silver for beaten games (previously blue), and `#323f4c` for not started (was a lighter gray).
- improved: **Beaten** cards and award badges use silver
  Stripe `#b8c4ce`, badge `#2a3440` / `#c6d4df` instead of gray/slate; Game Awards header Beaten count also silver.
- improved: **Beaten icons** in Game Awards get a silver border
  A 1px solid silver border (was a faint gold border); Mastered keeps 2px gold.
- new: **Completion Progress** views: **All / Nearly there / In progress / Abandoned**
  From cheevo-tracker: Nearly there = 75%+, fewest left first; In progress = played in the last 30 days; Abandoned = quiet for 30+ days; each non-All view shows its rule.
- improved: **Mastered games** hidden from Completion Progress by default
  With a Mastered toggle in the All view; Overall/Progression sort stays in the All view; game count and an empty-state message added.
- improved: **Progress filter bar** redesigned for mobile
  Views become a full-width segmented control, sort becomes a compact dropdown.
- fix: **Last-played dates** parsed in a Safari-safe way for the Progress views
- improved: **Game Awards** panel shows 2 rows with Show all
  The first 2 rows of icons, with a "Show all N / Show less" button at the bottom for the rest; rows follow the grid's column count (10 icons on mobile and desktop, 16 on tablet widths).

### Steam

- improved: **Win conditions** for 8 more games
  Risk of Rain 2, PAW Patrol World, Bluey, Refunct, Full Metal Furies (either ending) and BattleBlock Theater now count as Beaten; the Klonoa Phantasy Reverie Series and Crash Bandicoot N. Sane Trilogy collections use AND mode, so they only count once every game's final boss is beaten.
- improved: **Win conditions** pre-set for 13 unfinished games
  So they turn Beaten automatically when finished: LEGO City Undercover, SpongeBob: The Cosmic Shake, both PAW Patrol rescue games, CODE VEIN (any ending), Monster Hunter: World, Tales of Symphonia, Divinity: Original Sin 2 (any difficulty), Resonance of Fate, Hyperdimension Neptunia Re;Birth1 (either ending), KARAKARA, Bloodstained: Curse of the Moon, and Octopath Traveler (any one character's final chapter).
- fix: **Beaten badge** is now silver on game cards and in the achievement modal
  It was still the old gray.
- improved: **Beaten** count and award badge in Completions use silver
  Instead of gray.
- improved: **Beaten icons** in Completions get a silver border
  A 1px solid silver border (had none); Perfect keeps 2px gold.
- new: **Completion Progress** views, the same as RA
  All / Nearly there / In progress / Abandoned; Perfect toggle and Completion/Hours/Last Played sort move into the All view.
- improved: **Filter bar** redesigned for mobile like RA
  Segmented views, dropdown sort.
- improved: **Completions** panel shows 2 rows with Show all
  The first 2 rows (perfect games first, then beaten), with the same "Show all / Show less" button as RA Game Awards.

### Xbox

- improved: **Game images** follow RA's layout instead of Steam's
  Square box art for the card thumbnail, achievement modal header and Most Recently Played; wide hero art stays as the faded card background.
- improved: **Completions** show the Xbox game's box art
  In the Completions sidebar, Completions page and hub completions strip, instead of an achievement icon.
- improved: **Xbox images** requested at display size, far smaller downloads
  Through `xboxImg()`: originals were up to 2160×2160 (box art, ~1.5 MB), 1920×1080 (achievement art, ~230 KB) and 1080×1080 (avatar, ~1.6 MB). The full Completion Progress tab went from roughly 120 MB of images to 5.5 MB.
- new: **Win conditions** for 15 games
  Ending/final-boss achievements, OR logic: 14 now count as Beaten — Hi-Fi Rush, Star Ocean The Divine Force, Atomic Heart, Planet of Lana, High On Life, Titanfall 2, Tiny Tina's Wonderlands, Minecraft Dungeons, Asura's Wrath (Part III), Unravel Two, Soul Hackers 2, Hellblade, Hellblade II, Darktide (end of the Path of Trust story, chapter VI); Tales of Arise will count once finished. A Way Out has no ending achievement, so it isn't tracked.
- new: **Xbox profile page** built from the Steam page
  At `profile/xbox/`: header with gamertag and gamerscore, Most Recently Played, User Stats, Completions sidebar, and Recent Games / Completion Progress / Activity tabs.
- new: **Game cards** with hero art and gamerscore; modal lists gamerscore and rarity
  Cards use each game's wide hero art and show earned/total gamerscore; the achievement modal lists gamerscore per achievement and rarity.
- new: **Xbox 360 games** show placeholders for locked achievements
  One "Locked achievement" placeholder per locked achievement (Xbox only reports unlocked ones for 360 games), in the modal and the card preview strip.
- new: **Completion Progress** views, the same as RA and Steam
  All / Nearly there / In progress / Abandoned, sorted by Completion, Gamerscore or Last Played.
- new: **Section colors** match RA and Steam; Xbox green only marks Xbox
  The same blue/gold section colors as the RA and Steam pages; Xbox green `#52b043` only marks Xbox (avatar border, hub card, activity feed, Xbox filter). 100% is labelled "Completed".
- new: **Pipeline output** includes hero and poster art per game
  `heroUrl` and `posterUrl` per game.

### Hub

- improved: **Recently played** rows show a silver badge for beaten games
  RA from award data, Steam/Xbox from win conditions, instead of the blue in-progress %.
- new: **Xbox card** replaces the "coming soon" placeholder
  Gamerscore, Completed, Achievements, Games, Started, w/ Achievements, plus the 3 most recently played games; links to the Xbox profile page.
- new: **Recent Activity** feed and Completions strip include Xbox
  With a green `#52b043` border and icon.
- new: **Refresh app** link in the footer next to Changelog
  On desktop: clears cached app files and reloads, data untouched.
- improved: **Beaten** is now silver `#b8c4ce` everywhere on the hub
  Completions strip count, latest-completion line, mobile summary, and RA card stat (was a mix of blue and gray).

### Completions

- new: **Xbox** completions and beaten games appear in the list
  Xbox completions ("Completed", gold) and Xbox beaten games (from Xbox win conditions); platform filter gains Xbox.
- improved: **Beaten and completed** kept apart when they fall in different years
  The dedup is now year-aware for both RA and Steam: a beaten entry is hidden only when the same game was mastered/perfected in the same calendar year; if beaten and completed fall in different years, both entries are shown.
- fix: **Steam beaten entries** no longer vanish whenever the game is perfect
  They disappeared regardless of date; they now follow the same rule as RA.
- new: **RA completions** show total playtime
  With a clock icon, same as Steam.
- improved: **Beaten cards** use silver instead of blue
  Stripe `#b8c4ce`, badge `#2a3440` / `#c6d4df`, so the tier reads as second place next to gold.

### Activity

- new: **Xbox achievements** join the timeline and heatmap
  With an Xbox filter, a green heatmap ramp for the Xbox view, and an Xbox count in the header.

### Pipelines

- new: **Xbox pipeline** using the OpenXBL API
  `scripts/xbox-pipeline.js`: profile, all 87 titles, and per-title achievements with unlock times, gamerscore, rarity and icons → `data/xbox/` (profile, games index + per-title files, 1-year activity chunks, heatmap). First import is ~85 requests and fits in one run.
- new: **Xbox hourly runs** fetch only changed titles
  Only titles whose summary changed (2 requests when nothing changed), skipping rewrites of unchanged files, so quiet hours make no commit; midnight run refreshes everything including rarity.
- new: **Xbox error handling** for hidden errors, throttling and failed titles
  Handles OpenXBL errors hidden inside HTTP 200 responses, retries throttling/server errors, keeps cached data when a title fails, and stops before writing if every title fails.
- new: **Xbox 360 titles** use the separate 360 endpoint
  It only returns unlocked achievements; totals come from the title list. Image URLs are forced to https.
- new: **Xbox workflow** `fetch-xbox-data.yml`
  Hourly at :27, full refresh at 00:27 UTC, same `data-pipeline` concurrency group; rebases and retries if `main` moved during the run.
- fix: **Steam** errors no longer mark games as achievement-less
  Requests now check the HTTP status and retry throttling, server errors and dropped connections with backoff; a failed game keeps its cached data instead of being recorded as having no achievements. Previously an HTML error page from Steam marked games like LEGO City Undercover, WayOut and Light Fairytale Episode 1 as achievement-less for good.
- fix: **Steam** calls run one at a time and the wrong "no achievements" flags are cleared
  The three calls per game run one after another instead of in parallel, to avoid triggering throttling; "no achievements" is only recorded when Steam says so, and the flag is cleared when a game later returns achievements; cleared the 5 wrongly flagged entries in `games/sentinel.json`.
- fix: **RA** runs stop before writing activity with a gap
  API calls retry with backoff; if a year-of-activity chunk still fails, the run stops before writing instead of publishing activity with a three-month gap.
- fix: **Full refresh** keeps a game whose fetch fails
  Both: full refresh starts from the cached data, so a game whose fetch fails keeps its previous entry instead of disappearing from the site.
- improved: **Backlog** Xbox plan updated from a live OpenXBL test
  Verified endpoints and response shapes, required `Accept-Language` header, errors returned as HTTP 200 with an inner `code`, Xbox 360 titles listing only unlocked achievements, no playtime, and the full import fitting in one run (87 titles, ~85 calls).
- improved: **Backlog** plan to precompute beaten games in the pipelines
  In the Steam/Xbox pipelines (Part F) so pages stop fetching every win-condition game file (~55 requests per page today).
- improved: **Backlog** plan for Steam's "Profile is not public" response
  Handle the per-game response as a skip rather than a failure (146 games in the first full refresh, all already cached with 0 unlocked).
- new: **RA pipeline** attaches playtime to each award
  `playtime` (minutes, from `userTotalPlaytime` in game details) on each award in `profile.json` → `pageAwards.visibleUserAwards`, so the Completions page doesn't need to load `games.json`.

### Structure

- new: **README** with overview, screenshots and setup
  New `README.md`: overview, screenshots (`docs/screenshots/`), feature list, architecture diagram, pipeline schedule, local setup, admin panel and deployment steps; README and `docs/` are excluded from the published site.
- fix: **package.json** links point to `yozuryu/gaming-hub`
  Description added; homepage, repository and issues links now point to `yozuryu/gaming-hub` (were the old `achievement-data` repo).
- new: **Xbox profile page** files added
  New page `profile/xbox/` (`index.html`, `app.js`, `utils/`), with its own `CLAUDE.md` (excluded from the site in `_config.yml`); `sw.js` precaches it and the Xbox icon, cache bumped to `gaming-hub-v5`.
- improved: **Xbox** set visible and active in the config
  `data/hub/config.json`: Xbox set to visible/active; `data/xbox/win-conditions.json` added (empty).
- fix: **Private files** no longer published
  All five subfolder `CLAUDE.md` files were publicly served (only the root one was excluded); `_config.yml` now lists each one, plus `backlog/`, `.agents/`, `.claude/`, the unused `assets/appicon.png` source icon, the pipeline-only `data/steam/games/sentinel.json`, and the legacy `data/steam/achievements.json`.
- new: **Backlog** folder for planned work
  New `backlog/` folder: moving pipeline data to a `data` branch with daily squash (`data-branch-migration.md`) and the follow-up history cleanup (`history-cleanup.md`).
- improved: **Backlog** Xbox integration plan set as top priority
  `xbox-integration.md` via the OpenXBL API — pipeline, hub card, Xbox profile page, Activity/Completions support — set as top priority ahead of the data-branch migration; `backlog/README.md` lists items in priority order.
- improved: **Backlog** pipeline review
  `pipeline-improvements.md` — urgent data-integrity fixes (Steam errors wrongly marking games as having no achievements, RA writing partial activity on a failed fetch, full refresh dropping failed games), commit-noise reduction, schedule reliability, and cleanup.
- improved: **App updates** reach installed apps without a cache bump
  `sw.js`: static assets switched from cache-first to stale-while-revalidate (cached copy served instantly, fresh copy fetched in the background with `cache: 'no-cache'`), so deploys reach installed apps on the next load without bumping `CACHE_NAME`; only same-origin GET requests are handled.
- improved: **Service worker** cache bumped to `gaming-hub-v4`
  `sw.js`: so the switch and today's changes reach browsers still on the old cache-first worker.
- new: **Refresh app** button on the Changelog page
  In the header (works on mobile and desktop) — deletes all SW caches, triggers a service worker update check, reloads.

### Admin

- new: **Win Conditions** now works for Xbox too
  A new "Xbox" group, sharing one module with Steam; admin server gains `GET /api/xbox/game` and allows `data/xbox/win-conditions.json` / `data/xbox/games/index.json`.
- new: **Pipelines** screen can run the Xbox pipeline
  Incremental, full refresh, debug; Credentials screen has the OpenXBL API key.

## v26.06.13

Fix mobile horizontal scroll and bottom nav on RA profile page.

### RetroAchievements

- fix: **Horizontal scroll** on the phone and the broken bottom nav
  Added `overflow-x: clip` to `html, body` in `profile/ra/index.html`; the missing rule caused the heatmap's wide min-width to leak outside the viewport, which also broke the `position: fixed` bottom nav bar.

## v26.05.02

RA profile game awards update and beaten filter default.

### RetroAchievements

- improved: **Game Awards** sidebar drops Site Awards and counts mastered and beaten
  Removed the unreliable Site Awards section; added Trophy + mastered count and Medal + beaten count to the Game Awards header.

### Steam

- improved: **Beaten** filter on the Completions page is on by default

---

## v26.05.01

Steam win conditions, admin module, and app icon update.

### Steam

- new: **Win Conditions** admin module to mark when a Steam game is beaten
  Under the Steam group: select any Steam game with achievements, click achievements to mark them as win conditions (multi-select); saved to `data/steam/win-conditions.json` as arrays.
- new: **OR / AND** mode per game for win conditions
  **OR** (default): any one condition unlocked counts, beaten date = earliest unlock; **AND**: all conditions must be unlocked, beaten date = latest unlock.
- improved: **Win condition** data saved in a new format, old files still read
  The format is now `{ mode: "or"|"and", achievements: [...] }`; the old array format is read as OR for backward compatibility.
- new: **OR/AND toggle** in the admin Win Conditions toolbar
  The pill shows when conditions are set; saves in the new object format.
- new: **Completions** shows beaten Steam games
  Loads win conditions on mount, fetches game files to check unlock status, and shows beaten Steam games alongside RA beaten and Steam perfect entries; beaten games are excluded if already in `perfectGames`.
- improved: **Completions** sidebar on the Steam profile shows perfect and beaten games
  Sidebar renamed to **Completions**; flat single grid: perfect games first (gold `border-2`) then beaten-only games (no border); header shows ★ + count (gold) and 🏅 + count (gray); beaten games use their win condition achievement icon as thumbnail; games that are both perfect and beaten show only as perfect.
- improved: **Beaten** Steam cards on the Completions page show the win condition
  The win condition achievement icon replaces the game icon, with the rarity label/percentage for that achievement.
- improved: **Beaten** tooltip on the Steam profile sidebar shows rarity
  The tooltip includes a Rarity row (the win condition achievement's `globalPct`); perfect count prefixed with ★, beaten count prefixed with 🏅.
- improved: **Hub completions strip** counts beaten Steam games
  The beaten count now includes beaten Steam games (from win conditions, excluding already-perfect games); fetches game files in parallel to check unlock status.
- new: **Beaten** badge on Steam game cards
  On Recent Games and Completion Progress tabs, a gray **Beaten** badge shows next to the game title when a win condition has been unlocked; hidden if the game is already Perfect; the left stripe turns gray `#8f98a0` for beaten games.
- new: **Beaten** badge in the achievement modal
  The same gray Beaten badge under the game title when opened for a beaten game.

### Structure

- new: **Win conditions** file `data/steam/win-conditions.json`
  Empty, populated via admin.
- improved: **App icon** `assets/appicon.png` replaced with the new icon
- improved: **PWA icons** regenerated from the new source
  `assets/icon-192.png` (192×192) and `assets/icon-512.png` (512×512).

## v26.04.11

Mobile polish pass — floating tab pills, platform popup redesign, Steam tab parity, stats collapse, Completions deduplication, icon refresh, hub page simplification, heatmap/streak mobile improvements, and stat color/order refinements.

### RetroAchievements

- improved: **User Stats** fold their right column on the phone
  The right column is hidden on mobile by default; a "Show more / Show less" toggle expands it; always both columns on `sm:` and up.
- improved: **Series** tab icon changed to `Layers`
  From `Trophy`; better represents grouped series content.
- improved: **Floating tab pill** slides in and out
  Slides up on appear and slides down on disappear (`slideUpPill` / `slideDownPill` keyframes); the exit animation is deferred 210ms so it completes before unmount.
- improved: **Scroll-to-top button** is a round button that moves above the pill
  A `rounded-full` FAB (`w-10 h-10`, `bg-[#131a22]`, `active:scale-90`); `bottom` shifts from `3.5rem` to `120px` when the floating pill is visible.

### Steam

- improved: **Tab bar** on the phone shows icons with short labels like RA
  Icons (Clock / BarChart2 / Activity) with short labels, full text on desktop; matches the RA tab bar layout.
- new: **Floating tab pill** on the phone when the tab bar scrolls away
  The tab bar is no longer sticky on mobile; a scroll-aware floating pill appears when the bar scrolls off screen, with the same slide-up / slide-down animations as RA.
- improved: **Scroll-to-top button** moves up when the floating pill shows

### Hub

- improved: **Profile platform popup** redesigned as stacked pills
  Frosted glass rounded-rect container, each platform a horizontal pill (icon + full label), the active platform highlighted with a colour tint.
- improved: **Profile popup** slides up on open and down on close
  Via CSS transition.
- improved: **Platform cards** on the phone show only the header and stats
  The stats grid only: recently played rows and card footers hidden; navigation handled by the bottom nav bar.
- improved: **Completions strip** and activity "View all →" hidden on the phone
  Redundant with the bottom nav tabs.
- improved: **Recent Activity** feed folds to 4 rows on the phone
  A "Show N more / Show less" toggle button reveals the rest.
- improved: **Desktop layout** unchanged

### Activity

- improved: **Heatmap** opens scrolled to the most recent weeks
  Auto-scrolls to the rightmost position on mount on all three pages (Activity, RA profile, Steam profile); fires after `heatmapData` is populated, using `requestAnimationFrame` to ensure the DOM has rendered full width first.
- improved: **Streak panel** shows 5 days on the phone
  5 circles on mobile (last 5 days) instead of 14, so it fits without horizontal scroll on any phone; desktop still shows all 14.

### Hub

- improved: **Completions strip** merges RA Mastered and Steam Perfect into Completed
  A single "Completed" count (gold); Beaten shown separately in blue; these are the same concept across platforms.
- improved: **RA stats** reordered by relevance with role colours
  Points → Rank → Mastered → Beaten → Achievements → Games; stat colors: gold (Points/Mastered), white (Rank), blue (Achievements), gray (Beaten), muted (Games).
- improved: **Steam stats** reordered by relevance
  Hours → Perfect → Achievements → Games → Played → w/ Unlocks; the same color logic applied.
- improved: **RA card** shows Achievements instead of Wishlist
  Achievements is the sum of `numAwarded` across all tracked games.
- improved: **Changelog** versions use short CalVer
  Headers changed from the date format (`2026-04-11`) to short CalVer (`v26.04.11`).

### Completions

- fix: **RA games** no longer show twice when both mastered and beaten
  Entries are deduplicated by `gameId`: only the mastered entry is shown, so the same game no longer appears twice when "Show Beaten" is enabled.

### Structure

- improved: **Page headers** get extra top padding on the phone
  All page headers use `pt-8 pb-5 md:pt-5` to compensate for the hidden breadcrumb bar; applied to RA, Steam, Activity, Completions, Changelog, and Hub.
- improved: **PWA icons** replaced with the new controller and trophy logo
  `assets/icon-192.png` and `assets/icon-512.png` sourced from the new `assets/appicon.png` (gaming controller + trophy logo); cropped to 860×860px to remove outer padding and the bottom-right watermark, then resized to 192 and 512.
- improved: **Per-page `CLAUDE.md`** files added and the root one updated
  Added to `profile/ra/`, `profile/steam/`, `activity/`, `completions/`, `changelog/`; the root `CLAUDE.md` updated to reflect the current architecture.

## v26.04.10

Mobile UX overhaul — bottom navigation bar, safe area support, scroll-to-top repositioning, and three mobile bug fixes.

### RetroAchievements

- improved: **Tab bar** shows icons with short labels on the phone
  `Clock`/Recent, `BarChart2`/Progress, `Layers`/Series, `Activity`, `Star`/Watchlist; text-only on desktop; tabs distribute evenly with `flex-1` on mobile.
- new: **Floating tab pill** above the bottom nav once the tab bar scrolls away
  On mobile the tab bar sits at its natural in-flow position; once scrolled off screen a floating icon pill appears centered above the bottom nav (`z-190`, frosted glass background with `backdrop-filter: blur`).
- new: **Floating pill** marks the active tab
  An accent-colored background circle and dot indicator; desktop unchanged (`md:sticky md:top-[26px]`).
- improved: **Scroll-to-top button** moves up when the floating pill shows
  `bottom: 120px` when the floating pill is visible, to prevent overlap.

### Steam

- fix: **Tab bar** clipped on the phone
  Wrapped the tab buttons in an `overflow-x-auto scrollbar-none` inner div so hidden tabs are reachable by horizontal scroll (matches the existing RA tab bar pattern).

### Hub

- improved: **Completions strip** on the phone shows Mastered / Beaten / Perfect
  Colored counts instead of just a plain total count; `flex-1 min-w-0` + `text-overflow: ellipsis` prevents overflow.

### Structure

- new: **Bottom navigation bar** on the phone, `assets/mobile-nav.js`
  Shared bar injected into all pages via `<script>` tag; visible only on screens < 768px.
- new: **Bottom nav** has 5 tabs
  Home, Profile (dynamic platform picker), Activity, Completions, Changelog (cyan accent).
- improved: **Breadcrumb bar** and footer hidden on the phone
  Topbar breadcrumb and `footer` elements hidden on mobile via `.page-topbar` and `footer` CSS rules; the bottom nav replaces them; class `page-topbar` added to topbar divs in all 5 React app.js files and `index.html`.
- new: **Profile tab** opens a platform popup
  Fetches `data/hub/config.json` and shows only `visible: true` platforms in a popup; navigates directly if only one platform is configured.
- new: **Platform popup** slides up above the nav
  Backdrop tap dismisses it; the active platform is highlighted in its accent color.
- new: **Active tab** detected from the page address
  Auto-detected from `window.location.pathname`; the active state shows the accent color + a top indicator bar.
- new: **Safe area** room for notched iPhones in the nav
  Safe area insets applied to the nav height via `env(safe-area-inset-bottom)`.
- improved: **`viewport-fit=cover`** added to every page
  Added to all 6 `index.html` viewport meta tags to enable safe area CSS variables.
- improved: **Scroll-to-top buttons** sit above the nav on the phone
  The buttons in `profile/ra/app.js`, `profile/steam/app.js`, `activity/app.js` get the `.scroll-top-btn` class; mobile-nav CSS repositions them above the nav bar on mobile.

## v26.04.09

Tab sizing unified across RA and Steam; GameCard and modal label styles aligned; series card icon sort improved. PWA support added — installable on mobile with offline fallback.

### Structure

- new: **`manifest.json`** PWA web app manifest
  With name, icons, theme color, start URL and scope set to `/gaming-hub/`.
- new: **`sw.js`** service worker with offline caching
  Network-first caching for `data/**` and `changelog.md`, cache-first for all static assets; old caches deleted on activation.
- new: **PWA icons** generated from the avatar
  `assets/icon-192.png` and `assets/icon-512.png` generated from `avatar.png` for PWA icon sizes.
- new: **Manifest link** and service worker registration on every page
  Added `<link rel="manifest">` and the SW registration script to all six `index.html` files.

### RetroAchievements

- fix: **Tab bar** text size inconsistent on the phone
  Changed from fixed `text-[14px]` to `text-[11px] md:text-[14px]` and `gap-3 md:gap-6` with `whitespace-nowrap`, matching Steam's implementation.
- improved: **GameCard** status row wraps on narrow screens instead of truncating
  The `Hardcore`/`Softcore`/`Mastered`/`Beaten` labels: the outer div changed from `truncate` to `flex-wrap`; console name and separator get `shrink-0`.
- improved: **Game modal** status labels use the GameCard badge style
  `border`, `bg`, `font-bold uppercase tracking-wider` instead of plain colored text; `Hardcore` and `Mastered` are shown as independent badges (a hardcore mastered game shows both).
- improved: **Series card** icons sorted by status
  Four buckets: mastered (desc by mastery date) → in progress (desc by last unlock date) → no progress (alphabetical) → no achievement (alphabetical).

### Steam

- improved: **Perfect** badge in the achievement modal moved under the game title
  From beside the progress bar, matching the RA modal layout.

## v26.04.08

Series Progress tab added with rich cards — background image, points, latest achievement, icon strip, and per-series progress tracking; admin gets Show Progress flag, cover game selector, gold dot indicator, and console names in all game lists. Game awards deduplicated so mastered game shows single Mastered award with solid gold border. Series card icon strip now sorted by mastery status with gold borders; award type corrected to `Mastery/Completion`.

### RetroAchievements

- new: **Series Progress** tab with a card per series
  Shows per-series cards for series with **Show Progress** enabled; the tab only appears when at least one series has the flag set.
- new: **Series card** in the GameCard style
  Left-border gold accent, background image (from the cover game), cover icon (links to the RA game page), series name, GameCard-style layout.
- new: **Series card** stats for games, tracked, in progress and mastered
  **Games** (total in series) · **Tracked** (games with an achievement set, sourced from `detailedGameProgress.numAchievements` or `watchlist.achievementsPublished`) · **In Progress** · **Mastered** (`numAwardedToUser === numAchievements`, no page awards dependency), shown as inline badge labels.
- new: **Series card** progress bar
  `mastered / tracked` with percentage; gold fill, gradient at 100%.
- new: **Series card** icon strip
  Game icons below the bar; games without achievement sets shown dimmed (`brightness-[0.35] grayscale`) after games that have sets.
- new: **Series card** points earned and total
  Shown under the series name, sourced from the per-achievement `points` field and watchlist `pointsTotal`.
- new: **Series card** latest achievement
  Badge icon + achievement name (links to the RA achievement page) + game title (links to the RA game page) + time ago; achievement and game title are clickable.
- fix: **Series Progress** tab showed all zeros when opened directly
  `games.json` was only fetched for the `recent` and `progress` tabs; added `series` to the trigger condition.
- new: **Show Progress** toggle in the admin Series editor
  In the series editor header; gold when enabled, stored as `showProgress` in `data/ra/series.json`.
- new: **Cover game** picker in the admin Series module
  Hover any assigned game row to reveal the ★; clicking sets `coverGameId`, clicking again clears it; the cover game falls back to the first game in the series if unset, and resolves from `detailedGameProgress` or the watchlist so unplayed games work.
- new: **Gold dot** in the admin series list for series with progress shown
  Next to series with `showProgress` enabled.
- improved: **Console name** under every game in the admin Series and Guides modules
  All game rows show the console name as a muted subtitle under the title for disambiguation.
- improved: **Admin server** `/api/games/ra` includes the console name
  Each game entry now includes `consoleName`.
- fix: **Game Awards** showed both Beaten and Mastered for the same game
  Awards are deduplicated per game: only Mastered is shown; the dedup key is `awardData` (game ID), Mastery/Completion wins over Game Beaten.
- fix: **Award type** names didn't match the RA API
  RA API returns `"Mastery/Completion"`, not `"Game Mastered"`; corrected in `transform.js` (siteAwards filter, gameAwards filter, beatenGamesCount) and `app.js` (icon border condition, tooltip label).
- improved: **Mastered** award icons get a solid gold border
  2px (`border-2 border-[#e5b143]`); Beaten awards keep the original dimmed border.
- improved: **Series card** icons sorted by status
  Mastered games first (desc by mastery date) → in-progress games (desc by last unlock date) → no-progress games (alphabetical) → no-achievement games (alphabetical).
- improved: **Series card** mastered icons get a gold border
  2px, matching the Game Awards panel style.
- improved: **Series card** stat labels put tracked games first
  `games` (total) is now muted, `tracked` (games with an achievement set) is lighter, visually prioritising the actionable subset.

## v26.04.07

Hub mobile layout fixed for fewer than 3 visible platforms.

### Hub

- fix: **Platform grid** showed two columns on the phone with fewer than 3 platforms
  The JS `gridTemplateColumns` inline style was overriding the CSS media query, causing a 2-column side-by-side layout on mobile instead of a single column; fixed by using a CSS custom property (`--platform-cols`) for the desktop/reduced-count layout and `!important` on the mobile `1fr` breakpoint.

## v26.04.06

Watchlist split into its own JSON file with independent pipeline refresh; RA Series admin gets unassigned games panel, delete persistence fix, and alphabetical sorting.

### Pipelines

- improved: **Want-to-play list** moved into its own `data/ra/watchlist.json`
  The RA pipeline splits `wantToPlayList` out of `profile.json`; the profile page fetches it as a separate request and merges it before rendering the backlog tab.
- new: **`--watchlist-only`** flag for the RA pipeline
  Fetches only the want-to-play list and writes `watchlist.json`, skipping profile/achievements/games entirely; exposed as `npm run ra-fetch:watchlist`.
- improved: **Mode** dropdown replaces two switches when running the RA pipeline
  Two boolean `workflow_dispatch` inputs (`refresh_games`, `watchlist_only`) replaced with a single `mode` choice (`incremental` / `full-refresh` / `watchlist-only`).
- improved: **Admin server** reads the watchlist from its new file
  `/api/games/ra` now reads from `data/ra/watchlist.json` instead of `data/ra/profile.json`.

### RetroAchievements

- new: **Unassigned Games** panel in the admin Series module
  A 📋 badge in the left panel footer shows the count of games not in any series; clicking opens a searchable right-panel view listing all unassigned games with icon, title link, WL badge, and a "New Series" button that pre-fills the series name and pre-assigns the game; the badge count reflects live state as games get assigned.
- fix: **Deleting a series** in the admin didn't stick
  Deletion now immediately writes to `data/ra/series.json` (previously the save button was hidden after deselecting, so changes were lost on refresh).
- improved: **Admin series list** sorted alphabetically
  After create and rename.
- improved: **Watchlist series groups** sorted alphabetically
  Was file order.

## v26.04.05

RA Series Hub launched — admin module with game assignment, recommendations, per-series suggestions, and watchlist grouping in profile.

### RetroAchievements

- improved: **Admin RA Guides** game list includes want-to-play games
  Watchlist (Want to Play) games merged with played games and deduplicated by ID; watchlist-only entries are labeled **WL** in the sidebar.
- new: **RA Series Hub** with an admin module and a Series grouping on the watchlist
  New `data/ra/series.json` stores named series with game ID arrays (supports multi-series per game); admin panel Series module (two-panel: series list + game assignment with search); the watchlist tab gains a **Series** grouping option, and unassigned games fall into an "Other" group.
- new: **Series recommendations** in the admin Series module
  Analyzes unassigned watchlist/played games, groups by shared name prefix (strips subtitles, roman numerals, numbers), shows a 💡 badge with the count in the left panel footer; the suggestions view lists each group with a "Create Series" button that pre-fills the name and pre-assigns the games; minimum 3 games required to surface a recommendation.
- new: **Suggested games** in the per-series add panel
  Unassigned games whose name prefix matches the series name, shown before the search prompt.
- improved: **Game titles** link to the RA game page in every admin Series list
  Assigned, suggestions, search results, global recommendations.
- fix: **WL badge** missing on games that are both played and on the watchlist
  The `fromWatchlist` flag is fixed by building a watchlist ID set before merging.
- improved: **Admin Series search** keeps its text after adding a game
- improved: **Watchlist series** with more than 3 games start folded

## v26.04.03

Admin panel expanded with Credentials, Data Diff, and server controls; Steam/RA filter UI buttons standardized; guide strip dropdown fix.

### Steam

- improved: **Show Perfect** in the Progress tab is now a filter button
  Replaces the checkbox, matching the filter bar style: gold when active, a divider separating it from the sort buttons, labelled under "Filter".

### Completions

- new: **Tag filters** for Hack, Homebrew and Prototype
  Added to the filter bar; hidden by default, click to show; styled with each tag's color.
- improved: **Beaten** filter is now a button instead of a checkbox
  Replaces "Also show beaten games", matching the platform filter style.
- improved: **Filter bar** reordered
  All · RA · Steam · Beaten | Hack · Homebrew · Prototype.

### RetroAchievements

- fix: **Guide strip** dropdown for custom categories with one link
  Always shows the dropdown for custom categories (even with 1 link); fallback categories remain direct links.

### Admin

- new: **Credentials** page to edit `.env`
  Form editor for RA username/API key, Steam user ID/API key; password fields masked with a show/hide toggle; writes directly to `.env`.
- new: **Data Diff** page showing `data/` changes
  Per-file side-by-side diff view; new untracked files shown as pure additions.
- new: **Restart and Stop** buttons for the admin server
  In the sidebar footer; Restart polls `/api/health` until back up.
- new: **Page refresh** keeps the open section
  Hash-based routing (`#module-id`).
- new: **Guide search** link in the RA Guides game header
  Opens a GameFAQs search in a new tab.

## v26.04.03

Steam games data split into per-game files for faster initial load.

### Admin

- new: **Admin panel** (`admin/`) run locally
  Run `npm run admin`, opens at `http://localhost:3131`; excluded from GitHub Pages via `_config.yml`.
- new: **Site Config** page for `data/hub/config.json`
  Form editor for username, motto, tags, platform/page visibility toggles.
- new: **RA Guides** page to edit per-game guides
  Per-game guide editor for `data/ra/guides.json` with fixed Guides/Videos categories and dropdown link lists.
- new: **Pipelines** page to run RA and Steam pipelines with a live log
  Run any RA/Steam pipeline mode with live SSE log streaming and a stop button; pipelines unchanged and still usable from the CLI.

### RetroAchievements

- new: **Guide links** strip on `GameCard`
  Shows below the progress bars, above the achievement preview strip.
- new: **Fallback guide links** to GameFAQs and YouTube on every card
  GameFAQs search and YouTube longplay search, auto-generated from the game title.
- new: **Custom guides** per game from `data/ra/guides.json`
  Entries keyed by game ID, each an array of `{ category, icon, links: [{ label, url }] }`; categories with 1 link open directly, 2+ links show a dropdown; custom categories appear first, fallbacks fill in missing ones.

### Steam

- new: **Loading overlay** while a game's achievements load
  When fetching per-game achievement data from `games/{appId}.json`: shows a spinner and the game name so the UI doesn't appear frozen on slow connections; dismissible by clicking the backdrop.
- improved: **Steam games data** split into an index and one file per game
  `data/steam/games.json` (5.3MB) replaced with `data/steam/games/index.json` (index only, no `achievements[]`) plus `data/steam/games/{appId}.json` per game containing full achievement data.
- improved: **Sentinel cache** moved into the games folder
  `data/steam/sentinel-cache.json` moved to `data/steam/games/sentinel.json`.
- improved: **Pipeline cache** reads the per-game files
  Cache loading now reads individual `games/{appId}.json` files; falls back to the legacy `games.json` on the first migration run.
- improved: **Games index** pre-computes last unlock and preview icons
  `games/index.json` pre-computes `lastUnlockedAt`, `lastUnlockName`, and `preview` (top 6 achievement icons) per game; previously computed at runtime in the frontend.
- improved: **Steam profile** loads much faster
  Fetches `games/index.json` on mount (~200KB instead of 5.3MB); the full `games/{appId}.json` is lazy-fetched only when a game modal is opened.
- improved: **Game cards and Progress tab** use the index's pre-computed fields
  `SteamGameCard` and `ProgressTab` use pre-computed fields from the index instead of iterating `achievements[]`.

---

## v26.04.02

Streak panel redesigned with circles, 14-day window, connectors, and per-day achievement counts; streak UTC date bug fixed; Steam mobile overflow fixed.

### Activity

- improved: **Streak** days are circles instead of squares
  Better visual separation from the heatmap above.
- improved: **Streak** covers 14 days instead of 7
  For more meaningful streak context.
- new: **Gold connector lines** between consecutive active days
  Sitting at circle center height; transparent on broken days.
- improved: **Streak panel** fills the full width
  Connectors use `flex: 1` to distribute the remaining space evenly.
- improved: **Streak circles** sized down to 36px
  Flame icon 16px; sized down from the previous oversized squares.
- improved: **Current streak** count smaller and panel tighter
  Reduced from 30px to 22px; panel padding tightened.
- improved: **Best streak** line left-aligned and larger
  Bumped to 10px (from centered 8px).
- new: **Unlock count** under each streak day
  Shown below the day label: gold on active days, hidden on missed/pending.
- improved: **Today** doesn't break the streak until midnight
  Today is excluded from streak breaking: the streak holds until midnight if there are no achievements yet (shown as a pending dot, not ✕).
- improved: **Flames** flicker out of step
  The `flameFlicker` animation is staggered per day index so flames don't all pulse in sync.
- improved: **Streak header** flame animates and the count glows
  The header flame icon animates; the streak count glows gold when the active streak > 0.

### Steam

- fix: **Streak** missed today late at night in UTC+ timezones
  The date key calculation switched from `toISOString()` (UTC) to local `getFullYear/getMonth/getDate`; in UTC+ timezones, `toISOString()` returned yesterday's date late at night, so today's achievements didn't match the heatmap and the flame never showed for today.
- fix: **Page** scrolled sideways
  `html` element added to the `overflow-x: clip` rule in `index.html`: `clip` on `body` alone does not propagate to the viewport scroller, leaving the page horizontally scrollable.
- fix: **Tab bar** overflowed narrow phones
  Font size reduced to `11px` on mobile (from `14px`) and the gap tightened to `12px` (from `24px`); the "Completion Progress" tab label was wide enough to overflow the viewport at small screen widths.

---

## v26.04.01

RA game awards sorted by type then date; combined activity page gains achievement unlock streak tracking with a 14-day visual.

### RetroAchievements

- improved: **Game awards** sorted Mastered first, then by date
  Mastered / Beaten sorted by type first (Mastered before Beaten), then by award date descending within each group.

### Activity

- new: **Unlock streak** below the heatmap
  Tracks consecutive days with at least one unlock; today is excluded from streak breaking (pending until the day ends).
- new: **Streak panel** with the current streak and a 14-day timeline
  Shows the current streak count, a 14-day circle timeline with animated flame icons on active days, and gold connector lines between consecutive streak days.
- new: **Longest streak** with its dates
  Recorded with its date range, shown at the bottom of the streak panel.

---

## v26.03.29

RA achievement display simplified; Steam game images upgraded; sticky headers fixed; heatmap platform filter corrected; pipelines now hourly with concurrent queue and debug mode; search added to completion progress on both platforms.

### RetroAchievements

- new: **`--debug`** flag for the RA pipeline
  Prints raw API responses after each fetch, matching Steam pipeline behavior; `npm run ra-fetch:debug` script added.
- improved: **Hardcore** flame icon removed from achievement titles
  Removed from the `RAchievementModal` achievement title row; the gold left border strip already conveys a hardcore unlock; applied to activity tab rows and the Most Recently Unlocked card as well.
- improved: **Rarity** shown as coloured `×N.N` text instead of pills
  Rarity pills (`UR`/`VR`/`R`/`UC`) replaced with plain colored `×N.N` ratio text: same color tiers, no border or background; shown for all achievements with valid data; locked achievements rendered at 40% opacity.
- new: **Search** and game count in Completion Progress
  Matches the Steam toolbar layout.

### Steam

- improved: **Activity tab** session headers use the square game icon
  Switched from the wide capsule (`capsule_sm_120`) to the square game icon from `games.json`; matches Most Recently Played and avoids cropping.
- improved: **Most Recently Played** shows a sharp wide capsule
  Switched from the square icon to `capsule_616x353.jpg` (high-res wide capsule) at natural aspect ratio: no crop, significantly sharper than the 32×32 icon.
- improved: **Most Recently Unlocked** game row uses the square game icon
  Matching the activity tab.
- improved: **Combined activity** Steam session headers use the square game icon
  From `games.json`: `games.json` fetched on mount, icons patched into the loaded achievements.
- new: **Search** in Completion Progress
  Filters by game name, clears with ×; the toolbar persists when search returns zero results; "Name" sort removed.

### Activity

- fix: **Heatmap** ignored the platform filter
  RA and Steam heatmaps are now stored separately and the active heatmap is derived from the platform filter; previously it always showed merged data regardless of filter.
- improved: **Platform filter** says `RA` on both Activity and Completions
  Was `RetroAchievements` in combined activity.

### Hub

- improved: **Completions strip** latest game counts only Mastered and Perfect
  Mastered (RA) and Perfect (Steam) only; Beaten games excluded from the latest slot.

### Pipelines

- new: **Queue** so RA and Steam runs don't overlap
  Concurrent queue (`concurrency: group: data-pipeline, cancel-in-progress: false`) added to both RA and Steam GitHub Actions workflows; prevents push conflicts when both pipelines trigger simultaneously.
- improved: **Data** refreshes every hour instead of every 3 hours
  RA and Steam GitHub Actions schedules changed; the public repo has no Actions minute limits.

### Structure

- fix: **Sticky headers** broken by the overflow rule
  `overflow-x: hidden` on `html, body` replaced with `overflow-x: clip` on `body` across Steam, combined activity, completions, and changelog pages: `hidden` creates a scroll container that breaks `position: sticky`; `clip` prevents horizontal overflow without this side effect.

---

## v26.03.28

RA bug fixes; lazy loading across all activity pages; Steam progress hides perfect games by default; tilde tag and subset parsing extended site-wide; game card playtime row redesigned with clock icon and dot separator.

### RetroAchievements

- fix: **Achievement modal** HC/SC progress bars show correct percentages
  In `RAchievementModal`: `numDistinctPlayersCasual` and `numDistinctPlayersHardcore` were mistakenly stripped by the pipeline; restored and re-fetched via `--refresh-games` full refresh. `totalPlayersHC` added as a separate denominator for the HC bar; bars hidden when player data is unavailable.
- improved: **HC/SC labels** replaced with flame and feather icons
  `Flame`/`Feather` icons colored to match their respective bar fills (`#ff6b6b` HC, `#546270` SC); label row constrained to `max-w-[180px]` matching the bar so SC aligns to the right edge.
- fix: **Overview card** shows the clean game name and tilde tag badges
  `mostRecentAchievement` now runs through `parseTitle()`, so the game name renders `baseTitle` and tilde tag badges instead of the raw title.
- fix: **RA dates** no longer off by 7 hours for UTC+7 viewers
  All RA date strings (`"YYYY-MM-DD HH:MM:SS"` UTC) are now normalized to ISO UTC before `new Date()` parsing; applied to both `formatTimeAgo` and `formatDate`.
- improved: **Game awards popup** shows tilde tags and subset names
  The Completion Progress hover popup now parses titles via `parseTitle()`: renders `baseTitle` with inline tilde tag badges, or a `Subset` badge with the subset name as a subline.
- improved: **Game card playtime row** with a clock icon, like Steam
  Replaced with clock icon + playtime · Last Played value, matching Steam's layout; "Last Played" label capitalized on both RA and Steam game cards.

### Steam

- improved: **Completion Progress** hides perfect games by default
  Perfect games (100%) are hidden; a "Show Perfect" checkbox in the toolbar toggles them back in.

### Activity

- fix: **Combined heatmap** complete from the start
  The combined activity (`/activity/`) heatmap now uses precomputed `heatmap.json` from both platforms merged by day: complete data from mount regardless of loaded chunks.
- improved: **Activity pages** load more automatically as you scroll
  All three activity pages (RA, Steam, combined) now use an `IntersectionObserver` scroll sentinel: the next chunk auto-loads when scrolled within 300px of the bottom, replacing the manual "Load more" button on Steam and the silent background streaming on the combined page.
- new: **Heatmap day** click loads older data until that day is shown
  Clicking a heatmap day that isn't in the loaded data auto-loads chunks until the day's achievements are available. Implemented on the Steam Activity tab and the combined activity page (RA already had this).
- improved: **RA activity tab** session headers show tilde tag badges
  Rendered inline alongside the game name.
- fix: **Combined activity** session headers show tilde tag badges
  `parseTitle` in `activity/utils/helpers.js` was discarding tags instead of collecting them; fixed to capture tags. `TILDE_TAG_COLORS` added to `activity/utils/constants.js`.

### Hub

- improved: **Activity feed** rows show the achievement description and unlock time
  The description sits between the achievement name and the game line (falls back to the achievement name if empty); platform-specific badges (points, rarity) removed in favour of a universal unlock time shown right-aligned on the game row.
- improved: **Game names** in blue with badges on the same row
  Game name color changed to `#66c0f4` (blue) with hover-to-white; subset/tilde tag badges moved inline on the game name row.
- fix: **Row separators** in the activity feed show reliably
  The border moved from a Tailwind arbitrary-value class to an inline style: Tailwind CDN does not reliably process arbitrary classes on dynamically injected HTML.

### Completions

- fix: **Hub breadcrumb link** works on non-root deployments
  Links (`../../`) corrected to `../`, one level deep from root; it was breaking on non-root domain deployments.
- improved: **Completions page** shows tilde tags and subset names
  On `/completions/`, `CompletionCard` renders `baseTitle` with inline tilde tag badges or a `Subset` badge + subset name subline.
- improved: **Hub completions strip** shows the clean title, badges and subset
  It parses the latest RA completion title and renders `baseTitle` + badges + subset subline; shared `_parseTitle`/`_tildeBadgesHtml`/`_BADGE_BASE` helpers moved to script scope so they're accessible outside `loadHubProfile`.

## v26.03.27

Achievement detail modals for RA and Steam; achievement preview strips on game cards; completions page with hub strip; activity shimmer loading; data restructured with sharded achievement chunks and ~2.4MB pipeline savings.

### Completions

- new: **Completions page** listing every perfect, mastered and beaten game
  New `/completions/` page listing all perfect (Steam) and mastered/beaten (RA) games grouped by month under collapsible year headers.
- new: **Current year** open by default
  Past years collapsed.
- new: **Year and month** two-level grouping
  Year (bold, lighter) → months (indented with left border, muted) → cards.
- new: **Platform filter** and an option to show beaten games
  Platform filter (All / RA / Steam) and "Also show beaten games" checkbox (default unchecked).
- new: **Mastered** covers both mastered and completed games
  Mastered and completed unified under a single "Mastered" type; HC marker removed from the beaten badge.
- new: **Game cards** with icon, type badge, platform and date
  Each card shows game icon, name, type badge (Mastered / Beaten / Perfect), platform icon, console or last achievement name + rarity subline, and playtime / date.
- new: **Loading skeleton** in the shape of the page
  Shimmer skeleton loading state mirrors year header → month header → card layout.
- new: **Hub link** through the completions strip
  Linked from hub via completions strip.

### Hub

- new: **Completions strip** between the platforms and recent activity
  Added between platform grid and activity section: `★ Completions | N total · X Perfect · Y Mastered · Z Beaten | [icon] latest game ★ TYPE · time ago | View all →`
- new: **Latest completion** with icon, type and time ago
  Shows game icon, name, uppercase type badge, and time ago.
- new: **Phone version** of the strip shows only the total
  Mobile view simplified to `★ Completions | N total | View all →`; breakdown and latest hidden.
- new: **Strip visibility** set in the config
  Controlled by `completions.visible` in `config.json` (defaults to visible).
- improved: **Completions link** removed from the footer
  Replaced by the strip.

### Activity

- improved: **Loading skeleton** instead of "Loading…"
  Shimmer skeleton loading state added: heatmap grid, filter bar, day headers, session rows, and achievement rows all shimmer while data loads (previously just showed `Loading…`).

### Pipelines

- fix: **RA games file** about 1MB smaller, game card screenshots restored
  RA `games.json` strips unused fields before writing: removes `richPresencePatch`, `imageBoxArt`, `forumTopicId`, `flags`, `isFinal`, `releasedAtGranularity`, `numDistinctPlayers*`, `userCompletion*` from game objects and `memAddr`, `authorUlid`, `dateCreated`, `dateModified`, `author` from achievement objects (~1MB saved). `imageIngame` and `imageTitle` were mistakenly stripped in a prior run (causing game card backgrounds to show icons instead of screenshots) and are restored to pipeline output.
- improved: **Steam achievement icons** stored as hashes, saving about 1.4MB
  Icon URLs stored as filename hash only in `games.json` instead of full CDN URLs (~1.4MB saved); `achIconUrl(appId, hash)` helper in `helpers.js` reconstructs full URLs at render time; `achievements.json` and `profile.json` continue to store full URLs.
- improved: **Steam achievement progress** carries its `appId`
  `appId` now embedded in each Steam achievement progress object so the Activity tab can reconstruct icon URLs without a separate lookup.

### Structure

- improved: **RA data folder** renamed to `data/ra/`
  Renamed `data/retroachievements/` → `data/ra/`.
- improved: **RA achievement chunks** moved into their own folder
  Moved from `data/ra/achievements_N.json` → `data/ra/achievements/N.json`.
- improved: **RA heatmap** moved to its own file
  `activityHeatmap` extracted from `profile.json` into `data/ra/achievements/heatmap.json`; the frontend fetches it separately when the Activity tab opens.
- new: **Steam achievement chunks** and heatmap file, like RA
  Steam achievements split into quarterly chunks at `data/steam/achievements/N.json` mirroring RA structure; `data/steam/achievements/heatmap.json` added with precomputed day→count map.
- improved: **Most recent unlock** available without loading any chunk
  `mostRecentUnlock` moved from `achievements.json` into `profile.json` so it's available on mount without loading any chunk.
- improved: **Steam Activity tab** uses the precomputed heatmap
  `ActivityTab` now receives `heatmapData` as a prop (precomputed) instead of deriving it client-side from loaded achievements; chunks lazy-loaded when the Activity tab opens.
- improved: **Steam Activity tab** loads one chunk at a time
  Via `loadNextChunk` (matching the RA pattern) with a "Load more" button and shimmer skeleton; previously loaded all 4 chunks at once.
- improved: **Combined activity page** shows the newest data first, faster
  `/activity/` loads chunk 1 of both RA and Steam first for fast initial render, then streams chunks 2–4 in the background; previously loaded all 8 chunks concurrently on mount.

### RetroAchievements

- improved: **Achievement modal** header shows the subset name
  `RAchievementModal` header shows the subset name as a subtext line (e.g. `Sonic the Hedgehog [Subset - Bonus]`), matching the `GameCard` display.
- new: **Achievement preview strip** on game cards
  `GameCard` shows up to 6 achievement badge icons (unlocked first) with hover tooltips showing name, description, points, and HC badge; clicking opens the detail modal.
- new: **Achievement detail modal** for RA games
  `RAchievementModal`: full-screen modal with game header (icon, console, status, progress bars), optional genre/developer/released meta row, Status (All/Unlocked/Locked) and Type (All/Progression/Missable) filter rows, and per-achievement rarity ratio badge (UR/VR/R/UC), type icons (Progression/Win Condition/Missable), HC/SC completion bars, and unlock date.
- new: **Modal popovers** never clipped by scrolling
  Popovers (rarity badge, type icons) use `position: fixed` + `getBoundingClientRect`, escaping the scroll container so tooltips are never clipped regardless of scroll position.
- improved: **Progress labels** on game cards get a text shadow
  Progress percentage labels on `GameCard` now have a text shadow to match Steam.

### Steam

- new: **Achievement preview strip** on Steam game cards
  `SteamGameCard` shows the same strip with hover tooltips showing name, description, and rarity gem + label + %; clicking opens the detail modal.
- new: **Achievement detail modal** for Steam games
  `AchievementModal`: game header image, progress bar, Status filter, and per-achievement rarity bar + gem + label + % and unlock date.

---

## v26.03.26

Combined activity feed launched at `/activity/`, hub gets a recent activity snippet, project restructured under `/profile/` and renamed to `gaming-hub`. Changelog page added.

### Hub

- new: **Recent Activity** section on the hub
  The 8 most recent combined achievements with a "View all →" link to `/activity/`.
- new: **Activity section** can be switched off in the config
  Toggled by `activity.visible` in `config.json`; hidden by default until config loads (no skeleton flash when disabled).
- improved: **Time ago** shows minutes and hours
  Hub activity `timeAgo` now shows minute/hour granularity (`5m ago`, `2h ago`) instead of day-only (`today`).
- fix: **Steam** no longer scrolls sideways on phones
  Horizontal overflow on mobile fixed (`overflow-x: hidden` on `html, body`).

### Activity

- new: **Combined activity page** with heatmap, filter and timeline
  New page at `/activity/`: heatmap, platform filter (All / RA / Steam), timeline grouped by day → game session → achievement.
- new: **Day headers** fold, and a heatmap day filters the list
  Day headers are collapsible; click any heatmap cell to filter to that day.
- new: **Game sessions** with platform, icon, console and time range
  Sessions show platform icon, game icon, console name (RA only), and unlock time range.
- new: **Achievement rows** with a border in the platform colour
  Rows show icon, name, description, and unlock time; left border colored by platform (gold = RA, blue = Steam).
- new: **RA game names** show subset and tilde tags
  RA game names parsed for subset and tilde tags; subset badge + name rendered inline in the session header.
- new: **Heatmap colors** follow the platform filter
  Colors switch to the gold/blue palette based on the active platform filter.

### Structure

- improved: **Platform profiles** moved under `/profile/`
  RA at `/profile/ra/`, Steam at `/profile/steam/`.
- new: **Profile folder** redirects to the hub
  `/profile/index.html` added as an instant redirect to hub (prevents directory listing).
- improved: **Page scripts** all named `app.js`
  `profile.js` renamed to `app.js` across all pages for consistency.
- improved: **Steam code** split into helper files
  Steam `app.js` split into `utils/constants.js` (`STEAM_STATUS`, `PROGRESS_SORTS`) and `utils/helpers.js` (formatting, URL, and rarity helpers).
- improved: **Activity code** split into helper files
  Activity `app.js` split into `utils/constants.js`, `utils/helpers.js`, and `utils/normalizers.js` (`normalizeRA`, `normalizeSteam`).
- improved: **Gaming Hub** is the new name
  Repo and app renamed from `gaming-profile` to `gaming-hub`; all "Gaming Profile" references updated to "Gaming Hub".
- new: **Changelog page** at `/changelog/`
  Fetches and parses `changelog.md`, renders releases with collapsible sections, platform color coding, and per-release summaries.
- new: **Changelog link** in the hub footer
  Changelog linked from hub footer.

### Pipelines

- improved: **Commit messages** say which kind of run made them
  RA and Steam workflows now use differentiated commit messages: `update` for incremental, `full refresh` for full game refresh, `unlock refresh` for Steam unlock-only runs.

---

## v26.03.25

Steam profile fully built out with achievement rarity system and pipeline automation; hub overhauled with dynamic config and per-platform visibility controls.

### Hub

- new: **Sticky topbar**
- improved: **Hub config file** renamed to `config.json`
  `data/hub/profile.json` renamed to `data/hub/config.json`.
- new: **Per-platform settings** for visibility and active state
  Per-platform config with `visible` and `active` flags; active/coming soon counts derived dynamically.
- improved: **Active / coming soon** text hidden when the count is 0
- new: **Hidden platforms** drop out of the grid
  Cards with `visible: false` are hidden; grid recenters for fewer than 3 visible platforms.
- improved: **Header subtitle** a bit larger
  Size bumped from 9px to 11px.
- new: **Back-to-top button** on the hub
  Same as the RA page.
- improved: **Recently played rows** spaced evenly
  Row spacing improved; rows use `flex:1` to fill card height evenly on both RA and Steam cards.
- improved: **Row text** gets a small gap between title and sub line
  Row text gap added (2px) between title and sub lines.

### RetroAchievements

- fix: **Recently played games** with no unlocks now show up
  Recently played games with 0 earned achievements are now always fetched so they appear in the dashboard.
- improved: **Most Recently Unlocked** game name gets a clearer hover
  Hover color changed to soft white (`#c6d4df`) for clearer feedback.
- new: **Sticky topbar and tab bar**

### Steam

- new: **Achievement rarity** with colours, borders and gem icons
  Very Rare (<10%), Rare (<10–30%), Common (≥30%) with gold/blue/gray color coding via left border, title color, and gem icon.
- new: **Global achievement %** fetched for each game
  Fetched per game via the `GetGlobalAchievementPercentagesForApp` API; stored as `globalPct` on each achievement.
- improved: **Most Recently Unlocked** card in four lines
  4-line layout (name, description with fallback, rarity, game+time); game name links to the store page.
- improved: **Most Recently Played** card shows the latest achievement
  Latest achievement row added; consistent row spacing.
- improved: **Activity tab** shows rarity and links games to the store
  Rarity gem icon + label + % shown per achievement; game name links to the store page.
- improved: **Game card** uses the library portrait as background
  Removed "Latest:" label; library portrait (`library_600x900.jpg`) used as card background with correct mask fade; portrait fallback to `header.jpg`.
- improved: **Achievement expanded view** shows rarity instead of "Global: X%"
  "Global: X%" replaced with rarity gem + label + %; locked achievement bar uses a neutral color.
- improved: **Completion tab** sorts ties by latest unlock
  Tiebreaker sort by last achievement unlocked date when pct is equal.
- improved: **Perfect games sidebar** sorted by rarity, on every tab
  Sorted by rarity ascending; shows rarity label + % with gem icon; available on all tabs (moved to `profile.json`).
- improved: **No-achievement cache** split from the games file
  `sentinel-cache.json` separated from `games.json`: pipeline-only, not loaded by frontend.
- improved: **Recently played games** with no unlocks cached with all achievements
  Zero-unlock recently played games now cached with full locked achievement list.
- improved: **Recent achievements** include rarity
  `recentAchievements` entries include `globalPct` for Activity tab rarity display.
- new: **Sticky topbar and tab bar**
- fix: **Card fade** goes the right direction
  Fixed inverted `mask-fade` CSS in `steam/index.html` (was fading wrong direction).
- new: **Steam data workflow** on GitHub Actions
  `fetch-steam-data.yml`: incremental every 3h at :10, unlock refresh at midnight :10.
- fix: **Steam ID variable** renamed to match the workflow secret
  Env var renamed from `STEAM_ID` to `STEAM_USER_ID` to match the GitHub Actions workflow secret name.

---

## v26.03.24

Hub rendered dynamically from config file; RA dashboard improvements including lazy-loaded activity, tilde tag badges, and refactored utils; automated data pipeline introduced.

### Hub

- improved: **Hub profile** read from a config file
  Hub profile data (`username`, `motto`, `tags`, `platforms`) moved to `data/hub/config.json`; `index.html` renders it dynamically.

### RetroAchievements

- fix: **Want-to-play list** fetches every item past 500
  Paginates to fetch all items beyond the 500-item API limit.
- improved: **RA code** split into helper files
  `app.js` refactored: non-JSX code extracted into `utils/constants.js`, `utils/helpers.js`, and `utils/transform.js`.
- improved: **Points** shown in gold in the stats pills
  Stats pills: points shown in gold to improve visual hierarchy.
- improved: **Activity tab** loads achievements three months at a time
  Lazy-loads achievements in 3-month chunks; heatmap stays complete using precomputed data from `profile.json`.
- new: **Tilde tag badges** on game titles
  Game title tilde tags (`~Homebrew~`, `~Hack~`, etc.) displayed as badges across dashboard and hub.

### Structure

- new: **Incremental pipeline** with quarterly achievement files
  Pipeline supports incremental mode (skips cached games) and splits achievement data into quarterly files.
- new: **Automatic data updates** on GitHub Actions
  Automated workflow fetches data every 3 hours and does a full refresh at midnight, commits results to main.
- improved: **Scripts** moved to `scripts/` with npm commands
  Scripts reorganized into `scripts/` folder; `package.json` at root with `npm run` commands for all tasks.

---

## v25.03.23 — Initial release

First release — hub page with RA card, full RA dashboard with heatmap and timeline, and ETL pipeline for data fetching.

### Hub

- new: **Hub page** with a RetroAchievements card
  Steam and Xbox coming-soon placeholders.

### RetroAchievements

- new: **RA dashboard** with Overview, Recent Games, Completion Progress, Activity and Watchlist
  Activity has a heatmap + timeline.
- new: **Loading skeleton** and phone layout
  Shimmer skeleton loading, mobile-responsive layout.

### Structure

- new: **Data pipeline** fetching a year of achievements
  ETL pipeline with 1-year achievement fetch, Firebase Firestore sync (disabled).
