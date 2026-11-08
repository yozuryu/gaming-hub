import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Gamepad2, Activity, BarChart2, Award, Star, ChevronDown, AlertCircle, Trophy, Crown, Lock, Unlock, AlertTriangle, Flame, Feather, Medal, ShieldOff, CircleDashed, X, Clock, Layers, List, LayoutGrid, Search, Check, Plus, User, Radio, ArrowDown, Hourglass, ChevronLeft } from 'lucide-react';
import { MEDIA_URL, SITE_URL, TILDE_TAG_COLORS } from './utils/constants.js';
import { getMediaUrl, parseTitle, formatTimeAgo, raShot } from './utils/helpers.js';
import { transformData } from './utils/transform.js';
import { useSheet, useArtSrc, useAnimatedHeight, SheetHead, seriesTags, statusPills } from '../../assets/sheet.js';
import { useGameView, shortAgo } from '../../assets/game-view.js';
import { CompletionsPanel } from '../../assets/completions.js';
import { SubFold, SubStrip, SubChips, subsMatch } from '../../assets/subseries.js';
import { TabBar, useSwipeTabs, scrollToTabs } from '../../assets/tabs.js';
import { computeStreak, useSummaryOpen, ActivitySummary, yearOf, DayHead, RunCard, RunCount, UnlockRow, ActivitySkeleton } from '../../assets/activity-ui.js';
import { TZ, toMs, dayKey, addDays, keyToDate, fmtDate, fmtClock, buildHeatmap } from '../../assets/time.js';

// --- JSX Helpers ---
const renderTildeTags = (tags) => {
  if (!tags || tags.length === 0) return null;
  return tags.map(tag => {
    const style = TILDE_TAG_COLORS[tag] || TILDE_TAG_COLORS['Prototype'];
    return (
      <span key={tag} style={{
        fontSize: '7px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
        padding: '1px 4px', borderRadius: '2px',
        border: `1px solid ${style.border}`, background: style.bg, color: style.color,
        flexShrink: 0,
      }}>{tag}</span>
    );
  });
};

// --- Components ---

// ── Overview stat tiles (styles in assets/ui.css) ──────────────────────────────
const StatTiles = ({ items }) => (
  <div className="stiles">
    {items.map(st => <div key={st.label} className="stile"><b title={st.value}>{st.value}</b><span>{st.label}</span></div>)}
  </div>
);
// Shorter labels for the tiles
const STAT_LABELS = {
  'Points earned in the last 7 days': 'Points, last 7 days',
  'Points earned in the last 30 days': 'Points, last 30 days',
  'Average points per week': 'Avg points per week',
};

// ── Progress filter bar ─────────────────────────────────────────────────────
// Views bucket started-but-unfinished games, first match wins:
// nearly there → in progress → abandoned. "Nearly there" ignores recency on
// purpose — a game dropped at 80% is the one most worth picking back up.
const PROGRESS_VIEWS = [
  { value: 'all',        label: 'All'          },
  { value: 'nearly',     label: 'Nearly there', rules: [[Trophy, <><b>75%+</b> done</>], [ArrowDown, 'Fewest left first']] },
  { value: 'inprogress', label: 'In progress',  rules: [[Clock, <>Played in the last <b>30</b> days</>], [ArrowDown, 'Most recent first']] },
  { value: 'abandoned',  label: 'Abandoned',    rules: [[Hourglass, 'Unfinished'], [Clock, <>Idle <b>30+</b> days</>]] },
];
const NEARLY_PCT = 75;
// Search text without accents or case, so "pokemon" finds "Pokémon"
const fold = str => (str ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const STALE_MS   = 30 * 24 * 60 * 60 * 1000;


const ProgressFilterBar = ({ view, onView, sorts, sort, onSort, completedLabel, showCompleted, onShowCompleted, counts, search, onSearch, viewToggle }) => {
  const rules = PROGRESS_VIEWS.find(v => v.value === view)?.rules;
  return (
    <div className="flex flex-col gap-2.5 mb-4 anim-fade">
      {/* Views, plus the completed toggle in the All view: one row that scrolls sideways (chip styles in assets/ui.css) */}
      <div className="frow" role="group" aria-label="Show">
        {PROGRESS_VIEWS.map(v => (
          <button key={v.value} onClick={() => onView(v.value)} aria-pressed={view === v.value}
            className={`fchip ${view === v.value ? 'on' : ''}`}>{v.label}{counts && <span className="n">{counts[v.value].toLocaleString()}</span>}</button>
        ))}
        {view === 'all' && (
          <>
            <span className="fsep" />
            <button onClick={() => onShowCompleted(v => !v)} aria-pressed={showCompleted} title={`Include ${completedLabel.toLowerCase()} games`}
              className={`fchip anim-fade ${showCompleted ? 'on' : ''}`}>
              {showCompleted ? <Check size={12} /> : <Plus size={12} />}{completedLabel}
            </button>
          </>
        )}
      </div>

      {/* Search, sort (All view only: the other views have a fixed order) and the list / tiles switch */}
      <div className="fbar">
        <div className="fsearch">
          <Search size={14} />
          <input type="text" inputMode="search" value={search} onChange={e => onSearch(e.target.value)} placeholder="Search games" aria-label="Search games" />
          {search && <button onClick={() => onSearch('')} aria-label="Clear search"><X size={13} /></button>}
        </div>
        {view === 'all' && (
          <select value={sort} onChange={e => onSort(e.target.value)} className="fselect anim-fade" aria-label="Sort">
            {sorts.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        )}
        {viewToggle}
      </div>

      {rules && <div key={view} className="crits anim-fade">{rules.map(([Icon, text], i) => <span key={i} className="crit"><Icon />{text}</span>)}</div>}
    </div>
  );
};

// Buckets a list of in-progress games by view. Caller supplies accessors so RA
// and Steam games (different shapes) share the same rules.
const applyProgressView = (games, view, { pct, left, lastPlayedMs, isCompleted }) => {
  const now = Date.now();
  const isNearly = g => !isCompleted(g) && pct(g) >= NEARLY_PCT;
  const isStale  = g => { const t = lastPlayedMs(g); return !t || now - t > STALE_MS; };
  const byRecency = (a, b) => (lastPlayedMs(b) || 0) - (lastPlayedMs(a) || 0);
  if (view === 'nearly')     return games.filter(isNearly).sort((a, b) => (left(a) - left(b)) || (pct(b) - pct(a)));
  if (view === 'inprogress') return games.filter(g => !isCompleted(g) && !isNearly(g) && !isStale(g)).sort(byRecency);
  if (view === 'abandoned')  return games.filter(g => !isCompleted(g) && !isNearly(g) && isStale(g)).sort(byRecency);
  return null; // 'all' — caller applies its own sort and completed toggle
};

// Games per view for the chips, from the same rules as the list (All honours the completed toggle)
const progressViewCounts = (games, acc, showCompleted) => Object.fromEntries(PROGRESS_VIEWS.map(v => [v.value,
  v.value === 'all' ? games.filter(g => showCompleted || !acc.isCompleted(g)).length : applyProgressView(games, v.value, acc).length]));

// RA dates come as "YYYY-MM-DD HH:MM:SS" (UTC) or ISO; Safari can't parse the former
const raDateMs = s => {
  if (!s) return 0;
  const t = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z').getTime();
  return Number.isNaN(t) ? 0 : t;
};


// ── Game list: list / tiles views ────────────────────────────────────────────
// Status colour on the card edge, same ladder as everywhere: mastered gold, beaten silver,
// started blue, not started, no achievements
const gameStatusColor = g =>
  g.isMastered ? '#e5b143' : g.isBeaten ? '#b8c4ce' : g.achievementsUnlocked > 0 ? '#66c0f4' : g.achievementsTotal > 0 ? '#323f4c' : '#1e2a35';

const ModeIcon = ({ game, size = 11 }) => {
  if (!game.achievementsUnlocked) return null;
  return game.hardcore
    ? <Flame size={size} className="text-[#ff6b6b]" aria-label="Hardcore" />
    : <Feather size={size} className="text-[#8f98a0]" aria-label="Softcore" />;
};

const GameProgress = ({ game }) => (
  <>
    <span className="gcount" style={game.isMastered ? { color: '#e5b143' } : undefined}>
      {game.achievementsUnlocked}<span>/{game.achievementsTotal}</span>
    </span>
    <div className="gbar"><i style={{ width: `${game.rawProgress}%`, background: game.isMastered ? '#e5b143' : '#66c0f4' }} /></div>
  </>
);

// Wide art picked in the admin (data/ra/art.json, SteamGridDB): game.wide = { banner, art, header }.
// Tiles show the banner (like a Steam tile); rows and the sheet keep the square icon, with the hero
// (or the banner) faded / blurred behind. Without art, or if the banner fails to load, today's look.
const WideBanner = ({ game, cls }) => {
  const [failed, setFailed] = useState(false);
  return failed
    ? <img src={game.icon} alt="" loading="lazy" className={cls === 'banner' ? 'icon px' : 'grow-icon px'} />
    : <img src={game.wide.banner} alt="" loading="lazy" className={cls} onError={() => setFailed(true)} />;
};

// One compact row: icon, title, console + mode + tags, playtime · last played, count and bar.
// Tap opens the achievement sheet (badges and the progression bar live there).
const GameListRow = ({ game, onViewDetails, extra = null, compact = false }) => {
  const hasAch = game.achievementsTotal > 0;
  const ago = shortAgo(raDateMs(game.lastPlayedStr));
  const Tag = hasAch ? 'button' : 'div';
  return (
    <Tag onClick={hasAch ? () => onViewDetails(game) : undefined} className={`grow ${compact ? 'compact' : ''}`} style={{ borderLeftColor: gameStatusColor(game) }}>
      {game.wide
        ? <div className="grow-art"><img src={game.wide.art} alt="" loading="lazy" onError={e => { e.target.style.display = 'none'; }} /></div>
        : game.background && <div className="grow-art"><img src={game.background} alt="" loading="lazy" className={`px ${game.artIsIcon ? 'art-icon' : ''}`} /></div>}
      {/* Rows keep the square icon for a uniform list; only the art behind changes */}
      <img src={game.icon} alt="" loading="lazy" className="grow-icon px" />
      <div className="grow-main">
        <span className="grow-title">{game.baseTitle || game.title}</span>
        <div className="grow-sub">
          <span className="text-[#66c0f4] keep">{game.console}</span>
          {game.isSubset && game.subsetName && <span className="text-[#c8a84b] shrink">{game.subsetName}</span>}
          {renderTildeTags(game.tags)}
          <ModeIcon game={game} />
          <span className="shrink">{[game.playtime !== 'Unknown' ? game.playtime : null, ago].filter(Boolean).join(' · ')}</span>
        </div>
        {extra}
      </div>
      <div className="grow-prog">
        {hasAch ? <GameProgress game={game} /> : <span className="text-[11px] text-[#546270]">No achievements</span>}
      </div>
    </Tag>
  );
};

// Tile: icon over its blurred screenshot (or its own zoomed icon), last played, mode, title,
// console, one bar, count and playtime; status colour on the bottom edge
const GameTile = ({ game, onViewDetails }) => {
  const hasAch = game.achievementsTotal > 0;
  const ago = shortAgo(raDateMs(game.lastPlayedStr));
  const Tag = hasAch ? 'button' : 'div';
  return (
    <Tag onClick={hasAch ? () => onViewDetails(game) : undefined} className="gtile" style={{ borderBottomColor: gameStatusColor(game) }}>
      <div className="gtile-art">
        {game.wide ? <WideBanner game={game} cls="banner" /> : <>
          <img src={game.background || game.icon} alt="" loading="lazy" className={`bg px ${game.artIsIcon || !game.background ? 'art-icon' : ''}`} />
          <img src={game.icon} alt="" loading="lazy" className="icon px" />
        </>}
        {ago && <span className="gtile-ago">{ago}</span>}
        {game.achievementsUnlocked > 0 && (
          <span className="gtile-mode" style={{ borderColor: game.hardcore ? 'rgba(255,107,107,0.45)' : '#323f4c' }}><ModeIcon game={game} /></span>
        )}
      </div>
      <div className="gtile-body">
        <span className="gtile-title">{game.baseTitle || game.title}</span>
        <div className="gtile-sub"><span className="shrink">{game.console}</span>{renderTildeTags(game.tags)}</div>
        {hasAch && <div className="gbar"><i style={{ width: `${game.rawProgress}%`, background: game.isMastered ? '#e5b143' : '#66c0f4' }} /></div>}
        <div className="gtile-meta">
          <span style={game.isMastered ? { color: '#e5b143' } : undefined}>{hasAch ? `${game.achievementsUnlocked}/${game.achievementsTotal}` : 'No achievements'}</span>
          {game.playtime !== 'Unknown' && <span>{game.playtime}</span>}
        </div>
      </div>
    </Tag>
  );
};

const ViewToggle = ({ view, onChange }) => (
  <div className="vtoggle" role="group" aria-label="Game list view">
    <button onClick={() => onChange('list')} className={view === 'list' ? 'on' : ''} aria-pressed={view === 'list'} title="List"><List size={14} /></button>
    <button onClick={() => onChange('tiles')} className={view === 'tiles' ? 'on' : ''} aria-pressed={view === 'tiles'} title="Tiles"><LayoutGrid size={13} /></button>
  </div>
);

const GameViewSkeleton = ({ view, count = 4 }) => view === 'tiles' ? (
  <div className="gtiles">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="gtile"><div className="gtile-art shimmer" /><div className="gtile-body"><div className="shimmer h-3 w-3/4 rounded-[2px]" /><div className="shimmer h-2.5 w-1/2 rounded-[2px]" /><div className="shimmer h-1 rounded-[2px]" /></div></div>
    ))}
  </div>
) : (
  <div className="glist">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="grow"><div className="grow-icon shimmer" /><div className="grow-main"><div className="shimmer h-3 w-2/3 rounded-[2px]" /><div className="shimmer h-2.5 w-1/2 rounded-[2px]" /></div></div>
    ))}
  </div>
);

// Profile header background: the latest game's art, blurred, fading into the header
// (layers in assets/ui.css). Fades in once loaded; the header stays flat until then.
const HeaderArt = ({ urls, icon = false, wide = false }) => {
  const art = useArtSrc(urls);
  if (!art.src) return null;
  return (
    <div className="art-bg art-header">
      <img src={art.src} alt="" ref={art.ref} onLoad={art.onLoad} onError={art.onError}
        className={`${wide ? '' : icon ? 'px art-icon' : 'px'} ${art.loaded ? 'loaded' : ''}`} />
    </div>
  );
};

// ── RAchievementModal ─────────────────────────────────────────────────────────

// Achievement list placeholder while games.json loads (same as Steam / Xbox)
const ModalListSkeleton = () => (
  <div className="px-4 py-3 flex flex-col gap-1.5" aria-busy="true">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-2 bg-[#202d39] border border-[#2a475e] rounded-[2px]">
        <div className="shimmer w-10 h-10 rounded-[2px] shrink-0" />
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="shimmer h-2.5 rounded" style={{ width: `${40 + (i % 3) * 15}%` }} />
          <div className="shimmer h-2 rounded" style={{ width: `${60 + (i % 2) * 20}%` }} />
        </div>
      </div>
    ))}
  </div>
);

const RAchievementModal = ({ game, onClose, onBack = null, backLabel = '', loading = false }) => {
  const [lockFilter, setLockFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const panelRef = useRef(null);
  useAnimatedHeight(panelRef);
  const [tooltip,    setTooltip]    = useState(null); // { content, rect }

  const showTip = (e, content) => setTooltip({ content, rect: e.currentTarget.getBoundingClientRect() });
  const hideTip = () => setTooltip(null);

  const filteredAchs = useMemo(() => {
    if (!game.achievements) return [];
    return game.achievements.filter(ach => {
      if (lockFilter === 'unlocked' && !ach.isUnlocked) return false;
      if (lockFilter === 'locked'   &&  ach.isUnlocked) return false;
      if (typeFilter === 'progression' && ach.type !== 'progression' && ach.type !== 'win_condition') return false;
      if (typeFilter === 'missable'    && ach.type !== 'missable') return false;
      return true;
    });
  }, [game.achievements, lockFilter, typeFilter]);

  // Chip counts, each over the whole set (not narrowed by the other filter)
  const achCounts = useMemo(() => {
    const all = game.achievements ?? [];
    const unlocked = all.filter(a => a.isUnlocked).length;
    return {
      all: all.length, unlocked, locked: all.length - unlocked,
      progression: all.filter(a => a.type === 'progression' || a.type === 'win_condition').length,
      missable: all.filter(a => a.type === 'missable').length,
    };
  }, [game.achievements]);

  // Progression from the games index summary (transform.js), so the meter is there before the game's file loads
  const progTotal    = game.progTotal ?? 0;
  const progUnlocked = game.progEarned ?? 0;
  // Opened before the games index (a ?game= link, Overview): points, playtime and progression are
  // unknown until the game's file is in, so the header holds their places with shimmers
  const pending = loading && game.progTotal == null;
  const lastAgo = game.lastPlayed && game.lastPlayed !== 'Never' ? game.lastPlayed : null;
  // Points: from the achievements once the game's file is in, else the games index summary
  const points = game.achievements?.length
    ? { earned: game.achievements.reduce((n, a) => n + (a.isUnlocked ? a.points || 0 : 0), 0), total: game.achievements.reduce((n, a) => n + (a.points || 0), 0) }
    : game.summary?.points ? { earned: game.summary.pointsEarned ?? 0, total: game.summary.points } : null;

  const rootRef = useRef(null);
  const dragRef = useRef(null);
  const close = useSheet({ panelRef, dragRef, rootRef, onClose });
  const art = useArtSrc([game.wide?.header, game.background]);
  const artIsWide = !!game.wide && art.src === game.wide.header;

  return (
    <div ref={rootRef} className="sheet-root" onClick={close}>
      <div className="sheet-backdrop anim-backdrop" />

      <div ref={panelRef} className="sheet-panel" onClick={e => e.stopPropagation()}>
        <button onClick={close} className="sheet-close" aria-label="Close"><X size={15} /></button>
        {onBack && <button onClick={onBack} className="sheet-back" aria-label={`Back to ${backLabel}`}><ChevronDown size={14} className="rotate-90" />{backLabel}</button>}

        {/* Header (shared SheetHead): blurred screenshot or wide art behind it; drag it down to close on phone */}
        <SheetHead dragRef={dragRef} back={!!onBack}
          art={art.src && (
            <div className="art-bg art-sheet">
              <img src={art.src} alt="" ref={art.ref} onLoad={art.onLoad} onError={art.onError} className={`${artIsWide ? '' : `px ${game.artIsIcon ? 'art-icon' : ''}`} ${art.loaded ? 'loaded' : ''}`} />
            </div>
          )}
          cover={
            <a href={`${SITE_URL}/game/${game.id}`} target="_blank" rel="noreferrer"
              className="relative shrink-0 w-16 h-16 rounded-[3px] overflow-hidden border-2 border-white/20 bg-[#101214] shadow-[0_6px_18px_rgba(0,0,0,0.55)] hover:scale-105 transition-transform">
              <img src={game.icon} alt={game.title} className="w-full h-full object-cover" />
            </a>
          }
          title={<a href={`${SITE_URL}/game/${game.id}`} target="_blank" rel="noreferrer" className="transition-colors">{game.baseTitle || game.title}</a>}
          sub={game.isSubset && game.subsetName ? game.subsetName : null}
          meta={[
            <span className="text-[#66c0f4] inline-flex items-center gap-1"><Gamepad2 size={11} />{game.console}</span>,
            game.released, game.developer, game.genre,
          ]}
          tags={[
            game.isMastered && <span key="m" className="shrink-0 text-[9px] text-[#101214] bg-[#e5b143] px-1.5 py-[1px] rounded-sm font-bold uppercase tracking-wider flex items-center gap-1"><Trophy size={10} /> Mastered</span>,
            game.isBeaten && !game.isMastered && <span key="b" className="shrink-0 text-[9px] text-[#c6d4df] bg-[#2a3440] px-1.5 py-[1px] rounded-sm font-bold uppercase tracking-wider border border-[#b8c4ce]/30 flex items-center gap-1"><Medal size={10} /> Beaten</span>,
            game.achievementsUnlocked > 0 && (game.hardcore
              ? <span key="h" className="shrink-0 text-[9px] text-[#ff6b6b] border border-[#ff6b6b]/30 bg-[#101214]/60 px-1.5 py-[1px] rounded-sm font-semibold uppercase tracking-wider flex items-center gap-1"><Flame size={10} /> Hardcore</span>
              : <span key="s" className="shrink-0 text-[9px] text-[#8f98a0] border border-[#323f4c] bg-[#101214]/60 px-1.5 py-[1px] rounded-sm font-semibold uppercase tracking-wider flex items-center gap-1"><Feather size={10} /> Softcore</span>),
            game.isSubset && <span key="sub" className="text-[8px] font-bold uppercase tracking-[0.07em] px-1.5 py-[1px] rounded-[2px] border border-[rgba(229,177,67,0.3)] bg-[rgba(229,177,67,0.1)] text-[#c8a84b] shrink-0">Subset</span>,
            ...(game.tags?.length ? [<React.Fragment key="t">{renderTildeTags(game.tags)}</React.Fragment>] : []),
          ]}
          stats={[
            { value: game.achievementsUnlocked ?? 0, total: game.achievementsTotal ?? 0, label: 'Achievements', color: '#66c0f4' },
            points ? { value: points.earned.toLocaleString(), total: points.total.toLocaleString(), label: 'Points', color: '#e5b143' }
              : pending && { value: null, label: 'Points' },
            pending ? { value: null, label: 'Played' }
            : game.playtime && game.playtime !== 'Unknown'
              ? { value: game.playtime.replace(/^0h /, ''), label: 'Played', color: '#c6d4df' }
              : lastAgo && { value: lastAgo, label: 'Last played', color: '#c6d4df' },
          ].filter(Boolean)}
          bar={game.achievementsTotal > 0 ? { pct: game.rawProgress, color: game.isMastered ? '#e5b143' : '#66c0f4' } : null}
          steps={progTotal > 0 ? { done: progUnlocked, total: progTotal, icon: <Trophy size={11} /> } : pending ? { pending: true, icon: <Trophy size={11} /> } : null}
        />

        {loading && <ModalListSkeleton />}

        {/* Filters: status (one of three), then the type toggles; tap an active type again to clear it */}
        {!loading && <>
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#101214] shrink-0 anim-fade">
          <div className="frow flex-1 min-w-0" role="group" aria-label="Filter achievements">
            {[
              { value: 'all',      label: 'All',      icon: null },
              { value: 'unlocked', label: 'Unlocked', icon: <Unlock size={11} /> },
              { value: 'locked',   label: 'Locked',   icon: <Lock size={11} /> },
            ].map(opt => (
              <button key={opt.value} onClick={() => setLockFilter(opt.value)} aria-pressed={lockFilter === opt.value}
                className={`fchip ${lockFilter === opt.value ? 'on' : ''}`}>{opt.icon}{opt.label}<span className="n">{achCounts[opt.value]}</span></button>
            ))}
            <span className="fsep" />
            {[
              { value: 'progression', label: 'Progression', icon: <Trophy size={11} className="text-[#e5b143]" /> },
              { value: 'missable',    label: 'Missable',    icon: <AlertTriangle size={11} className="text-[#ff9800]" /> },
            ].map(opt => (
              <button key={opt.value} onClick={() => setTypeFilter(typeFilter === opt.value ? 'all' : opt.value)} aria-pressed={typeFilter === opt.value}
                className={`fchip ${typeFilter === opt.value ? 'on' : ''}`}>{opt.icon}{opt.label}<span className="n">{achCounts[opt.value]}</span></button>
            ))}
          </div>
        </div>

        {/* Achievement list */}
        {/* Re-keyed so a filter change fades the new list in (the panel height animates too) */}
        <div key={`${lockFilter}-${typeFilter}`} className="sheet-scroll overflow-y-auto overscroll-contain flex-1 min-h-0 px-4 pt-3 space-y-1.5 anim-fade">
          {filteredAchs.length > 0 ? filteredAchs.map(ach => {
            const casualPct   = game.totalPlayers   > 1 ? Math.min(100, (ach.numAwardedCasual   / game.totalPlayers)   * 100).toFixed(2) : null;
            const hardcorePct = game.totalPlayersHC > 1 ? Math.min(100, (ach.numAwardedHardcore / game.totalPlayersHC) * 100).toFixed(2) : null;
            return (
              <div key={ach.id}
                className={`flex items-center gap-3 p-2 rounded-[2px] border border-transparent border-l-[3px] transition-colors ${ach.isUnlocked ? 'bg-[#202d39] hover:bg-[#253444]' : 'bg-[#171a21] opacity-75 border-l-[#323f4c]'} ${ach.isHardcore ? 'border-l-[#e5b143]' : ach.isUnlocked ? 'border-l-[#8f98a0]' : ''}`}
              >
                <a href={`${SITE_URL}/achievement/${ach.id}`} target="_blank" rel="noreferrer"
                  className="relative shrink-0 w-10 h-10 rounded-[2px] border border-[#101214] overflow-hidden bg-black hover:scale-105 transition-transform block">
                  <img src={`${MEDIA_URL}/Badge/${ach.badgeName || '00001'}.png`} alt={ach.title}
                    className={`w-full h-full object-cover ${!ach.isUnlocked ? 'grayscale brightness-40' : ''}`} />
                  {!ach.isUnlocked && <Lock size={14} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/50" />}
                </a>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <a href={`${SITE_URL}/achievement/${ach.id}`} target="_blank" rel="noreferrer"
                      className={`text-[12px] font-medium tracking-wide leading-tight hover:underline ${ach.isUnlocked ? 'text-[#e5b143]' : 'text-[#8f98a0]'}`}>
                      {ach.title}
                    </a>
                    <span className="text-[9px] font-bold text-[#66c0f4] bg-[#101214] border border-[#323f4c] px-1.5 py-[1px] rounded-sm shrink-0">{ach.points} pts</span>
                    {ach.trueRatio > 0 && ach.points > 0 && (
                      <span className={`text-[9px] shrink-0 ${!ach.isUnlocked ? 'opacity-40' : ''}`} style={{ color: (() => { const r = ach.trueRatio / ach.points; return r >= 30 ? '#ff6b6b' : r >= 20 ? '#e5b143' : r >= 10 ? '#66c0f4' : '#8f98a0'; })() }}>×{(ach.trueRatio / ach.points).toFixed(1)}</span>
                    )}
                    {ach.type === 'progression' && <span className="shrink-0 cursor-help inline-flex items-center" onMouseEnter={e => showTip(e, <><div className="pop-name" style={{color:'#e5b143'}}>Progression</div><div className="pop-sub">Required to complete the game</div></>)} onMouseLeave={hideTip}><Trophy size={11} className="text-[#e5b143]" /></span>}
                    {ach.type === 'win_condition' && <span className="shrink-0 cursor-help inline-flex items-center" onMouseEnter={e => showTip(e, <><div className="pop-name" style={{color:'#ff6b6b'}}>Win Condition</div><div className="pop-sub">Triggers game completion</div></>)} onMouseLeave={hideTip}><Crown size={11} className="text-[#ff6b6b]" /></span>}
                    {ach.type === 'missable' && <span className="shrink-0 cursor-help inline-flex items-center" onMouseEnter={e => showTip(e, <><div className="pop-name" style={{color:'#ff9800'}}>Missable</div><div className="pop-sub">Can be permanently missed</div></>)} onMouseLeave={hideTip}><AlertTriangle size={11} className="text-[#ff9800]" /></span>}
                  </div>

                  <p className="text-[10px] text-[#8f98a0] leading-snug mb-1.5">{ach.description}</p>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <div className="relative h-1.5 bg-[#101214] rounded-full overflow-hidden w-full max-w-[180px]">
                        {casualPct !== null && <div className="absolute top-0 left-0 h-full bg-[#546270]" style={{ width: `${casualPct}%` }} />}
                        {hardcorePct !== null && <div className="absolute top-0 left-0 h-full bg-[#ff6b6b]" style={{ width: `${hardcorePct}%` }} />}
                      </div>
                      <div className="flex justify-between text-[8px] font-medium w-full max-w-[180px]">
                        {hardcorePct !== null && <span className="flex items-center gap-0.5 text-[#ff6b6b]"><Flame size={8} />{hardcorePct}%</span>}
                        {casualPct !== null && <span className="flex items-center gap-0.5 text-[#546270]"><Feather size={8} />{casualPct}%</span>}
                      </div>
                    </div>
                    {ach.isUnlocked && (
                      <p className="text-[9px] text-[#66c0f4] shrink-0">Unlocked: {fmtDate(ach.unlockDate)}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="text-center py-8 text-[#546270] text-[11px]">No achievements match the current filters.</div>
          )}
        </div>
        </>}
      </div>

      {/* Fixed-position tooltip — escapes scroll container, always above hovered element */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-[9999] bg-[#131a22] border border-[#2a475e] rounded-[2px] px-2 py-1.5 shadow-lg anim-fade"
          style={{ left: tooltip.rect.left + tooltip.rect.width / 2, top: tooltip.rect.top - 7, transform: 'translate(-50%, -100%)' }}
        >
          {tooltip.content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0" style={{ borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid #2a475e' }} />
        </div>
      )}
    </div>
  );
};

// ── ActivityTab Component ──────────────────────────────────────────────────

// How much of the year the timeline holds: a bar of 3-month steps, filled as you scroll
const LoadMeter = ({ done, total }) => (
  <div className="flex flex-col items-center gap-1.5 py-3">
    <div className="flex gap-[3px]">
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className="block w-7 h-[5px] rounded-[2px]" style={{ background: i < done ? '#66c0f4' : '#22344a' }} />
      ))}
    </div>
    <span className="text-[10.5px] text-[#8f98a0]"><b className="text-[#c6d4df] font-semibold">{done * 3}</b> of 12 months · more as you scroll</span>
  </div>
);

const ActivityTab = ({ achievements, refTime, heatmapData, artData, loadedChunks, totalChunks, hasMore, loadingMore, onLoadMore }) => {
  const [selectedDay, setSelectedDay] = useState(null);
  const [summaryOpen, toggleSummary] = useSummaryOpen();

  const sentinelRef = useRef(null);
  const heatmapScrollRef = useRef(null);
  const heatmapKeys = Object.keys(heatmapData).length;
  useEffect(() => {
    if (!heatmapScrollRef.current || heatmapKeys === 0) return;
    requestAnimationFrame(() => { heatmapScrollRef.current.scrollLeft = heatmapScrollRef.current.scrollWidth; });
  }, [heatmapKeys, summaryOpen]);
  const onLoadMoreRef = useRef(onLoadMore);
  useEffect(() => { onLoadMoreRef.current = onLoadMore; }, [onLoadMore]);
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) onLoadMoreRef.current(); },
      { rootMargin: '300px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadedChunks]);

  // Build day map: { 'YYYY-MM-DD': { count, points, achievements[] } }
  const dayMap = useMemo(() => {
    const map = {};
    achievements.forEach(ach => {
      const day = dayKey(ach.date);
      if (!map[day]) map[day] = { count: 0, points: 0, achievements: [] };
      map[day].count++;
      map[day].points += ach.points || 0;
      map[day].achievements.push(ach);
    });
    return map;
  }, [achievements]);

  // Reveal more chunks when a clicked heatmap day isn't in the shown timeline yet.
  // Declared after dayMap so its dependency list sees the real value and re-runs
  // after each reveal until the day appears.
  useEffect(() => {
    if (!selectedDay || !heatmapData[selectedDay] || dayMap[selectedDay] || !hasMore || loadingMore) return;
    onLoadMoreRef.current();
  }, [selectedDay, dayMap, hasMore, loadingMore]);

  const maxPoints = useMemo(() => Math.max(1, ...Object.values(heatmapData).map(d => d.points || 0)), [heatmapData]);

  // Build 365-day grid ending on ref date
  // 365 local days ending on the ref date
  const days = useMemo(() => {
    const end = dayKey(refTime || new Date());
    const arr = [];
    for (let i = 364; i >= 0; i--) {
      const key = addDays(end, -i);
      arr.push({ key, date: keyToDate(key) });
    }
    return arr;
  }, [refTime]);

  // Week columns for grid layout
  const weeks = useMemo(() => {
    const ws = [];
    for (let i = 0; i < days.length; i += 7) ws.push(days.slice(i, i + 7));
    return ws;
  }, [days]);

  // Month labels
  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const m = week[0].date.getMonth();
      if (m !== lastMonth) { labels.push({ wi, label: week[0].date.toLocaleDateString('en-GB', { month: 'short' }) }); lastMonth = m; }
    });
    return labels;
  }, [weeks]);

  const getColor = (key) => {
    const d = heatmapData[key];
    if (!d) return '#101214';
    const ratio = (d.points || 0) / maxPoints;
    if (ratio >= 0.8) return '#e5b143';
    if (ratio >= 0.5) return '#66c0f4';
    if (ratio >= 0.25) return '#2a6b9e';
    if (ratio > 0) return '#1a4a70';
    return '#101214';
  };

  // Timeline — filtered by selectedDay or show all grouped by date+game session
  const timelineGroups = useMemo(() => {
    const source = selectedDay
      ? (dayMap[selectedDay]?.achievements || [])
      : achievements;

    // Group by day
    const byDay = {};
    source.forEach(ach => {
      const day = dayKey(ach.date);
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(ach);
    });

    // Within each day, group by game session (consecutive same game)
    return Object.entries(byDay)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([day, achs]) => {
        const sorted = [...achs].sort((a, b) => a.date.localeCompare(b.date));
        const sessions = [];
        sorted.forEach(ach => {
          const last = sessions[sessions.length - 1];
          if (last && last.gameId === ach.gameId) {
            last.achievements.push(ach);
            if (ach.date > last.endTime) last.endTime = ach.date;
          } else {
            sessions.push({ gameId: ach.gameId, gameTitle: ach.gameTitle, gameIcon: getMediaUrl(ach.gameIcon), consoleName: ach.consoleName, startTime: ach.date, endTime: ach.date, achievements: [ach] });
          }
        });
        sessions.reverse(); // newest session first within a day
        const dayPts = achs.reduce((s, a) => s + (a.points || 0), 0);
        return { day, dayPts, achCount: achs.length, sessions };
      });
  }, [achievements, selectedDay, dayMap]);

  const fmtTime = fmtClock;
  const fmtDay  = (str) => new Date(str + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // Summary numbers: the last 14 days (folded row) and the past year (open card)
  const streak = useMemo(() => computeStreak(heatmapData, 1), [heatmapData]);
  const year = useMemo(() => yearOf(heatmapData), [heatmapData]);
  const yearPts = useMemo(() => yearOf(heatmapData, 'points').total, [heatmapData]);
  const recent = useMemo(() => {
    const from = addDays(dayKey(new Date()), -13);
    const recentAchs = achievements.filter(a => dayKey(a.date) >= from);
    return { n: recentAchs.length, games: new Set(recentAchs.map(a => a.gameId)).size };
  }, [achievements]);
  const describe = key => heatmapData[key] ? `${key} · ${heatmapData[key].count} achievement${heatmapData[key].count !== 1 ? 's' : ''} · ${heatmapData[key].points} pts` : key;
  const pickDay = day => setSelectedDay(day);

  const heatmap = (
            <div className="overflow-x-auto" ref={heatmapScrollRef}>
              <div style={{ minWidth: `${53 * 14}px` }}>
                {/* Month labels */}
                <div className="flex mb-1" style={{ paddingLeft: '28px' }}>
                  {weeks.map((_week, wi) => {
                    const ml = monthLabels.find(m => m.wi === wi);
                    return <div key={wi} style={{ flex: 1, fontSize: '8px', color: '#546270', whiteSpace: 'nowrap', overflow: 'hidden' }}>{ml ? ml.label : ''}</div>;
                  })}
                </div>

                <div className="flex gap-0">
                  {/* Day labels */}
                  <div className="flex flex-col gap-[2px] mr-1" style={{ paddingTop: '1px' }}>
                    {['M','','W','','F','','S'].map((l, i) => (
                      <div key={i} style={{ height: '12px', width: '20px', fontSize: '7px', lineHeight: '12px', textAlign: 'right', color: '#546270', flexShrink: 0 }}>{l}</div>
                    ))}
                  </div>

                  {/* Grid — flex so columns stretch to fill width */}
                  <div className="flex flex-1 gap-[2px]">
                    {weeks.map((week, wi) => (
                      <div key={wi} className="flex flex-col gap-[2px] flex-1" style={{ minWidth: '10px' }}>
                        {week.map(({ key }) => (
                          <div
                            key={key}
                            onClick={() => setSelectedDay(selectedDay === key ? null : key)}
                            title={`${key}${heatmapData[key] ? ` · ${heatmapData[key].count} achievements · ${heatmapData[key].points} pts` : ''}`}
                            style={{ height: '12px', borderRadius: '1px', background: getColor(key), cursor: heatmapData[key] ? 'pointer' : 'default', outline: selectedDay === key ? '2px solid #66c0f4' : 'none' }}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-end gap-1 mt-2" style={{ paddingLeft: '28px' }}>
                  <span className="text-[8px] text-[#546270]">Less</span>
                  {['#101214','#1a4a70','#2a6b9e','#66c0f4','#e5b143'].map(c => (
                    <div key={c} style={{ width: '10px', height: '10px', borderRadius: '1px', background: c, flexShrink: 0 }} />
                  ))}
                  <span className="text-[8px] text-[#546270]">More</span>
                  <span className="text-[8px] text-[#e5b143] ml-2">● peak</span>
                </div>
              </div>
            </div>
  );

  return (
    <div className="flex flex-col gap-4 anim-fade tl-tabs">
      <ActivitySummary
        open={summaryOpen} onToggle={toggleSummary}
        fold={[
          { v: recent.n, l: recent.n === 1 ? 'Unlock' : 'Unlocks', color: '#66c0f4' },
          { v: recent.games, l: recent.games === 1 ? 'Game' : 'Games' },
          { v: year.total.toLocaleString(), l: 'Past year' },
        ]}
        stats={[
          { v: year.total.toLocaleString(), l: 'Unlocks', color: '#66c0f4' },
          { v: yearPts.toLocaleString(), l: 'Points', color: '#e5b143' },
          { v: year.best ? year.best.count : '–', l: 'Best day', sub: year.best ? fmtDay(year.best.key) : null },
        ]}
        streak={streak} heatmapData={heatmapData}
        cellLabel={key => heatmapData[key]?.count ?? ''} describe={describe}
        selectedDay={selectedDay} onSelectDay={pickDay}
        heatmap={heatmap} />

      {/* ── Timeline ── */}
      <div>
        <div className="flex items-center gap-2 border-b border-[#2a475e] pb-1.5 mt-2 mb-1">
          <span className="w-[3px] h-[14px] bg-[#e5b143] rounded-[1px] shrink-0"></span>
          <span className="text-[13px] text-white tracking-wide uppercase font-medium">Recent Unlocks</span>
          {selectedDay && (
            <button onClick={() => setSelectedDay(null)} className="ml-auto fchip on anim-fade" style={{ height: 22 }}>{fmtDay(selectedDay)} ✕</button>
          )}
        </div>

        {selectedDay && heatmapData[selectedDay] && !dayMap[selectedDay] ? (
          <div className="flex flex-col gap-2 py-2">
            {[...Array(2)].map((_, i) => <div key={i} className="shimmer h-[86px] rounded-[3px]" />)}
          </div>
        ) : timelineGroups.length === 0 ? (
          <div key={selectedDay ?? 'all'} className="text-[#8f98a0] text-[11px] py-4 italic text-center anim-fade">
            {selectedDay ? 'No achievements on this day.' : 'No achievements unlocked in the last year.'}
          </div>
        ) : (
          <div key={selectedDay ?? 'all'} className="flex flex-col gap-4">
            {timelineGroups.map(({ day, dayPts, achCount, sessions }) => (
              <section key={day} className="anim-fade">
                <DayHead day={day}>
                  <b>{achCount}</b> unlock{achCount !== 1 ? 's' : ''} · <b className="text-[#c8a84b]">+{dayPts}</b> pts
                </DayHead>
                <div className="flex flex-col gap-2">
                  {sessions.map(session => {
                    const p = parseTitle(session.gameTitle);
                    const wide = artData?.[session.gameId];
                    const t0 = fmtTime(session.startTime), t1 = fmtTime(session.endTime);
                    return (
                      <RunCard key={`${session.gameId}-${session.startTime}`}
                        accent="#e5b143" href={`${SITE_URL}/game/${session.gameId}`} icon={session.gameIcon}
                        art={[wide?.hero?.thumb, wide?.grid?.thumb]}
                        title={<><span className="truncate">{p.baseTitle}</span>{p.isSubset && <span className="subset-tag">Subset</span>}{!p.isSubset && renderTildeTags(p.tags)}</>}
                        subset={p.isSubset ? p.subsetName : null}
                        sub={<>
                          {session.consoleName && <span className="shrink">{session.consoleName}</span>}
                          <span>{t0 === t1 ? t0 : `${t0}–${t1}`}</span>
                          <RunCount n={session.achievements.length} />
                        </>}
                        rows={[...session.achievements].sort((a, b) => b.date.localeCompare(a.date)).map(ach => {
                          const ratio = ach.trueRatio && ach.points ? ach.trueRatio / ach.points : null;
                          const typeIcon = ach.type === 'progression' ? <Trophy size={11} className="text-[#e5b143] shrink-0"><title>Progression: required to complete the game</title></Trophy>
                            : ach.type === 'win_condition' ? <Crown size={11} className="text-[#ff6b6b] shrink-0"><title>Win condition: triggers game completion</title></Crown>
                            : ach.type === 'missable' ? <AlertTriangle size={11} className="text-[#ff9800] shrink-0"><title>Missable</title></AlertTriangle> : null;
                          return (
                            <UnlockRow key={`${ach.achievementId}-${ach.date}`}
                              href={`${SITE_URL}/achievement/${ach.achievementId}`}
                              icon={`${MEDIA_URL}/Badge/${ach.badgeName}.png`}
                              title={ach.title} titleStyle={{ color: ach.hardcoreMode ? '#e5b143' : '#c6d4df' }}
                              marks={typeIcon}
                              desc={ach.description}
                              time={fmtTime(ach.date)}
                              value={<em>
                                <span className="text-[#8fb8d4]">{ach.points} pts</span>
                                {ratio > 0 && <span style={{ color: ratio >= 30 ? '#ff6b6b' : ratio >= 20 ? '#e5b143' : ratio >= 10 ? '#66c0f4' : '#8f98a0' }}> ×{ratio.toFixed(1)}</span>}
                              </em>} />
                          );
                        })} />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* ── Load-more sentinel ── */}
        {!selectedDay && (
          hasMore ? (
            <div ref={sentinelRef} className="flex flex-col gap-2 mt-4">
              {loadingMore
                ? [...Array(2)].map((_, i) => <div key={i} className="shimmer h-[86px] rounded-[3px]" />)
                : <LoadMeter done={loadedChunks} total={totalChunks} />}
            </div>
          ) : achievements.length > 0 ? (
            <div className="flex justify-center py-3 mt-2 border-t border-[#1e2a35] anim-fade">
              <span className="crit"><Trophy /><b>{achievements.length.toLocaleString()}</b> unlocks · the whole year</span>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
};

// ── Skeleton Components ───────────────────────────────────────────────────

const Sk = ({ w = 'w-full', h = 'h-4', cls = '' }) => (
  <div className={`shimmer ${w} ${h} ${cls}`} />
);

const ProfileLoadingSkeleton = () => (
  <div className="min-h-screen bg-[#171a21] flex flex-col">
    {/* Topbar */}
    <div className="bg-[#131a22] border-b border-[#101214] px-4 md:px-8 py-1.5 flex items-center gap-2">
      <Sk w="w-16" h="h-2.5" /><span className="text-[#2a475e]">›</span><Sk w="w-28" h="h-2.5" /><span className="text-[#2a475e]">›</span><Sk w="w-20" h="h-2.5" />
    </div>
    {/* Header */}
    <div className="bg-[#1b2838] border-b border-[#2a475e] px-4 md:px-8 pt-8 pb-5 md:pt-5">
      <div className="max-w-5xl mx-auto flex items-center gap-5">
        <div className="shimmer w-20 h-20 md:w-24 md:h-24 rounded-[2px] flex-shrink-0" />
        <div className="flex flex-col gap-2.5 flex-1">
          <Sk w="w-44" h="h-6" />
          <Sk w="w-64" h="h-3" />
          <div className="flex gap-2 mt-1">
            <Sk w="w-20" h="h-5" /><Sk w="w-28" h="h-5" /><Sk w="w-24" h="h-5" />
          </div>
        </div>
      </div>
    </div>
    {/* Main */}
    <main className="max-w-5xl lg:max-w-[79rem] mx-auto px-4 md:px-8 py-6 w-full flex-1">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 mb-8">
        <div className="flex flex-col gap-6">
          {/* Recently played */}
          <div><Sk w="w-40" h="h-3" cls="mb-3" />
            <div className="bg-[#1b2838] border border-[#2a475e] rounded-[3px] p-3 flex gap-4">
              <div className="shimmer w-14 h-14 rounded-[2px] flex-shrink-0" />
              <div className="flex-1 flex flex-col gap-2 justify-center">
                <Sk w="w-48" h="h-3.5" /><Sk w="w-32" h="h-2.5" />
              </div>
            </div>
          </div>
          {/* Most recent achievement */}
          <div><Sk w="w-48" h="h-3" cls="mb-3" />
            <div className="bg-[#1b2838] border border-[#2a475e] rounded-[3px] p-3 flex gap-3">
              <div className="shimmer w-12 h-12 rounded-[2px] flex-shrink-0" />
              <div className="flex-1 flex flex-col gap-2 justify-center">
                <Sk w="w-56" h="h-3.5" /><Sk w="w-36" h="h-2.5" /><Sk w="w-44" h="h-2.5" />
              </div>
            </div>
          </div>
          {/* Stats */}
          <div><Sk w="w-24" h="h-3" cls="mb-3" />
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 px-1">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-end py-[3px] gap-2">
                  <Sk w="w-28" h="h-2.5" /><div className="flex-1 border-b border-dotted border-[#2a475e] mb-1" /><Sk w="w-16" h="h-2.5" />
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Sidebar */}
        <div className="flex flex-col gap-5">
          <div className="bg-[#1b2838] border border-[#2a475e] rounded-[3px] p-3 flex flex-col gap-3">
            <Sk w="w-32" h="h-3" />
            <div className="grid grid-cols-4 gap-2">
              {[...Array(4)].map((_, i) => <div key={i} className="shimmer aspect-square rounded-[2px]" />)}
            </div>
          </div>
          <div className="bg-[#1b2838] border border-[#2a475e] rounded-[3px] p-3 flex flex-col gap-3">
            <Sk w="w-28" h="h-3" />
            <div className="grid grid-cols-3 gap-2">
              {[...Array(3)].map((_, i) => <div key={i} className="shimmer aspect-square rounded-[2px]" />)}
            </div>
          </div>
        </div>
      </div>
      {/* Tab bar skeleton */}
      <div className="flex gap-6 border-b border-[#2a475e] mb-4 pb-2">
        {[...Array(4)].map((_, i) => <Sk key={i} w="w-24" h="h-3.5" />)}
      </div>
      {/* Game card skeletons */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="shimmer h-[90px] rounded-[3px] mb-3" />
      ))}
    </main>
  </div>
);

const GameCardSkeleton = () => (
  <div className="bg-[#202d39] border border-[#323f4c] border-l-[3px] border-l-[#323f4c] rounded-[3px] p-3 flex gap-4">
    <div className="shimmer w-16 h-16 md:w-20 md:h-20 rounded-[2px] flex-shrink-0" />
    <div className="flex-1 flex flex-col gap-2 justify-center">
      <Sk w="w-3/4" h="h-3.5" /><Sk w="w-1/2" h="h-2.5" />
      <div className="flex gap-2 mt-1"><Sk w="w-20" h="h-2" /><Sk w="w-16" h="h-2" /></div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// SeriesProgressTab
// ─────────────────────────────────────────────────────────────────────────────

// ── Series ─────────────────────────────────────────────────────────────────────
// Per series: its games (played ones are ALL_GAMES entries, so they open the achievement sheet),
// counts, points and achievements, the latest unlock and the cover art. Styles in assets/ui.css.
// Sub-series (admin, `groups`): each gets the same card from its own games, plus "Other" for games in none
const buildSeries = (seriesData, gamesData, watchlistData, allGames, beatenIds = new Set()) => {
  const cards = buildSeriesCards(seriesData.filter(s => s.showProgress), gamesData, watchlistData, allGames, beatenIds);
  return cards.map(card => {
    const groups = card.series.groups ?? [];
    if (!groups.length) return card;
    const inGroup = new Set(groups.flatMap(g => g.gameIds));
    const rest = card.series.gameIds.filter(id => !inGroup.has(id));
    const defs = [...groups, ...(rest.length ? [{ id: '_other', name: 'Other', gameIds: rest }] : [])]
      .map(g => ({ ...g, gameIds: g.gameIds.filter(id => card.series.gameIds.includes(id)) })).filter(g => g.gameIds.length);
    const subCards = buildSeriesCards(defs.map(g => ({ id: `${card.series.id}/${g.id}`, name: g.name, gameIds: g.gameIds })), gamesData, watchlistData, allGames, beatenIds);
    return { ...card, subs: subCards.map((sc, i) => ({ ...sc, key: defs[i].id, groupId: defs[i].id, name: defs[i].name,
      icon: sc.coverIcon, px: true, done: sc.mastered, beaten: sc.beatenCount, doneLabel: 'mastered' })) };
  });
};
const buildSeriesCards = (seriesList, gamesData, watchlistData, allGames, beatenIds) => {
  const gameProgress = gamesData?.detailedGameProgress ?? {};
  const wlMap = Object.fromEntries((watchlistData?.results ?? []).map(g => [g.id, g]));
  const byId = new Map(allGames.map(g => [g.id, g]));
  return seriesList.map(series => {
    let tracked = 0, started = 0, beatenCount = 0, mastered = 0, pointsEarned = 0, pointsTotal = 0, achEarned = 0, achTotal = 0;
    let latestAch = null;
    const games = series.gameIds.map(id => {
      const d = gameProgress[id], wl = wlMap[id], g = byId.get(id) ?? null;
      const numAchs = d?.numAchievements ?? wl?.achievementsPublished ?? 0;
      const awarded = d?.numAwardedToUser ?? 0;
      if (numAchs > 0) tracked++;
      // Totals and the latest unlock from the index summary (games/index.json); the old single
      // games.json had the full lists instead
      const sum = d?.summary ?? (d?.achievements ? (() => {
        const achs = Object.values(d.achievements), won = achs.filter(a => a.dateEarned);
        const last = won.reduce((b, a) => !b || toMs(a.dateEarned) > toMs(b.dateEarned) ? a : b, null);
        return { count: achs.length, earned: won.length, points: achs.reduce((n, a) => n + (a.points ?? 0), 0), pointsEarned: won.reduce((n, a) => n + (a.points ?? 0), 0),
          lastUnlock: last && { id: last.id, title: last.title, badgeName: last.badgeName, date: last.dateEarned } };
      })() : null);
      if (sum) {
        pointsTotal += sum.points; achTotal += sum.count; pointsEarned += sum.pointsEarned; achEarned += sum.earned;
        const L = sum.lastUnlock;
        if (L && (!latestAch || toMs(L.date) > toMs(latestAch.date))) latestAch = { title: L.title, badgeName: L.badgeName, achId: L.id, gameTitle: d.title, gameId: id, date: L.date };
      } else if (wl) { pointsTotal += wl.pointsTotal ?? 0; achTotal += wl.achievementsPublished ?? 0; }
      const isMastered = numAchs > 0 && awarded === numAchs;
      const isStarted  = awarded > 0 && !isMastered;
      const beaten     = isStarted && beatenIds.has(id);
      if (isMastered) mastered++; else if (beaten) beatenCount++; else if (isStarted) started++;
      // Last activity: the latest unlock, or the last time it was played (recently played games)
      const lastUnlock = sum?.lastUnlock ? toMs(sum.lastUnlock.date) : 0;
      const lastMs = Math.max(lastUnlock, g ? raDateMs(g.lastPlayedStr) : 0);
      const info = d ?? wl ?? null;
      return {
        id, g, hasAch: numAchs > 0, numAchs, awarded, isMastered, isStarted, beaten, lastMs, inWatchlist: !!wl,
        title: info?.title ?? String(id), icon: info?.imageIcon ? getMediaUrl(info.imageIcon) : null,
        console: info?.consoleName ?? g?.console ?? '', points: wl?.pointsTotal ?? 0,
      };
    });
    // Cover: your ★ pick (admin), else the game with the most achievements you've unlocked, else the first
    // game that has achievements (nothing played yet), else the first game
    const mostUnlocked = games.filter(x => x.awarded > 0).sort((a, b) => b.awarded - a.awarded)[0];
    const coverId = series.coverGameId ?? mostUnlocked?.id ?? games.find(x => x.hasAch)?.id ?? series.gameIds[0];
    const cover = gameProgress[coverId] ?? wlMap[coverId] ?? null;
    // Background art: the cover's screenshot, else the most recently active series game that has one
    // (want-to-play entries only carry an icon), else the cover icon blurred
    const shotOf = id => { const d = gameProgress[id]; return d ? raShot(d.imageIngame, d.imageTitle) : null; };
    const shot = shotOf(coverId) ?? [...games].sort((a, b) => b.lastMs - a.lastMs).map(x => shotOf(x.id)).find(Boolean) ?? null;
    // Wide art (data/ra/art.json) wins over the screenshot, in the same order: the cover, else the most
    // recently active series game that has it. { art: hero thumb (card), header: full hero (sheet) }
    const wideOf = id => byId.get(id)?.wide ?? null;
    const wide = wideOf(coverId) ?? [...games].sort((a, b) => b.lastMs - a.lastMs).map(x => wideOf(x.id)).find(Boolean) ?? null;
    const lastMs = Math.max(0, ...games.map(x => x.lastMs));
    return {
      series, games, total: games.length, tracked, started, beatenCount, mastered, pointsEarned, pointsTotal, achEarned, achTotal, latestAch, lastMs,
      pct: achTotal > 0 ? (achEarned / achTotal) * 100 : 0,
      coverIcon: cover?.imageIcon ? getMediaUrl(cover.imageIcon) : null,
      coverArt: shot ? getMediaUrl(shot) : cover?.imageIcon ? getMediaUrl(cover.imageIcon) : null, coverArtIsIcon: !shot,
      coverWide: wide,
    };
  });
};

const seriesEdge = c => c.tracked > 0 && c.mastered === c.tracked ? '#e5b143' : c.started || c.beatenCount || c.mastered ? '#66c0f4' : '#323f4c';
const pctLabel = p => p > 0 && p < 1 ? '<1%' : `${Math.floor(p)}%`;
// Icons in the card strip: mastered and started first (latest first), then the rest by title
const seriesIconOrder = games => [...games].sort((a, b) => {
  const k = x => x.isMastered ? 0 : x.isStarted ? 1 : x.hasAch ? 2 : 3;
  return (k(a) - k(b)) || (k(a) <= 1 ? b.lastMs - a.lastMs : a.title.localeCompare(b.title));
});

const SERIES_SORTS = [
  { value: 'name', label: 'Name' },
  { value: 'progress', label: 'Most progress' },
  { value: 'recent', label: 'Last played' },
  { value: 'games', label: 'Most games' },
];

function SeriesProgressTab({ seriesData, gamesData, watchlistData, allGames, beatenIds, onOpen }) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');
  const [filter, setFilter] = useState('all');
  const cards = useMemo(() => buildSeries(seriesData, gamesData, watchlistData, allGames, beatenIds), [seriesData, gamesData, watchlistData, allGames, beatenIds]);

  if (cards.length === 0) {
    return (
      <div className="text-center py-12 text-[#546270] text-[12px] anim-fade">
        No series flagged for progress tracking yet.<br />
        <span className="text-[11px]">Enable <strong className="text-[#8f98a0]">Progress</strong> on a series in the admin panel.</span>
      </div>
    );
  }

  const isStarted = c => c.achEarned > 0;
  const counts = { all: cards.length, started: cards.filter(isStarted).length, notstarted: cards.filter(c => !isStarted(c)).length };
  const nameKey = n => /^[a-zA-Z]/.test(n) ? '2' + n.toLowerCase() : /^\d/.test(n) ? '1' + n.toLowerCase() : '0' + n.toLowerCase();
  const shown = cards
    .filter(c => filter === 'all' || (filter === 'started' ? isStarted(c) : !isStarted(c)))
    .filter(c => !search || fold(c.series.name).includes(fold(search)) || subsMatch(c.subs, fold(search), fold) || c.games.some(x => fold(x.title).includes(fold(search))))
    .sort((a, b) => sort === 'progress' ? (b.pct - a.pct) || nameKey(a.series.name).localeCompare(nameKey(b.series.name))
      : sort === 'recent' ? (b.lastMs - a.lastMs) || nameKey(a.series.name).localeCompare(nameKey(b.series.name))
      : sort === 'games' ? (b.total - a.total) || nameKey(a.series.name).localeCompare(nameKey(b.series.name))
      : nameKey(a.series.name).localeCompare(nameKey(b.series.name)));

  return (
    <div className="flex flex-col gap-3 anim-fade">
      <div className="flex flex-col gap-2.5">
        <div className="fbar">
          <div className="fsearch">
            <Search size={14} />
            <input type="text" inputMode="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search series or games" aria-label="Search series" />
            {search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={13} /></button>}
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)} className="fselect" aria-label="Sort">
            {SERIES_SORTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="frow" role="group" aria-label="Show">
          {[['all', 'All'], ['started', 'Started'], ['notstarted', 'Not started']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} aria-pressed={filter === v} className={`fchip ${filter === v ? 'on' : ''}`}>{l}<span className="n">{counts[v]}</span></button>
          ))}
        </div>
      </div>

      <div key={`${sort}-${filter}`} className="slist anim-fade">
        {shown.length === 0 && <div className="text-center py-10 text-[#546270] text-[12px]" style={{ gridColumn: '1 / -1' }}>No series match.</div>}
        {shown.map(c => {
          const icons = seriesIconOrder(c.games);
          const card = (
            <button key={c.series.id} onClick={() => onOpen(c)} className="scard" style={{ borderLeftColor: seriesEdge(c) }}>
              {c.coverWide
                ? <div className="scard-art"><img src={c.coverWide.art} alt="" loading="lazy" style={{ imageRendering: 'auto' }} onError={e => { e.target.style.display = 'none'; }} /></div>
                : c.coverArt && <div className="scard-art"><img src={c.coverArt} alt="" loading="lazy" className={c.coverArtIsIcon ? 'art-icon' : ''} /></div>}
              <div className="scard-top">
                {c.coverIcon ? <img src={c.coverIcon} alt="" loading="lazy" className="scard-cover" /> : <span className="scard-cover" />}
                <div className="scard-main">
                  <span className="scard-name">{c.series.name}</span>
                  <span className="scard-sub">
                    <span>{c.total} games</span>
                    {statusPills({ done: c.mastered, doneLabel: 'mastered', beaten: c.beatenCount, started: c.started })}
                  </span>
                </div>
                <span className="scard-end">
                  <span className="scard-pct" style={{ color: c.pct > 0 ? '#e5b143' : '#546270' }}>{pctLabel(c.pct)}</span>
                  {c.lastMs > 0 && <em title="Last activity in this series">{shortAgo(c.lastMs)}</em>}
                </span>
              </div>
              <div className="gbar"><i style={{ width: `${c.pct}%`, background: '#e5b143' }} /></div>
              <div className="sicons">
                {icons.slice(0, 10).map(x => x.icon && <img key={x.id} src={x.icon} alt="" title={x.title} loading="lazy" className={x.isMastered ? 'mastered' : x.awarded > 0 ? '' : x.hasAch ? 'dim' : 'noach'} />)}
                {icons.length > 10 && <span>+{icons.length - 10}</span>}
              </div>
            </button>
          );
          return c.subs ? <SubFold key={c.series.id} subs={c.subs} onOpen={i => onOpen({ ...c, __sub: i })}>{card}</SubFold> : card;
        })}
      </div>
    </div>
  );
}

// Series sheet: the cover art blurred behind the header, the series' numbers, the latest unlock,
// then its games grouped by state. A played game opens its achievement sheet (with a way back).
// A mastered game in the series sheet: its row, then a band with the mastery date and the
// rarest achievement (from the award, like the Completions highlight)
const MasteredRow = ({ x, award, onOpenGame }) => {
  const rare = award?.rarest;
  const color = award?.hardcore ? '#ff6b6b' : '#8f98a0';
  return (
    <div className="smast">
      <GameListRow game={x.g} onViewDetails={onOpenGame} compact />
      {award && (
        <div className="smast-band">
          <div className="c"><b className="text-[#e5b143]"><Star size={10} fill="currentColor" className="inline -mt-0.5 mr-1" />{fmtDate(award.awardedAt)}</b><span>Mastered</span></div>
          {rare && (
            <div className="c rare" title={`Rarest achievement: ${rare.name} · ${rare.pct}%`}>
              {rare.badge && <img src={`${MEDIA_URL}/Badge/${rare.badge}.png`} alt="" loading="lazy" className="px" />}
              <div><b style={{ color }}>{award.hardcore ? <Flame size={10} className="inline -mt-0.5 mr-0.5" /> : <Feather size={10} className="inline -mt-0.5 mr-0.5" />}{rare.pct}%</b><span>{rare.name}</span></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// card.__sub: the sub-series picked (index into card.subs) or null for All; kept on the page's card, so a game
// opened from a sub-series comes back to it
const SeriesSheet = ({ card: series, awards, onOpenGame, onClose, onScope }) => {
  const sub = series.subs && series.__sub != null ? series.__sub : null;
  const c = sub != null ? series.subs[sub] : series;
  const panelRef = useRef(null), rootRef = useRef(null), dragRef = useRef(null);
  useAnimatedHeight(panelRef);
  const close = useSheet({ panelRef, dragRef, rootRef, onClose });
  const art = useArtSrc([c.coverWide?.header, c.coverArt]);
  const artIsWide = !!c.coverWide && art.src === c.coverWide.header;
  const groups = [
    { key: 'started',  label: 'In progress',     games: c.games.filter(x => x.isStarted && !x.beaten).sort((a, b) => b.lastMs - a.lastMs) },
    { key: 'mastered', label: 'Mastered',        games: c.games.filter(x => x.isMastered).sort((a, b) => b.lastMs - a.lastMs) },
    { key: 'beaten',   label: 'Beaten',          games: c.games.filter(x => x.beaten).sort((a, b) => b.lastMs - a.lastMs) },
    { key: 'none',     label: 'Not started',     games: c.games.filter(x => x.hasAch && !x.awarded).sort((a, b) => a.title.localeCompare(b.title)) },
    { key: 'noach',    label: 'No achievements', games: c.games.filter(x => !x.hasAch).sort((a, b) => a.title.localeCompare(b.title)) },
  ].filter(gr => gr.games.length);
  return (
    <div ref={rootRef} className="sheet-root" onClick={close}>
      <div className="sheet-backdrop anim-backdrop" />
      <div ref={panelRef} className="sheet-panel" onClick={e => e.stopPropagation()}>
        <button onClick={close} className="sheet-close" aria-label="Close"><X size={15} /></button>
        <SheetHead dragRef={dragRef}
          art={art.src && <div className="art-bg art-sheet"><img src={art.src} alt="" ref={art.ref} onLoad={art.onLoad} onError={art.onError} className={`${artIsWide ? '' : `px ${c.coverArtIsIcon ? 'art-icon' : ''}`} ${art.loaded ? 'loaded' : ''}`} /></div>}
          cover={c.coverIcon && <img src={c.coverIcon} alt="" className="relative shrink-0 w-16 h-16 rounded-[3px] border-2 border-white/20 bg-[#101214] shadow-[0_6px_18px_rgba(0,0,0,0.55)] object-cover px" />}
          title={c.series.name}
          meta={[sub != null && <button onClick={() => onScope(null)} className="inline-flex items-center gap-0.5 text-[#8f98a0] hover:text-[#c6d4df]"><ChevronLeft size={11} />{series.series.name}</button>, <span className="inline-flex items-center gap-1 text-[#66c0f4]"><Layers size={11} />{c.total} games</span>].filter(Boolean)}
          tags={seriesTags({ done: c.mastered, doneLabel: 'Mastered', beaten: c.beatenCount, started: c.started })}
          stats={[
            { value: c.achEarned.toLocaleString(), total: c.achTotal.toLocaleString(), label: 'Achievements', color: '#66c0f4' },
            { value: c.pointsEarned.toLocaleString(), total: c.pointsTotal.toLocaleString(), label: 'Points', color: '#e5b143' },
          ]}
          bar={c.achTotal > 0 ? { pct: c.pct, color: c.pct >= 100 ? '#e5b143' : '#66c0f4' } : null}
          games={{ icon: <Layers size={11} />, items: c.games.map(x => ({ state: !x.hasAch ? 'noach' : x.isMastered ? 'done' : x.beaten ? 'beaten' : x.isStarted ? 'started' : 'none', pct: x.numAchs ? (x.awarded / x.numAchs) * 100 : 0 })) }}
        />
        {series.subs && <SubChips subs={series.subs} total={series.total} allPct={series.pct} active={sub} onPick={onScope} />}
        <div key={sub ?? 'all'} className="sheet-scroll overflow-y-auto overscroll-contain flex-1 min-h-0 px-4 pt-3 flex flex-col gap-2 anim-fade">
          {series.subs && sub == null && <SubStrip subs={series.subs} onPick={onScope} />}
          {c.latestAch && <div className={`ssheet-sec ${series.subs && sub == null ? 'next' : ''}`} style={{ '--c': '#e5b143' }}>Latest unlock</div>}
          {c.latestAch && (
            <a href={`${SITE_URL}/achievement/${c.latestAch.achId}`} target="_blank" rel="noreferrer" className="grow compact" style={{ borderLeftColor: '#e5b143' }} title="Latest unlock in this series">
              <img src={`${MEDIA_URL}/Badge/${c.latestAch.badgeName}.png`} alt="" className="grow-icon px" />
              <div className="grow-main">
                <span className="grow-title" style={{ color: '#e5b143' }}><Trophy size={11} className="inline -mt-0.5 mr-1" />{c.latestAch.title}</span>
                <div className="grow-sub"><span className="text-[#66c0f4] shrink">{c.latestAch.gameTitle}</span><span>· {formatTimeAgo(c.latestAch.date)}</span></div>
              </div>
            </a>
          )}
          <div className={`ssheet-sec ${c.latestAch || (series.subs && sub == null) ? 'next' : ''}`} style={{ '--c': '#66c0f4' }}>Games<span className="n">{c.total}</span></div>
          {groups.map(gr => (
            <React.Fragment key={gr.key}>
              <div className="ssheet-group">{gr.label}<span className="n">{gr.games.length}</span></div>
              {gr.games.map(x => x.g && x.isMastered
                ? <MasteredRow key={x.id} x={x} award={awards.get(x.id)} onOpenGame={onOpenGame} />
                : x.g && x.hasAch
                ? <GameListRow key={x.id} game={x.g} onViewDetails={onOpenGame} compact />
                : (
                  <a key={x.id} href={`${SITE_URL}/game/${x.id}`} target="_blank" rel="noreferrer" className={`wrow ${x.hasAch ? '' : 'dim'}`} style={{ borderLeftColor: x.hasAch ? '#323f4c' : '#1e2a35' }}>
                    {x.icon ? <img src={x.icon} alt="" loading="lazy" className="wrow-icon" /> : <span className="wrow-icon" />}
                    <div className="wrow-main">
                      <div className="wrow-title"><span>{parseTitle(x.title).baseTitle || x.title}</span></div>
                      <div className="wrow-sub"><span className="text-[#66c0f4]">{x.console}</span>{x.inWatchlist && <><i>·</i><span className="flex items-center gap-1"><Star size={10} className="text-[#8f98a0]" />Watchlist</span></>}</div>
                    </div>
                    <div className="wrow-end">
                      {x.hasAch ? <span className="text-[11px] text-[#8f98a0] flex items-center gap-1 tabular-nums"><Trophy size={11} className="text-[#546270]" />{x.numAchs}</span>
                        : <span className="text-[11px] text-[#546270] text-right leading-tight">No achievements</span>}
                    </div>
                  </a>
                ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  // ── Split data state ─────────────────────────────────────
  const [profileData,   setProfileData]   = useState(null); // profile.json
  const [watchlistData, setWatchlistData] = useState(null); // watchlist.json
  const [gamesData,     setGamesData]     = useState(null); // games.json
  // All 4 achievement chunks load together when Activity opens: the heatmap needs every
  // unlock's timestamp to group them into the viewer's local days. The timeline still
  // reveals them one chunk at a time (shownChunks).
  const TOTAL_ACH_CHUNKS = 4;
  const [achievementChunks, setAchievementChunks] = useState(() => Array(TOTAL_ACH_CHUNKS).fill(null));
  const [shownChunks,       setShownChunks]       = useState(1);
  const [loadingChunkIdx,   setLoadingChunkIdx]   = useState(null);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingGames,   setLoadingGames]   = useState(false);
  const [error, setError] = useState(null);

  const VALID_TABS = ['overview', 'recent', 'progress', 'series', 'activity', 'backlog'];
  const initialTab = (() => {
    const p = new URLSearchParams(window.location.search).get('tab');
    return VALID_TABS.includes(p) ? p : 'overview';
  })();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [progressSort,   setProgressSort]   = useState('overall');
  const [progressSearch, setProgressSearch] = useState('');
  const [recentSearch,   setRecentSearch]   = useState('');
  const [progressView,   setProgressView]   = useState('all');
  const [gameView,       setGameView]       = useGameView();
  const [showMastered,   setShowMastered]   = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const tabBarRef = useRef(null);
  const tabContentRef = useRef(null);
  const [watchlistSearch, setWatchlistSearch] = useState('');
  const [watchlistStatusFilter, setWatchlistStatusFilter] = useState('all');
  const [watchlistGrouping, setWatchlistGrouping] = useState('none');
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedSeries, setSelectedSeries] = useState(null);   // series sheet
  const [seriesBack, setSeriesBack] = useState(null);           // series to return to from a game opened in it
  const [seriesData, setSeriesData] = useState([]);
  const [artData, setArtData] = useState({});             // data/ra/art.json games: wide art per game
  const [seriesLoaded, setSeriesLoaded] = useState(false);   // so "No series flagged" waits for series.json
  const [gamesFailed, setGamesFailed] = useState(false);

  const loadAllChunks = () => {
    setLoadingChunkIdx(0);
    Promise.all(Array.from({ length: TOTAL_ACH_CHUNKS }, (_, i) =>
      fetch(`../../data/ra/achievements/${i + 1}.json`)
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then(data => data.recentAchievements || [])
        .catch(() => [])
    )).then(chunks => {
      setAchievementChunks(chunks);
      setLoadingChunkIdx(null);
    });
  };

  const loadNextChunk = () => setShownChunks(n => Math.min(n + 1, TOTAL_ACH_CHUNKS));

  const setTab = (tab) => {
    setActiveTab(tab);
    const url = new URL(window.location);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url);
    scrollToTabs(tabBarRef);
  };

  const toggleGroup = (key) => setCollapsedGroups(prev => {
    const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next;
  });

  // ── Fetch profile.json + watchlist.json on mount ──
  useEffect(() => {
    fetch('../../data/ra/profile.json')
      .then(r => { if (!r.ok) throw new Error('Failed to load profile.json'); return r.json(); })
      .then(data => { setProfileData(data); setLoadingProfile(false); })
      .catch(err => { setError(err.message); setLoadingProfile(false); });
    fetch('../../data/ra/watchlist.json')
      .then(r => r.ok ? r.json() : { total: 0, results: [] })
      .then(data => setWatchlistData(data))
      .catch(() => setWatchlistData({ total: 0, results: [] }));
    fetch('../../data/ra/art.json')
      .then(r => r.ok ? r.json() : {})
      .then(data => setArtData(data?.games ?? {}))
      .catch(() => {});
    fetch('../../data/ra/series.json')
      .then(r => r.ok ? r.json() : [])
      .then(data => setSeriesData(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setSeriesLoaded(true));
  }, []);

  // ── Overview, wide screens only: the latest unlocks for the list under the newest one ──
  const [ovUnlocks, setOvUnlocks] = useState(null);
  useEffect(() => {
    if (activeTab !== 'overview' || ovUnlocks || !window.matchMedia('(min-width: 1024px)').matches) return;
    fetch('../../data/ra/achievements/1.json')
      .then(r => r.ok ? r.json() : { recentAchievements: [] })
      .then(d => setOvUnlocks([...(d.recentAchievements ?? [])].sort((a, b) => toMs(b.date) - toMs(a.date)).slice(0, 6)))
      .catch(() => setOvUnlocks([]));
  }, [activeTab]);

  // ── Load all achievement chunks when Activity tab is opened ──
  useEffect(() => {
    if (activeTab !== 'activity') return;
    if (achievementChunks[0] === null && loadingChunkIdx === null) loadAllChunks();
  }, [activeTab]);

  // ── Games: games/index.json (every game without its achievements, ~12 KB) when Recent, Progress
  //    or Series opens; a game's own games/{id}.json when its sheet opens. Until the pipeline has
  //    written the split, the old single games.json (5 MB, achievements included) is the fallback ─
  const gamesRequested = useRef(false);
  const loadGames = () => {
    if (gamesData || gamesRequested.current) return;
    gamesRequested.current = true;
    setLoadingGames(true);
    fetch('../../data/ra/games/index.json')
      .then(r => { if (!r.ok) throw new Error('no index'); return r.json(); })
      .then(d => ({ detailedGameProgress: d.games ?? {} }))
      .catch(() => fetch('../../data/ra/games.json').then(r => { if (!r.ok) throw new Error('Failed to load games'); return r.json(); }))
      .then(data => { setGamesData(data); setLoadingGames(false); })
      .catch(err => { console.error(err); setLoadingGames(false); setGamesFailed(true); });
  };
  useEffect(() => {
    if (['recent', 'progress', 'series'].includes(activeTab)) loadGames();
  }, [activeTab]);
  const [gameFiles, setGameFiles] = useState({});      // id → games/{id}.json, or false if it failed
  const gameFileRequested = useRef(new Set());
  const loadGameFile = id => {
    if (gameFileRequested.current.has(id)) return;
    gameFileRequested.current.add(id);
    fetch(`../../data/ra/games/${id}.json`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => setGameFiles(prev => ({ ...prev, [id]: d })))
      // No per-game file (before the pipeline wrote the split): the old single games.json has it
      .catch(() => { setGameFiles(prev => ({ ...prev, [id]: false })); loadGames(); });
  };
  // Opening a game: its sheet shows a skeleton until the game's file is in (from any tab, Overview's
  // Last played included), then the full entry
  const openGame = g => { setSelectedGame(g); if (!g.achievements?.length) loadGameFile(g.id); };

  // ── Merge loaded achievement chunks (newest first) ────────
  const allLoadedAchievements = useMemo(() => {
    return achievementChunks
      .slice(0, shownChunks)
      .filter(c => c !== null)
      .flat()
      .sort((a, b) => toMs(b.date) - toMs(a.date));
  }, [achievementChunks, shownChunks]);

  const loadedChunkCount = Math.min(shownChunks, achievementChunks.filter(c => c !== null).length);

  // Heatmap from every unlock of the year, in local days
  const heatmapData = useMemo(() => buildHeatmap(
    achievementChunks.filter(c => c !== null).flat(), a => a.date, { points: a => a.points }
  ), [achievementChunks]);

  // ── Merge profile + watchlist + games into the shape transformData expects ──
  const rawData = useMemo(() => {
    if (!profileData) return null;
    return {
      ...profileData,
      wantToPlayList:       watchlistData,  // from watchlist.json
      recentAchievements:   [],             // loaded separately in chunks for Activity tab
      // Index entries, with the full file of each game opened so far on top
      detailedGameProgress: { ...(gamesData?.detailedGameProgress ?? {}), ...Object.fromEntries(Object.entries(gameFiles).filter(([, d]) => d)) },
    };
  }, [profileData, watchlistData, gamesData, gameFiles]);

  const { profile: PROFILE_DATA, games: RAW_GAMES, backlog: BACKLOG } = useMemo(() => transformData(rawData), [rawData]);
  // Games with wide art (data/ra/art.json): banner = grid thumbnail (rows, tiles), art = hero thumbnail
  // faded behind rows, header = full hero (or banner) blurred behind the sheet header
  const ALL_GAMES = useMemo(() => RAW_GAMES.map(g => {
    const a = artData[g.id];
    if (!a?.grid) return g;
    return { ...g, wide: { banner: a.grid.thumb, art: a.hero?.thumb ?? a.grid.thumb, header: a.hero?.url ?? a.grid.url } };
  }), [RAW_GAMES, artData]);
  const beatenIds = useMemo(() => new Set((PROFILE_DATA?.gameAwards ?? []).filter(a => a.type === 'Game Beaten').map(a => a.gameId)), [PROFILE_DATA]);
  // ?game=<id> (from series/): open that game's sheet once the profile is in, then drop the parameter
  const deepGame = useRef(new URLSearchParams(location.search).get('game'));
  useEffect(() => {
    if (!deepGame.current || !ALL_GAMES.length) return;
    const g = ALL_GAMES.find(x => String(x.id) === deepGame.current);
    deepGame.current = null;
    const u = new URL(location.href); u.searchParams.delete('game'); history.replaceState({}, '', u);
    if (g) openGame(g);
  }, [ALL_GAMES]);
  // Game awards section (assets/completions.js): mastered and beaten games, tapping one opens its sheet
  const awardItems = useMemo(() => (PROFILE_DATA?.gameAwards ?? []).map(a => {
    const mastered = a.type === 'Mastery/Completion', hero = artData[a.gameId]?.hero?.url;
    const fact = mastered ? (a.rarest && { label: a.rarest.name, pct: a.rarest.pct, icon: 'trophy' }) : (a.winCondition && { label: a.winCondition.name, pct: a.winCondition.pct });
    return {
      key: a.gameId ?? a.id, tier: mastered ? 'gold' : 'silver', at: a.awardedAt,
      name: a.isSubset ? a.baseTitle : (a.baseTitle || a.title), title: a.title,
      tags: a.isSubset ? <span className="ml-1.5 align-[1px] text-[8px] font-bold uppercase tracking-[0.07em] px-1.5 py-[1px] rounded-[2px] border border-[rgba(229,177,67,0.3)] bg-[rgba(229,177,67,0.1)] text-[#c8a84b]">Subset</span> : (a.tags?.length ? <span className="ml-1">{renderTildeTags(a.tags)}</span> : null),
      sub: a.console, minutes: a.playtime, fact: fact || null,
      cover: a.icon, tile: a.icon, pixel: true, art: hero ?? a.shot ?? a.icon,
      onOpen: () => { const g = ALL_GAMES.find(x => x.id === a.gameId); if (g) openGame(g); },
    };
  }), [PROFILE_DATA, artData, ALL_GAMES]);
  const masteryAwards = useMemo(() => new Map((PROFILE_DATA?.gameAwards ?? []).filter(a => a.type === 'Mastery/Completion').map(a => [a.gameId, a])), [PROFILE_DATA]);

  // Header background: the most recently played game's screenshot, or its icon when it has none
  const latestGame = profileData?.recentlyPlayedGames?.[0];
  const latestShot = latestGame ? raShot(latestGame.imageIngame, latestGame.imageTitle) : null;
  const latestArt  = latestGame ? artData[latestGame.gameId] : null;
  const headerArt  = latestArt?.grid
    ? { url: latestArt.hero?.url ?? latestArt.grid.url, icon: false, wide: true }
    : { url: latestGame ? getMediaUrl(latestShot || latestGame.imageIcon) : null, icon: !!latestGame && !latestShot };

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Swipe between tabs on phones (assets/tabs.js); the order follows the tab bar
  const hasSeries = seriesData.some(s => s.showProgress);
  const tabIds = ['overview', 'recent', 'progress', ...(hasSeries ? ['series'] : []), 'activity', 'backlog'];
  // Skeleton shape of each tab while it slides in (assets/tabs.js PEEK_PARTS)
  const peekList = gameView === 'tiles' ? 'tiles' : 'list';
  const tabPeeks = {
    overview: ['h2', 'row', 'h2', 'unlock', 'h2', 'stats'],
    recent:   ['fbar', peekList],
    progress: ['chips', 'fbar', peekList],
    series:   ['fbar', 'chips', 'cards'],
    activity: ['h2', 'heatmap', 'h2', 'timeline'],
    backlog:  ['fbar', 'chips', 'wlist'],
  };
  const [swipeDir, setSwipeDir] = useSwipeTabs(tabContentRef, tabIds, activeTab, setTab, !loadingProfile && !!PROFILE_DATA, tabPeeks);
  const pickTab = id => { setSwipeDir(null); setTab(id); };

  if (loadingProfile) return <ProfileLoadingSkeleton />;
  if (error || !PROFILE_DATA) return (
    <div className="min-h-screen bg-[#171a21] flex flex-col items-center justify-center text-[#c6d4df] p-4 anim-fade">
        <AlertCircle className="text-[#ff6b6b] mb-2" size={48} />
        <h1 className="text-xl font-bold mb-2">Data Load Error</h1>
        <p className="text-[#8f98a0] mb-4">{error || "Could not transform profile data."}</p>
    </div>
  );

  let displayedGames = [...ALL_GAMES];
  let progressCounts = null;
  if (activeTab === 'recent') {
    // Recent: the latest 15; a search looks through every game, newest played first (up to 50)
    if (recentSearch) {
      const q = fold(recentSearch);
      displayedGames = displayedGames.filter(g => fold(g.baseTitle || g.title).includes(q) || fold(g.subsetName).includes(q));
    }
    displayedGames.sort((a, b) => toMs(b.lastPlayedStr) - toMs(a.lastPlayedStr));
    displayedGames = displayedGames.slice(0, recentSearch ? 50 : 15);
  } else if (activeTab === 'progress') {
    displayedGames = displayedGames
      .filter(g => g.achievementsUnlocked > 0 && g.achievementsTotal > 0 && (!progressSearch || fold(g.baseTitle || g.title).includes(fold(progressSearch))));
    const progressAcc = {
      pct:          g => g.rawProgress,
      left:         g => g.achievementsTotal - g.achievementsUnlocked,
      lastPlayedMs: g => raDateMs(g.lastPlayedStr),
      isCompleted:  g => g.isMastered,
    };
    progressCounts = progressViewCounts(displayedGames, progressAcc, showMastered);
    const bucketed = applyProgressView(displayedGames, progressView, progressAcc);
    displayedGames = bucketed ?? displayedGames
      .filter(g => showMastered || !g.isMastered)
      .sort((a, b) => {
        if (progressSort === 'progression') {
          // Progression % from the index summary (or the full list once a game's file is in)
          const getProg = g => g.progTotal > 0 ? g.progEarned / g.progTotal : -1;
          return getProg(b) - getProg(a);
        }
        return b.rawProgress - a.rawProgress;
      });
  }

  return (
    <div className="min-h-screen bg-[#171a21] text-[#c6d4df] font-sans selection:bg-[#66c0f4] selection:text-[#171a21] flex flex-col">
      
      {/* Topbar */}
      <div className="page-topbar sticky top-0 z-50 bg-[#131a22] border-b border-[#101214] px-4 md:px-8 py-1.5 flex items-center gap-2 text-[10px]">
        <a href="../../" className="text-[#546270] font-bold tracking-[0.15em] uppercase hover:text-[#8f98a0] transition-colors">Yozuryu</a>
        <span className="text-[#2a475e]">›</span>
        <a href="../../" className="text-[#546270] hover:text-[#8f98a0] transition-colors">Gaming Hub</a>
        <span className="text-[#2a475e]">›</span>
        <span className="text-[#c6d4df]">RetroAchievements</span>
      </div>

      {/* Header */}
      <header className="phead anim-fade">
        <HeaderArt urls={[headerArt.url]} icon={headerArt.icon} wide={headerArt.wide} />
        <div className="phead-in art-shadow">
          <div className="phead-main">
            <div className="phead-top">
              <div className="phead-av">
                <img src={PROFILE_DATA.avatar} alt={PROFILE_DATA.username} />
                {['Online', 'Playing', 'Offline'].includes(PROFILE_DATA.status) && (
                  <span className="dot" title={PROFILE_DATA.status}
                    style={{ background: PROFILE_DATA.status === 'Online' ? '#57cbde' : PROFILE_DATA.status === 'Playing' ? '#6bcf7f' : '#546270' }} />
                )}
              </div>
              <div className="phead-id">
                <div className="phead-name">
                  <h1>{PROFILE_DATA.username}</h1>
                  <a href={`${SITE_URL}/user/${PROFILE_DATA.username}`} target="_blank" rel="noreferrer" title="View on RetroAchievements" className="phead-link">
                    <img src="https://static.retroachievements.org/assets/images/favicon.webp" alt="RA"
                      onError={(e) => { e.target.onerror = null; e.target.src = "https://avatars.githubusercontent.com/u/49842581?s=32&v=4"; }} />
                  </a>
                </div>
                <div className="phead-sub">
                  Rank <b className="text-[#e5b143]">#{PROFILE_DATA.rank}</b>
                  {PROFILE_DATA.topPercentage !== '--%' && <> · Top <b className="text-[#e5b143]">{PROFILE_DATA.topPercentage}</b></>}
                </div>
                <div className="phead-sub">Last active {PROFILE_DATA.lastActivity}<span className="md:hidden"> · member since {PROFILE_DATA.memberSince}</span></div>
              </div>
            </div>
            {PROFILE_DATA.bio && <p className="phead-motto">"{PROFILE_DATA.bio}"</p>}
          </div>

          <div className="phead-side">
            <div className="phead-stats">
              <div className="phead-stat"><b className="text-[#e5b143]">{PROFILE_DATA.totalPoints.toLocaleString()}</b><span>Points</span></div>
              <div className="phead-stat"><b className="text-[#66c0f4]">{PROFILE_DATA.totalUnlocked.toLocaleString()}</b><span>Achievements</span></div>
              <div className="phead-stat"><b className="text-[#e5b143]">{ALL_GAMES.filter(g => g.isMastered).length}</b><span>Mastered</span></div>
            </div>
            <div className="phead-meta">Member since <b>{PROFILE_DATA.memberSince}</b></div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl lg:max-w-[79rem] mx-auto px-4 md:px-8 py-6 flex-1 w-full anim-in">
        
        {/* ── Tabs: sticky, scroll sideways, swipe between them on phones (assets/tabs.js) ── */}
        <div className="ptabs-anchor" />
        <TabBar barRef={tabBarRef} active={activeTab} onChange={pickTab} tabs={[
          { id: 'overview', label: 'Overview',  icon: <User size={15} />,      color: '#66c0f4' },
          { id: 'recent',   label: 'Recent',    icon: <Clock size={15} />,     color: '#66c0f4' },
          { id: 'progress', label: 'Progress',  icon: <BarChart2 size={15} />, color: '#66c0f4' },
          ...(hasSeries ? [{ id: 'series', label: 'Series', icon: <Layers size={15} />, color: '#e5b143' }] : []),
          { id: 'activity', label: 'Activity',  icon: <Activity size={15} />,  color: '#66c0f4' },
          { id: 'backlog',  label: 'Watchlist', icon: <Star size={15} />,      color: '#66c0f4' },
        ]} />

        {/* Re-keyed per tab so each tab's content fades in */}
        {/* The swipe listener sits on this stable wrapper; the keyed child is replaced on every tab change */}
        <div ref={tabContentRef}>
        <div key={activeTab} className={`flex flex-col gap-3 ${swipeDir === 'swipe' ? '' : 'anim-in'}`}>
          {activeTab === 'overview' ? (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 lg:gap-8">
          
              <div className="flex flex-col gap-6">
            
                {/* Last played: the same row as Recent / Progress (tap opens the sheet), with the rich presence inside it */}
                <div>
                  <h2 className="text-[13px] text-white tracking-wide uppercase font-medium border-b border-[#2a475e] pb-1.5 flex items-center gap-2 mb-3">
                    <span className="w-[3px] h-[14px] bg-[#66c0f4] rounded-[1px] shrink-0"></span>
                    <Activity size={15} className="text-[#66c0f4]"/> Last Played
                  </h2>
                  {(() => {
                    const g = PROFILE_DATA.mostRecentGame && ALL_GAMES.find(x => x.id === PROFILE_DATA.mostRecentGame.id);
                    if (!g) return <div className="text-[#8f98a0] text-[11px] py-2">No recent games found.</div>;
                    return (
                      <GameListRow game={g} onViewDetails={openGame}
                        extra={PROFILE_DATA.richPresenceMsg && <span className="grow-extra rp" title="Rich presence: what the game reports you're doing"><Radio size={11} className="text-[#57cbde]" />{PROFILE_DATA.richPresenceMsg}</span>} />
                    );
                  })()}
                </div>

                {/* Most Recently Unlocked Achievement */}
                <div>
                  <h2 className="text-[13px] text-white tracking-wide uppercase font-medium border-b border-[#2a475e] pb-1.5 flex items-center gap-2 mb-3">
                    <span className="w-[3px] h-[14px] bg-[#e5b143] rounded-[1px] shrink-0"></span>
                    <Trophy size={15} className="text-[#e5b143]"/> Recent unlocks
                  </h2>
                  {PROFILE_DATA.mostRecentAchievement ? (
                    <div className="bg-[#1b2838]/80 border border-[#323f4c] border-l-[3px] border-l-[#e5b143] rounded-[3px] p-3 flex gap-3 hover:bg-[#202d39] transition-colors shadow-sm">
                      <a href={`${SITE_URL}/achievement/${PROFILE_DATA.mostRecentAchievement.id}`} target="_blank" rel="noreferrer" className="shrink-0 w-12 h-12 rounded-[2px] overflow-hidden border border-[#101214] bg-black block hover:scale-105 transition-transform">
                        <img src={`${MEDIA_URL}/Badge/${PROFILE_DATA.mostRecentAchievement.badgeName}.png`} alt={PROFILE_DATA.mostRecentAchievement.title} className="w-full h-full object-cover" />
                      </a>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <a href={`${SITE_URL}/achievement/${PROFILE_DATA.mostRecentAchievement.id}`} target="_blank" rel="noreferrer" className="text-[13px] font-medium text-[#e5b143] hover:underline truncate leading-tight">
                            {PROFILE_DATA.mostRecentAchievement.title}
                          </a>
                          <span className="text-[9px] font-bold text-[#66c0f4] bg-[#101214] border border-[#323f4c] px-1.5 py-[1px] rounded-sm shrink-0">{PROFILE_DATA.mostRecentAchievement.points} pts</span>
                          {PROFILE_DATA.mostRecentAchievement.trueRatio > 0 && PROFILE_DATA.mostRecentAchievement.points > 0 && (() => {
                            const ratio = PROFILE_DATA.mostRecentAchievement.trueRatio / PROFILE_DATA.mostRecentAchievement.points;
                            return <span className="text-[9px] shrink-0" style={{ color: ratio >= 30 ? '#ff6b6b' : ratio >= 20 ? '#e5b143' : ratio >= 10 ? '#66c0f4' : '#8f98a0' }}>×{ratio.toFixed(1)}</span>;
                          })()}
                        </div>
                        <p className="text-[10px] text-[#8f98a0] leading-snug mb-1 truncate">{PROFILE_DATA.mostRecentAchievement.description}</p>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <a href={`${SITE_URL}/game/${PROFILE_DATA.mostRecentAchievement.gameId}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 group">
                            <img src={PROFILE_DATA.mostRecentAchievement.gameIcon} alt="" className="w-3.5 h-3.5 rounded-[1px] border border-[#101214]" />
                            <span className="text-[#66c0f4] group-hover:text-[#c6d4df] transition-colors">{PROFILE_DATA.mostRecentAchievement.baseTitle || PROFILE_DATA.mostRecentAchievement.gameTitle}</span>
                            {renderTildeTags(PROFILE_DATA.mostRecentAchievement.tags)}
                          </a>
                          <span className="text-[#546270]">•</span>
                          <span className="text-[#8f98a0]">{PROFILE_DATA.mostRecentAchievement.consoleName}</span>
                          <span className="text-[#546270]">•</span>
                          <span className="text-[#546270]">{PROFILE_DATA.mostRecentAchievement.timeAgo}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[#8f98a0] text-[11px] py-2 italic">No achievements unlocked in the last 1 year.</div>
                  )}
                  {/* Wide screens: the next few unlocks as compact rows */}
                  {ovUnlocks?.some(a => a.achievementId !== PROFILE_DATA.mostRecentAchievement?.id) && (
                    <div className="ulist anim-fade">
                      {ovUnlocks.filter(a => a.achievementId !== PROFILE_DATA.mostRecentAchievement?.id).slice(0, 5).map(a => (
                        <a key={`${a.achievementId}-${a.date}`} href={`${SITE_URL}/achievement/${a.achievementId}`} target="_blank" rel="noreferrer" className="urow">
                          <img src={`${MEDIA_URL}/Badge/${a.badgeName}.png`} alt="" loading="lazy" className="px" />
                          <div className="urow-main">
                            <span className="urow-title">{a.title}</span>
                            <span className="urow-sub"><span className="text-[#66c0f4]">{parseTitle(a.gameTitle).baseTitle || a.gameTitle}</span> · {formatTimeAgo(a.date)}</span>
                          </div>
                          <span className="urow-end">{a.points} pts</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>


              </div>

              {/* Rail (wide screens): user stats, then game awards. Phone: below the left column, same order */}
              <div className="prail flex flex-col gap-5">
                <div>
                  <h2 className="text-[13px] text-white tracking-wide uppercase font-medium border-b border-[#2a475e] pb-1.5 flex items-center gap-2 mb-2">
                    <span className="w-[3px] h-[14px] bg-[#66c0f4] rounded-[1px] shrink-0"></span>
                    <BarChart2 size={15} className="text-[#66c0f4]"/> User Stats
                  </h2>

                  {/* Tiles, value over label; the header already shows points, achievements and mastered */}
                  <StatTiles items={PROFILE_DATA.statsLeft.filter(st => st.label !== 'Achievements unlocked').map(st => ({ ...st, label: STAT_LABELS[st.label] ?? st.label }))} />
                  {statsExpanded && <div className="mt-2 anim-fade"><StatTiles items={PROFILE_DATA.statsRight} /></div>}
                  <button onClick={() => setStatsExpanded(v => !v)} className="smore" aria-expanded={statsExpanded}>
                    {statsExpanded ? 'Fewer stats' : 'More stats'}
                    <ChevronDown size={13} className={`transition-transform duration-200 ${statsExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                <CompletionsPanel title="Game awards" labels={{ gold: 'Mastered', silver: 'Beaten' }} shape="sq" items={awardItems} />

              </div>
            </div>
          ) : activeTab === 'series' ? (
            !seriesLoaded || (!gamesData && !gamesFailed)
              ? <>{[...Array(3)].map((_, i) => <GameCardSkeleton key={i} />)}</>
              : <SeriesProgressTab seriesData={seriesData} gamesData={gamesData} watchlistData={watchlistData} allGames={ALL_GAMES} beatenIds={beatenIds} onOpen={setSelectedSeries} />
          ) : activeTab === 'activity' ? (
            loadedChunkCount === 0 && loadingChunkIdx !== null
              ? <ActivitySkeleton />
              : <ActivityTab
                  achievements={allLoadedAchievements}
                  refTime={rawData?.metadata?.extractionTimestamp}
                  heatmapData={heatmapData}
                  artData={artData}
                  loadedChunks={loadedChunkCount}
                  totalChunks={TOTAL_ACH_CHUNKS}
                  hasMore={loadedChunkCount < TOTAL_ACH_CHUNKS}
                  loadingMore={false}
                  onLoadMore={loadNextChunk}
                />
          ) : activeTab === 'backlog' && watchlistData === null ? (
            // watchlist.json loads separately from profile.json: skeleton rows until it lands
            <div className="flex flex-col gap-2">
              <div className="shimmer h-6 w-2/3 rounded-[2px]" />
              <div className="border border-[#2a475e] rounded-[2px] overflow-hidden">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 border-b border-[#1a2535]">
                    <div className="shimmer w-8 h-8 rounded-[2px] shrink-0" />
                    <div className="flex-1 flex flex-col gap-1.5"><Sk w="w-1/2" h="h-2.5" /><Sk w="w-1/4" h="h-2" /></div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === 'backlog' ? (
            <>{(() => {
              // ── helpers ──────────────────────────────────────────────
              const getStatus = g => {
                if (g.achievementsTotal === 0) return 'noach';
                if (g.achievementsTotal > 0 && g.numAwarded === g.achievementsTotal) return 'mastered';
                if (g.inProgress) return 'inprogress';
                return 'notstarted';
              };

              const filtered = BACKLOG.games.filter(g => {
                const status = getStatus(g);
                if (watchlistSearch) {
                  const q = fold(watchlistSearch);
                  const searchable = [
                    g.baseTitle || g.title,
                    g.isSubset ? 'subset' : null,
                    g.subsetName,
                    ...(g.tags || []),
                  ].filter(Boolean).join(' ');
                  if (!fold(searchable).includes(q)) return false;
                }
                if (watchlistStatusFilter !== 'all' && status !== watchlistStatusFilter) return false;
                return true;
              });

              const statusMeta = {
                mastered:   { dot: '#e5b143', label: 'Mastered',        defaultOpen: true  },
                inprogress: { dot: '#66c0f4', label: 'In progress',     defaultOpen: true  },
                notstarted: { dot: '#546270', label: 'Not started',     defaultOpen: false },
                noach:      { dot: '#1e2a35', label: 'No achievements', defaultOpen: false },
              };

              // Build groups
              let groups = [];
              if (watchlistGrouping === 'console') {
                const map = {};
                filtered.forEach(g => { if (!map[g.console]) map[g.console] = []; map[g.console].push(g); });
                groups = Object.entries(map).sort(([a],[b]) => a.localeCompare(b))
                  .map(([key, games]) => ({ key, label: key, dot: '#66c0f4', games, defaultOpen: games.length <= 5 }));
              } else if (watchlistGrouping === 'status') {
                ['mastered','inprogress','notstarted','noach'].forEach(s => {
                  const games = filtered.filter(g => getStatus(g) === s);
                  if (games.length > 0) groups.push({ key: s, label: statusMeta[s].label, dot: statusMeta[s].dot, games, defaultOpen: statusMeta[s].defaultOpen });
                });
              } else if (watchlistGrouping === 'subsets') {
                groups = null; // built below, once stackSubsets exists
              } else if (watchlistGrouping === 'series') {
                [...seriesData].sort((a, b) => {
                  const key = n => /^[a-zA-Z]/.test(n) ? '2' + n.toLowerCase() : /^\d/.test(n) ? '1' + n.toLowerCase() : '0' + n.toLowerCase();
                  return key(a.name).localeCompare(key(b.name));
                }).forEach(s => {
                  const games = s.gameIds.map(id => filtered.find(g => g.id === id)).filter(Boolean);
                  if (games.length > 0) groups.push({ key: s.id, label: s.name, dot: '#e5b143', games, defaultOpen: games.length <= 3 });
                });
                const assignedIds = new Set(seriesData.flatMap(s => s.gameIds));
                const otherGames = filtered.filter(g => !assignedIds.has(g.id));
                if (otherGames.length > 0) groups.push({ key: '__other__', label: 'Other', dot: '#546270', games: otherGames, defaultOpen: false });
              }

              // Same stripe ladder as game cards: gold → silver (beaten) → blue → gray → near-black
              const stripeOf = g => {
                const st = getStatus(g);
                return st === 'mastered' ? '#e5b143' : g.isBeaten ? '#b8c4ce' : st === 'inprogress' ? '#66c0f4' : st === 'noach' ? '#1e2a35' : '#323f4c';
              };

              // One watchlist row (styles in assets/ui.css). Rows are render functions, not components: they
              // live inside App's render, so as components every re-render (e.g. on scroll) remounted them all: status once, on the right; colour on the left edge
              const gameRow = game => {
                const status = getStatus(game);
                const isMastered   = status === 'mastered';
                const isInProgress = status === 'inprogress';
                const hasNoAch     = status === 'noach';
                const stripe = stripeOf(game);
                const pct = game.achievementsTotal > 0 ? (game.numAwarded / game.achievementsTotal) * 100 : 0;
                return (
                  <a key={game.id} href={`${SITE_URL}/game/${game.id}`} target="_blank" rel="noreferrer" className={`wrow ${hasNoAch ? 'dim' : ''}`} style={{ borderLeftColor: stripe }}>
                    <img src={game.icon} alt="" loading="lazy" className="wrow-icon" />
                    <div className="wrow-main">
                      <div className="wrow-title">
                        <span title={game.title}>{game.baseTitle || game.title}</span>
                        {game.isSubset && <span className="text-[7px] font-bold uppercase tracking-[0.07em] px-1 py-[1px] rounded-[2px] border border-[rgba(229,177,67,0.3)] bg-[rgba(229,177,67,0.1)] text-[#c8a84b] shrink-0">Subset</span>}
                        {renderTildeTags(game.tags)}
                      </div>
                      <div className="wrow-sub">
                        {watchlistGrouping !== 'console' && <span className="text-[#66c0f4]">{game.console}</span>}
                        {game.pointsTotal > 0 && <>{watchlistGrouping !== 'console' && <i>·</i>}<span>{game.pointsTotal.toLocaleString()} pts</span></>}
                        {game.isSubset && game.subsetName && <><i>·</i><span className="text-[#c8a84b] shrink">{game.subsetName}</span></>}
                      </div>
                    </div>
                    <div className="wrow-end">
                      {isInProgress && <>
                        <span className="gcount">{game.numAwarded}<span>/{game.achievementsTotal}</span></span>
                        <div className="gbar"><i style={{ width: `${pct}%`, background: '#66c0f4' }} /></div>
                      </>}
                      {isMastered && <span className="text-[9px] font-bold uppercase tracking-[0.07em] px-1.5 py-[1px] rounded-[2px] bg-[#e5b143] text-[#101214] flex items-center gap-1"><Trophy size={9} />Mastered</span>}
                      {status === 'notstarted' && <span className="text-[11px] text-[#8f98a0] flex items-center gap-1 tabular-nums" title={`${game.achievementsTotal} achievements`}><Trophy size={11} className="text-[#546270]" />{game.achievementsTotal}</span>}
                      {hasNoAch && <span className="text-[11px] text-[#546270] text-right leading-tight">No achievements</span>}
                    </div>
                  </a>
                );
              };

              // Subsets sit under their base game (same title and console) when both are in the list;
              // a combined base like "A | B" counts as each of its names. A subset whose base isn't
              // listed stays a row of its own
              const stackSubsets = games => {
                const keyOf = (title, consoleName) => `${title.toLowerCase()}|${consoleName}`;
                const baseFor = new Map();
                games.forEach(g => {
                  if (g.isSubset) return;
                  const title = g.baseTitle || g.title;
                  [title, ...title.split(' | ')].forEach(n => { const k = keyOf(n.trim(), g.console); if (!baseFor.has(k)) baseFor.set(k, g.id); });
                });
                const subsOf = new Map();
                const out = [];
                games.forEach(g => {
                  const baseId = g.isSubset ? baseFor.get(keyOf(g.baseTitle || g.title, g.console)) : undefined;
                  if (baseId != null) { if (!subsOf.has(baseId)) subsOf.set(baseId, []); subsOf.get(baseId).push(g); }
                  else out.push(g);
                });
                return out.map(g => ({ game: g, subsets: subsOf.get(g.id) ?? [] }));
              };
              // Subsets grouping: games with subsets (their stacked cards, plus subsets whose base isn't
              // listed) vs games without; counts are games, not sets
              if (watchlistGrouping === 'subsets') {
                const entries = stackSubsets(filtered);
                const withSubs = entries.filter(e => e.subsets.length || e.game.isSubset);
                const without  = entries.filter(e => !e.subsets.length && !e.game.isSubset);
                groups = [
                  { key: 'with', label: 'With subsets', dot: '#c8a84b', count: withSubs.length, games: withSubs.flatMap(e => [e.game, ...e.subsets]), defaultOpen: true },
                  { key: 'without', label: 'Without subsets', dot: '#546270', count: without.length, games: without.map(e => e.game), defaultOpen: false },
                ].filter(g => g.games.length);
              }

              // One set inside a game's card: its icon, "Base set" or the subset name, points, status
              const setRow = (game, base = false) => {
                const status = getStatus(game);
                const pct = game.achievementsTotal > 0 ? (game.numAwarded / game.achievementsTotal) * 100 : 0;
                return (
                  <a key={game.id} href={`${SITE_URL}/game/${game.id}`} target="_blank" rel="noreferrer" title={game.title}
                    className={`wsub ${base ? '' : 'subset'} ${status === 'noach' ? 'dim' : ''}`} style={{ borderLeftColor: stripeOf(game) }}>
                    <img src={game.icon} alt="" loading="lazy" className="icon" />
                    <span className="name">{base ? 'Base set' : game.subsetName}</span>
                    {game.pointsTotal > 0 && <span className="pts">· {game.pointsTotal.toLocaleString()} pts</span>}
                    <span className="end">
                      {status === 'inprogress' && <><span className="gcount">{game.numAwarded}<span>/{game.achievementsTotal}</span></span><div className="gbar"><i style={{ width: `${pct}%`, background: '#66c0f4' }} /></div></>}
                      {status === 'mastered' && <span className="text-[9px] font-bold uppercase tracking-[0.07em] px-1.5 py-[1px] rounded-[2px] bg-[#e5b143] text-[#101214] flex items-center gap-1"><Trophy size={9} />Mastered</span>}
                      {status === 'notstarted' && <span className="text-[11px] text-[#8f98a0] flex items-center gap-1 tabular-nums" title={`${game.achievementsTotal} achievements`}><Trophy size={11} className="text-[#546270]" />{game.achievementsTotal}</span>}
                      {status === 'noach' && <span className="text-[11px] text-[#546270]">No achievements</span>}
                    </span>
                  </a>
                );
              };
              // A game with subsets: name and console once on top, then the base set and each subset
              const stackCard = (game, subsets) => (
                <div key={game.id} className="wstack">
                  <a href={`${SITE_URL}/game/${game.id}`} target="_blank" rel="noreferrer" className="whead">
                    <span className="t"><span>{game.baseTitle || game.title}</span>{renderTildeTags(game.tags)}</span>
                    {watchlistGrouping !== 'console' && <span className="c">{game.console}</span>}
                  </a>
                  {setRow(game, true)}
                  {subsets.map(sg => setRow(sg))}
                </div>
              );
              const rows = games => stackSubsets(games).map(({ game, subsets }) => subsets.length
                ? stackCard(game, subsets)
                : gameRow(game));

              return (
                <>
                  {/* ── Search + grouping, then the status filters with their counts (styles in assets/ui.css) ── */}
                  <div className="flex flex-col gap-2.5 mb-3">
                    <div className="fbar">
                      <div className="fsearch">
                        <Search size={14} />
                        <input type="text" inputMode="search" placeholder={`Search ${BACKLOG.games.length.toLocaleString()} games`} aria-label="Search watchlist" value={watchlistSearch} onChange={e => setWatchlistSearch(e.target.value)} />
                        {watchlistSearch && <button onClick={() => setWatchlistSearch('')} aria-label="Clear search"><X size={13} /></button>}
                      </div>
                      <select value={watchlistGrouping} onChange={e => { setWatchlistGrouping(e.target.value); setCollapsedGroups(new Set()); }} className="fselect" aria-label="Group">
                        <option value="none">No grouping</option>
                        <option value="console">Group: Console</option>
                        <option value="status">Group: Status</option>
                        <option value="series">Group: Series</option>
                        <option value="subsets">Group: Subsets</option>
                      </select>
                    </div>
                    <div className="frow" role="group" aria-label="Status">
                      {[
                        { value: 'all',        label: 'All'             },
                        { value: 'notstarted', label: 'Not started'     },
                        { value: 'inprogress', label: 'In progress'     },
                        { value: 'mastered',   label: 'Mastered'        },
                        { value: 'noach',      label: 'No achievements' },
                      ].map(opt => {
                        const n = opt.value === 'all' ? BACKLOG.games.length : BACKLOG.games.filter(g => getStatus(g) === opt.value).length;
                        return (
                          <button key={opt.value} onClick={() => setWatchlistStatusFilter(opt.value)} aria-pressed={watchlistStatusFilter === opt.value}
                            className={`fchip ${watchlistStatusFilter === opt.value ? 'on' : ''}`}>
                            {opt.label}<span className="n">{n.toLocaleString()}</span>
                          </button>
                        );
                      })}
                    </div>
                    {(filtered.length !== BACKLOG.games.length || BACKLOG.games.length < BACKLOG.total) && (
                      <div className="fmeta anim-fade">
                        {filtered.length !== BACKLOG.games.length && <><b>{filtered.length.toLocaleString()}</b> of {BACKLOG.games.length.toLocaleString()} shown</>}
                        {BACKLOG.games.length < BACKLOG.total && <> · showing the first {BACKLOG.games.length.toLocaleString()} of {BACKLOG.total.toLocaleString()}</>}
                        {(watchlistSearch || watchlistStatusFilter !== 'all') && (
                          <button onClick={() => { setWatchlistSearch(''); setWatchlistStatusFilter('all'); }} className="ml-2 text-[#66c0f4] hover:underline">Clear filters</button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* List (two columns on desktop); groups get a header row that opens and closes */}
                  <div key={`${watchlistStatusFilter}-${watchlistGrouping}`} className="wlist anim-fade">
                    {filtered.length === 0 ? (
                      <div className="text-center py-6 text-[#546270] text-[12px]" style={{ gridColumn: '1 / -1' }}>No games match the current filters.</div>
                    ) : watchlistGrouping === 'none' ? (
                      rows(filtered)
                    ) : (
                      groups.map(group => {
                        const isOpen = collapsedGroups.has(group.key)
                          ? !group.defaultOpen  // toggled: flip from default
                          : (group.defaultOpen ?? true); // not toggled: use default
                        return (
                          <React.Fragment key={group.key}>
                            <button onClick={() => toggleGroup(group.key)} className="wgroup" aria-expanded={isOpen}>
                              <span className="mark" style={{ background: group.dot }} />
                              <span className="label">{group.label}</span>
                              <span className="n">{(group.count ?? group.games.length).toLocaleString()}</span>
                              <ChevronDown size={14} className={`text-[#546270] transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isOpen && <div className="wlist anim-fade" style={{ gridColumn: '1 / -1' }}>{rows(group.games)}</div>}
                          </React.Fragment>
                        );
                      })
                    )}
                  </div>
                </>
              );
            })()}</>
          ) : (
            loadingGames
              ? <GameViewSkeleton view={gameView} />
              : <>
              {/* Filter bar — only for Completion Progress */}
              {activeTab === 'progress' && (
                <ProgressFilterBar
                  view={progressView} onView={setProgressView}
                  sorts={[
                    { value: 'overall',     label: 'Overall'     },
                    { value: 'progression', label: 'Progression', activeCls: 'bg-[#e5b143] text-[#101214] border-[#e5b143]' },
                  ]}
                  sort={progressSort} onSort={setProgressSort}
                  completedLabel="Mastered" showCompleted={showMastered} onShowCompleted={setShowMastered}
                  counts={progressCounts}
                  search={progressSearch} onSearch={setProgressSearch}
                  viewToggle={<ViewToggle view={gameView} onChange={setGameView} />}
                />
              )}
              {/* Recent: a search over the whole library (newest played first) and the list / tiles switch */}
              {activeTab === 'recent' && (
                <div className="fbar">
                  <div className="fsearch">
                    <Search size={14} />
                    <input type="text" inputMode="search" value={recentSearch} onChange={e => setRecentSearch(e.target.value)} placeholder="Search games" aria-label="Search games" />
                    {recentSearch && <button onClick={() => setRecentSearch('')} aria-label="Clear search"><X size={13} /></button>}
                  </div>
                  <ViewToggle view={gameView} onChange={setGameView} />
                </div>
              )}
              {activeTab === 'recent' && recentSearch && displayedGames.length === 0 && (
                <div className="text-center py-12 text-[#546270] text-[12px]">No games match your search.</div>
              )}
              {/* Re-keyed on sort/view/filter changes so the new order fades in (not on search keystrokes) */}
              <div key={`${progressSort}-${progressView}-${showMastered}-${gameView}`} className="anim-fade">
                {activeTab === 'progress' && displayedGames.length === 0 && (
                  <div className="text-center py-12 text-[#546270] text-[12px]">
                    {progressSearch ? 'No games match your search.' : 'No games in this view.'}
                  </div>
                )}
                <div className={gameView === 'tiles' ? 'gtiles' : 'glist'}>
                  {displayedGames.map(game => gameView === 'tiles'
                    ? <GameTile key={game.id} game={game} onViewDetails={openGame} />
                    : <GameListRow key={game.id} game={game} onViewDetails={openGame} />)}
                </div>
              </div>
            </>
          )}
        </div>
        </div>

      </main>

      {/* Footer B */}
      <footer className="bg-[#1b2838] border-t-2 border-[#2a475e] px-4 md:px-8 py-2.5 flex items-center gap-3 mt-6">
        <div className="w-[3px] h-[18px] rounded-[1px] bg-[#66c0f4] opacity-50 shrink-0"></div>
        <p className="text-[10px] text-[#546270]">
          Generated from <span className="text-[#8f98a0]">RetroAchievements API</span>
          <span className="mx-2 text-[#2a475e]">·</span>
          Last change <span className="text-[#8f98a0]">{rawData?.metadata?.extractionTimestamp ? new Date(rawData.metadata.extractionTimestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
        </p>
        <a href={SITE_URL} target="_blank" rel="noreferrer" className="ml-auto text-[10px] text-[#546270] hover:text-[#66c0f4] transition-colors shrink-0">
          retroachievements.org ↗
        </a>
      </footer>

      {/* Scroll-to-top button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="scroll-top-btn anim-fade fixed right-4 z-[195] w-10 h-10 bg-[#131a22] border border-[#2a475e] hover:border-[#66c0f4] hover:text-[#66c0f4] text-[#8f98a0] rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-90"
          style={{ bottom: '3.5rem' }}
          title="Scroll to top"
        >
          <ChevronDown size={16} className="rotate-180" />
        </button>
      )}

      <style>{`
        html { background-color: #1b2838; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #171a21; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #323f4c; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #546270; }

        .pop-wrap { position: relative; display: inline-flex; align-items: center; cursor: help; }
        .pop-wrap .pop-box {
          display: none; position: absolute;
          bottom: calc(100% + 7px); left: 50%; transform: translateX(-50%);
          background: #131a22; border: 1px solid #2a475e; border-radius: 2px;
          padding: 6px 8px; white-space: nowrap; z-index: 200;
          box-shadow: 0 4px 16px rgba(0,0,0,0.7); pointer-events: none;
          min-width: 110px;
        }
        .pop-wrap .pop-box::after {
          content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
          border: 4px solid transparent; border-top-color: #2a475e;
        }
        .pop-wrap:hover .pop-box { display: block; animation: motion-fade 120ms ease-out both; }
        @media (prefers-reduced-motion: reduce) { .pop-wrap:hover .pop-box { animation: none; } }
        .pop-name { font-size: 10px; color: #c6d4df; font-weight: 600; margin-bottom: 2px; }
        .pop-sub  { font-size: 9px; color: #546270; margin-bottom: 2px; }
        .pop-val  { font-size: 10px; font-weight: 700; }
        
        .mask-fade {
           mask-image: linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%);
           -webkit-mask-image: linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%);
        }

        /* Shimmer skeleton */
        @keyframes shimmer {
          0%   { background-position: -800px 0; }
          100% { background-position:  800px 0; }
        }
        .shimmer {
          background: linear-gradient(90deg, #1b2838 25%, #2a3f52 50%, #1b2838 75%);
          background-size: 800px 100%;
          animation: shimmer 1.6s infinite linear;
          border-radius: 2px;
        }



      `}</style>

      {selectedGame && (() => {
        const shown = ALL_GAMES.find(x => x.id === selectedGame.id) || selectedGame;
        return <RAchievementModal game={shown}
        loading={!shown.achievements?.length && (shown.achievementsTotal ?? 0) > 0 && !(gameFiles[selectedGame.id] === false && (gamesData || gamesFailed))}
        onClose={() => { setSelectedGame(null); setSeriesBack(null); }}
        onBack={seriesBack ? () => { setSelectedGame(null); setSelectedSeries(seriesBack); setSeriesBack(null); } : null}
        backLabel={seriesBack?.series.name} />;
      })()}
      {selectedSeries && <SeriesSheet card={selectedSeries} awards={masteryAwards} onClose={() => setSelectedSeries(null)} onScope={i => setSelectedSeries(s => s && { ...s, __sub: i })}
        onOpenGame={g => { setSeriesBack(selectedSeries); setSelectedSeries(null); openGame(g); }} />}
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
