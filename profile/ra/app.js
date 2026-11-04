import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Gamepad2, Activity, BarChart2, Award, Star, ChevronDown, AlertCircle, Trophy, Crown, Lock, Unlock, AlertTriangle, Flame, Feather, Medal, ShieldOff, CircleDashed, X, Clock, BookOpen, Youtube, ExternalLink, Layers, List, LayoutGrid, Search, Check, Plus, User, Radio } from 'lucide-react';
import { MEDIA_URL, SITE_URL, TILDE_TAG_COLORS } from './utils/constants.js';
import { getMediaUrl, parseTitle, formatTimeAgo, raShot } from './utils/helpers.js';
import { transformData } from './utils/transform.js';
import { useSheet, useArtSrc } from '../../assets/sheet.js';
import { useGameView, shortAgo } from '../../assets/game-view.js';
import { TabBar, useSwipeTabs, scrollToTabs } from '../../assets/tabs.js';
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

// Column count of the sidebar icon grid (grid-cols-5 sm:grid-cols-8 lg:grid-cols-5),
// tracked so the panel can show exactly two rows before "Show all"
const useIconGridCols = () => {
  const read = () =>
    window.matchMedia('(min-width: 1024px)').matches ? 5
    : window.matchMedia('(min-width: 640px)').matches ? 8
    : 5;
  const [cols, setCols] = useState(read);
  useEffect(() => {
    const queries = ['(min-width: 640px)', '(min-width: 1024px)'].map(q => window.matchMedia(q));
    const onChange = () => setCols(read());
    queries.forEach(mq => mq.addEventListener('change', onChange));
    return () => queries.forEach(mq => mq.removeEventListener('change', onChange));
  }, []);
  return cols;
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
  { value: 'nearly',     label: 'Nearly there', hint: '75%+ done · fewest achievements left first' },
  { value: 'inprogress', label: 'In progress',  hint: 'Played in the last 30 days · most recent first' },
  { value: 'abandoned',  label: 'Abandoned',    hint: 'Unfinished · not played for 30+ days' },
];
const NEARLY_PCT = 75;
// Search text without accents or case, so "pokemon" finds "Pokémon"
const fold = str => (str ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const STALE_MS   = 30 * 24 * 60 * 60 * 1000;


const ProgressFilterBar = ({ view, onView, sorts, sort, onSort, completedLabel, showCompleted, onShowCompleted, counts, search, onSearch, viewToggle }) => {
  const hint = PROGRESS_VIEWS.find(v => v.value === view)?.hint;
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

      {hint && <div key={view} className="fmeta anim-fade">{hint}</div>}
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


const GuideStrip = ({ game, guides, isLast, inModal = false }) => {
  const [openCategory, setOpenCategory] = useState(null);
  const ref = useRef(null);

  const searchTitle = encodeURIComponent(game.baseTitle || game.title);
  const categoryIcon = (cat) => {
    const c = cat.toLowerCase();
    if (c === 'videos') return <Youtube size={inModal ? 12 : 9} />;
    if (c === 'guides') return <BookOpen size={inModal ? 12 : 9} />;
    return <ExternalLink size={inModal ? 12 : 9} />;
  };
  const fallbackCategories = [
    { category: 'Guides', links: [{ label: 'Search GameFAQs', url: `https://gamefaqs.gamespot.com/search?game=${searchTitle}` }] },
    { category: 'Videos', links: [{ label: 'Search YouTube',  url: `https://www.youtube.com/results?search_query=${searchTitle}+longplay` }] },
  ];
  const customCategoryNames = new Set((guides ?? []).map(g => g.category));
  const categories = guides
    ? [...guides.map(g => ({ ...g, isCustom: true })), ...fallbackCategories.filter(f => !customCategoryNames.has(f.category))]
    : fallbackCategories;

  useEffect(() => {
    if (!openCategory) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpenCategory(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openCategory]);

  return (
    <div ref={ref} className={`relative flex items-center flex-wrap ${inModal ? 'gap-1.5 px-4 py-2 border-b border-[#101214] shrink-0 z-20' : 'gap-1 ' + `px-3 py-1.5 bg-[#171a21] border-t border-[#323f4c] ${isLast ? 'rounded-b-[3px]' : ''}`}`}>
      {!inModal && <span className="text-[9px] text-[#546270] uppercase tracking-[0.07em] font-semibold mr-1 shrink-0">Guides</span>}
      {categories.map((cat) => {
        const isSingle = !cat.isCustom && cat.links.length === 1;
        const isOpen   = openCategory === cat.category;
        const chipCls  = inModal
          ? `fchip ${isOpen ? 'on' : ''}`
          : `flex items-center gap-1 text-[10px] px-1.5 py-[2px] rounded-[2px] border transition-colors bg-[#1b2838] outline-none ${isOpen ? 'text-[#66c0f4] border-[#66c0f4]/50' : 'text-[#8f98a0] border-[#2a475e] hover:text-[#66c0f4] hover:border-[#66c0f4]/50'}`;
        return (
          <div key={cat.category} className="relative shrink-0">
            {isSingle ? (
              <a href={cat.links[0].url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className={chipCls}>
                {categoryIcon(cat.category)}{cat.category}
              </a>
            ) : (
              <button onClick={e => { e.stopPropagation(); setOpenCategory(isOpen ? null : cat.category); }} className={chipCls}>
                {categoryIcon(cat.category)}{cat.category}<ChevronDown size={8} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
            )}
            {isOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 min-w-[140px] bg-[#101214] border border-[#2a475e] rounded-[3px] shadow-lg py-0.5 anim-pop">
                {cat.links.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => { e.stopPropagation(); setOpenCategory(null); }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] text-[#8f98a0] hover:text-[#66c0f4] hover:bg-[#1b2838] transition-colors whitespace-nowrap"
                  >
                    <ExternalLink size={8} className="shrink-0 opacity-60" />{link.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
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

// One compact row: icon, title, console + mode + tags, playtime · last played, count and bar.
// Tap opens the achievement sheet (badges, guides and the progression bar live there).
const GameListRow = ({ game, onViewDetails, extra = null }) => {
  const hasAch = game.achievementsTotal > 0;
  const ago = shortAgo(raDateMs(game.lastPlayedStr));
  const Tag = hasAch ? 'button' : 'div';
  return (
    <Tag onClick={hasAch ? () => onViewDetails(game) : undefined} className="grow" style={{ borderLeftColor: gameStatusColor(game) }}>
      {game.background && <div className="grow-art"><img src={game.background} alt="" loading="lazy" className={`px ${game.artIsIcon ? 'art-icon' : ''}`} /></div>}
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
        <img src={game.background || game.icon} alt="" loading="lazy" className={`bg px ${game.artIsIcon || !game.background ? 'art-icon' : ''}`} />
        <img src={game.icon} alt="" loading="lazy" className="icon px" />
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
const HeaderArt = ({ urls, icon = false }) => {
  const art = useArtSrc(urls);
  if (!art.src) return null;
  return (
    <div className="art-bg art-header">
      <img src={art.src} alt="" ref={art.ref} onLoad={art.onLoad} onError={art.onError}
        className={`${icon ? 'px art-icon' : 'px'} ${art.loaded ? 'loaded' : ''}`} />
    </div>
  );
};

// ── RAchievementModal ─────────────────────────────────────────────────────────

// Animates an element's height when its content grows or shrinks (e.g. a filter
// change). FLIP: the ResizeObserver callback runs after layout and before paint, so
// the old height is restored and transitioned to the new one with no jump.
const useAnimatedHeight = (ref, duration = 220) => {
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.ResizeObserver || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let prev = el.offsetHeight, run = 0;
    const ro = new ResizeObserver(() => {
      if (el.style.height) return;   // our own animation is resizing it
      const next = el.offsetHeight;
      if (Math.abs(next - prev) < 2) { prev = next; return; }
      const from = prev, id = ++run;
      prev = next;
      el.style.overflow = 'hidden';
      el.style.height = `${from}px`;
      void el.offsetHeight;
      el.style.transition = `height ${duration}ms cubic-bezier(0.2, 0.7, 0.3, 1)`;
      el.style.height = `${next}px`;
      setTimeout(() => {
        if (id !== run) return;
        el.style.height = el.style.transition = el.style.overflow = '';
        prev = el.offsetHeight;
      }, duration + 30);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
};

const RAchievementModal = ({ game, guides, onClose }) => {
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

  const progAchs     = game.achievements?.filter(a => a.type === 'progression' || a.type === 'win_condition') ?? [];
  const progUnlocked = progAchs.filter(a => a.isUnlocked).length;
  const progPct      = progAchs.length > 0 ? (progUnlocked / progAchs.length) * 100 : null;

  const rootRef = useRef(null);
  const dragRef = useRef(null);
  const close = useSheet({ panelRef, dragRef, rootRef, onClose });
  const art = useArtSrc([game.background]);

  return (
    <div ref={rootRef} className="sheet-root" onClick={close}>
      <div className="sheet-backdrop anim-backdrop" />

      <div ref={panelRef} className="sheet-panel" onClick={e => e.stopPropagation()}>
        <button onClick={close} className="sheet-close" aria-label="Close"><X size={15} /></button>

        {/* Header: blurred screenshot (or the zoomed icon) behind it; drag it down to close on phone */}
        <div ref={dragRef} className="sheet-head">
          {art.src && (
            <div className="art-bg art-sheet">
              <img src={art.src} alt="" ref={art.ref} onLoad={art.onLoad} onError={art.onError} className={`px ${game.artIsIcon ? 'art-icon' : ''} ${art.loaded ? 'loaded' : ''}`} />
            </div>
          )}
          <span className="sheet-grab" />
          <div className="relative flex items-end gap-4 px-4 pt-[34px] pb-4">
            <a href={`${SITE_URL}/game/${game.id}`} target="_blank" rel="noreferrer"
              className="shrink-0 w-16 h-16 rounded-[3px] overflow-hidden border-2 border-white/20 bg-[#101214] shadow-[0_6px_18px_rgba(0,0,0,0.55)] hover:scale-105 transition-transform">
              <img src={game.icon} alt={game.title} className="w-full h-full object-cover" />
            </a>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col mb-1 pr-8">
                <div className="flex items-center gap-2 flex-wrap">
                  <a href={`${SITE_URL}/game/${game.id}`} target="_blank" rel="noreferrer"
                    className="sheet-title text-[15px] md:text-[17px] font-medium text-white hover:text-[#66c0f4] transition-colors leading-tight">
                    {game.baseTitle || game.title}
                  </a>
                  {game.isSubset && (
                    <span className="text-[8px] font-bold uppercase tracking-[0.07em] px-1.5 py-[1px] rounded-[2px] border border-[rgba(229,177,67,0.3)] bg-[rgba(229,177,67,0.1)] text-[#c8a84b] shrink-0">Subset</span>
                  )}
                  {renderTildeTags(game.tags)}
                </div>
                {game.isSubset && game.subsetName && (
                  <span className="text-[10px] text-[#c8a84b] truncate">{game.subsetName}</span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap mb-2 text-[10px]">
                <span className="text-[#66c0f4] flex items-center gap-1"><Gamepad2 size={10} />{game.console}</span>
                <span className="text-[#546270]">·</span>
                {!game.achievementsUnlocked ? null : game.hardcore ? (
                  <span className="shrink-0 text-[9px] text-[#ff6b6b] border border-[#ff6b6b]/30 bg-[#101214]/60 px-1.5 py-[1px] rounded-sm font-semibold uppercase tracking-wider flex items-center gap-1"><Flame size={10} /> Hardcore</span>
                ) : (
                  <span className="shrink-0 text-[9px] text-[#8f98a0] border border-[#323f4c] bg-[#101214]/60 px-1.5 py-[1px] rounded-sm font-semibold uppercase tracking-wider flex items-center gap-1"><Feather size={10} /> Softcore</span>
                )}
                {game.isMastered && (
                  <span className="shrink-0 text-[9px] text-[#101214] bg-[#e5b143] px-1.5 py-[1px] rounded-sm font-bold uppercase tracking-wider flex items-center gap-1"><Trophy size={10} /> Mastered</span>
                )}
                {game.isBeaten && !game.isMastered && (
                  <span className="shrink-0 text-[9px] text-[#c6d4df] bg-[#2a3440] px-1.5 py-[1px] rounded-sm font-bold uppercase tracking-wider border border-[#b8c4ce]/30 flex items-center gap-1"><Medal size={10} /> Beaten</span>
                )}
              </div>
              {/* Progress bars */}
              <div className="flex flex-col gap-1">
                {progPct !== null && (
                  <div className="flex items-center gap-2">
                    <span className="w-[64px] shrink-0 text-[10px] text-[#546270] text-right">Progression</span>
                    <div className="flex-1 bg-[#101214] h-[3px] rounded-sm overflow-hidden">
                      <div className="h-full rounded-sm bg-[#e5b143]" style={{ width: `${progPct}%` }} />
                    </div>
                    <span className="text-[9px] text-[#e5b143] shrink-0">{progUnlocked}/{progAchs.length}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="w-[64px] shrink-0 text-[10px] text-[#546270] text-right">Overall</span>
                  <div className="flex-1 bg-[#101214] h-[3px] rounded-sm overflow-hidden">
                    <div className={`h-full rounded-sm ${game.isMastered ? 'bg-[#e5b143]' : 'bg-[#66c0f4]'}`} style={{ width: `${game.rawProgress}%` }} />
                  </div>
                  <span className="text-[9px] text-[#8f98a0] shrink-0">
                    <span className="text-[#c6d4df]">{game.achievementsUnlocked}</span>/{game.achievementsTotal}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Game meta row */}
        {(game.genre || game.developer || game.released) && (
          <div className="flex items-center gap-2 px-4 py-1.5 border-b border-[#101214] flex-wrap shrink-0">
            {game.genre    && <span className="text-[9px] text-[#8f98a0] flex items-center gap-1"><Gamepad2 size={9} className="text-[#546270]" />{game.genre}</span>}
            {game.genre    && (game.developer || game.released) && <span className="text-[#323f4c] text-[9px]">·</span>}
            {game.developer && <span className="text-[9px] text-[#8f98a0] flex items-center gap-1"><BarChart2 size={9} className="text-[#546270]" />{game.developer}</span>}
            {game.developer && game.released && <span className="text-[#323f4c] text-[9px]">·</span>}
            {game.released  && <span className="text-[9px] text-[#8f98a0]">{game.released}</span>}
          </div>
        )}

        {/* Guides (moved here from the game cards) */}
        <GuideStrip game={game} guides={guides} inModal />

        {/* Filters: status (one of three), then the type toggles; tap an active type again to clear it */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#101214] shrink-0">
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

const ActivityTab = ({ achievements, refTime, heatmapData, loadedChunks, totalChunks, hasMore, loadingMore, onLoadMore }) => {
  const [selectedDay, setSelectedDay] = useState(null);
  const [collapsedDays, setCollapsedDays] = useState(new Set());

  const sentinelRef = useRef(null);
  const heatmapScrollRef = useRef(null);
  const heatmapKeys = Object.keys(heatmapData).length;
  useEffect(() => {
    if (!heatmapScrollRef.current || heatmapKeys === 0) return;
    requestAnimationFrame(() => { heatmapScrollRef.current.scrollLeft = heatmapScrollRef.current.scrollWidth; });
  }, [heatmapKeys]);
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

  const toggleDay = (day) => setCollapsedDays(prev => {
    const next = new Set(prev);
    next.has(day) ? next.delete(day) : next.add(day);
    return next;
  });

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

  return (
    <div className="flex flex-col gap-6 anim-fade">

      {/* ── Heatmap ── */}
      <div>
        <div className="flex items-center gap-2 border-b border-[#2a475e] pb-1.5 mb-3">
          <span className="w-[3px] h-[14px] bg-[#66c0f4] rounded-[1px] shrink-0"></span>
          <span className="text-[13px] text-white tracking-wide uppercase font-medium flex items-center gap-2"><Activity size={15} className="text-[#66c0f4]" /> Activity</span>
          <span className="text-[10px] text-[#546270] ml-auto" title="Days and times are shown in your timezone">{TZ}</span>
          <span className="text-[10px] text-[#546270] hidden sm:block">· {loadedChunks < totalChunks ? `~${loadedChunks * 3} months` : '1 year'} · {achievements.length} achievements · click a day to filter</span>
          <span className="text-[10px] text-[#546270] ml-auto sm:hidden">{achievements.length} achievements</span>
        </div>

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
            <div className="flex items-center gap-1 mt-2" style={{ paddingLeft: '28px' }}>
              <span className="text-[8px] text-[#546270]">Less</span>
              {['#101214','#1a4a70','#2a6b9e','#66c0f4','#e5b143'].map(c => (
                <div key={c} style={{ width: '10px', height: '10px', borderRadius: '1px', background: c, flexShrink: 0 }} />
              ))}
              <span className="text-[8px] text-[#546270]">More</span>
              <span className="text-[8px] text-[#e5b143] ml-2">● peak</span>
              {selectedDay && (
                <button onClick={() => setSelectedDay(null)} className="ml-auto text-[10px] text-[#66c0f4] hover:text-[#c6d4df] anim-fade">
                  Clear filter ×
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div>
        <div className="flex items-center gap-2 border-b border-[#2a475e] pb-1.5 mb-3">
          <span className="w-[3px] h-[14px] bg-[#e5b143] rounded-[1px] shrink-0"></span>
          <span className="text-[13px] text-white tracking-wide uppercase font-medium flex items-center gap-2"><Trophy size={15} className="text-[#e5b143]" /> Recent Unlocks</span>
          <span className="text-[10px] text-[#546270] ml-auto">
            {selectedDay
              ? `${fmtDay(selectedDay)} · ${dayMap[selectedDay]?.count || 0} achievements`
              : loadedChunks < totalChunks
              ? `Last ~${loadedChunks * 3} months · ${achievements.length} loaded`
              : `${achievements.length} total`}
          </span>
        </div>

        {selectedDay && heatmapData[selectedDay] && !dayMap[selectedDay] ? (
          <div className="flex flex-col gap-2 py-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-[2px] border border-[#2a475e] bg-[#1b2838]">
                <div className="shimmer w-8 h-8 rounded-[2px] flex-shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="shimmer h-2.5 w-3/4 rounded" />
                  <div className="shimmer h-2 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : timelineGroups.length === 0 ? (
          <div key={selectedDay ?? 'all'} className="text-[#8f98a0] text-[11px] py-4 italic text-center anim-fade">
            {selectedDay ? 'No achievements on this day.' : 'No achievements unlocked in the last 180 days.'}
          </div>
        ) : (
          <div className="flex flex-col gap-0">
            {timelineGroups.map(({ day, dayPts, achCount, sessions }) => {
              const isCollapsed = collapsedDays.has(day);
              return (
              <div key={`${selectedDay}-${day}`} className="mb-4 anim-fade">
                {/* Day header — clickable to collapse */}
                <button onClick={() => toggleDay(day)} className="w-full flex items-center gap-2 mb-2 group outline-none">
                  <div className="w-2 h-2 rounded-full bg-[#2a475e] border border-[#66c0f4] shrink-0"></div>
                  <span className="text-[10px] text-[#66c0f4] font-semibold group-hover:text-[#c6d4df] transition-colors">{fmtDay(day)}</span>
                  <div className="flex-1 h-px bg-[#2a475e] opacity-40"></div>
                  <span className="text-[9px] text-[#546270]">+{dayPts} pts · {achCount} achievement{achCount !== 1 ? 's' : ''}</span>
                  <ChevronDown size={11} className={`text-[#546270] transition-transform duration-200 shrink-0 ${isCollapsed ? '' : 'rotate-180'}`} />
                </button>

                {/* Sessions — hidden when collapsed */}
                {!isCollapsed && sessions.map((session, si) => (
                  <div key={si} className="ml-4 border-l border-[#2a475e] pl-3 mb-3 anim-fade">
                    {/* Session label */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <a href={`${SITE_URL}/game/${session.gameId}`} target="_blank" rel="noreferrer" className="w-4 h-4 rounded-[1px] overflow-hidden border border-[#101214] bg-black block hover:scale-110 transition-transform shrink-0">
                        <img src={session.gameIcon} alt="" className="w-full h-full object-cover" />
                      </a>
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {(() => { const p = parseTitle(session.gameTitle); return (<>
                          <a href={`${SITE_URL}/game/${session.gameId}`} target="_blank" rel="noreferrer" className="text-[11px] text-[#c6d4df] hover:text-[#66c0f4] transition-colors font-medium truncate">
                            {p.baseTitle}
                          </a>
                          {p.isSubset && (
                            <>
                              <span className="text-[7px] font-bold uppercase tracking-[0.07em] px-1 py-[1px] rounded-[2px] border border-[rgba(229,177,67,0.3)] bg-[rgba(229,177,67,0.1)] text-[#c8a84b] shrink-0">Subset</span>
                              <span className="text-[8px] text-[#c8a84b] truncate">{p.subsetName}</span>
                            </>
                          )}
                          {!p.isSubset && renderTildeTags(p.tags)}
                        </>); })()}
                        <span className="text-[8px] text-[#546270] shrink-0">· {session.consoleName}</span>
                      </div>
                      <span className="text-[8px] text-[#546270] shrink-0 ml-auto">{fmtTime(session.startTime)}{session.startTime !== session.endTime ? `–${fmtTime(session.endTime)}` : ''}</span>
                    </div>

                    {/* Achievements in session */}
                    <div className="flex flex-col gap-1">
                      {[...session.achievements].sort((a,b) => b.date.localeCompare(a.date)).map((ach, ai) => {
                        const ratio = ach.trueRatio && ach.points ? ach.trueRatio / ach.points : null;
                        return (
                          <div key={ai} className={`flex items-center gap-2 p-2 rounded-[2px] border border-[#2a475e] border-l-[2px] ${ach.hardcoreMode ? 'border-l-[#e5b143] bg-[#202d39]' : 'border-l-[#8f98a0] bg-[#1b2838]'} hover:bg-[#2a475e] transition-colors`}>
                            <a href={`${SITE_URL}/achievement/${ach.achievementId}`} target="_blank" rel="noreferrer" className="shrink-0 w-8 h-8 rounded-[2px] overflow-hidden border border-[#101214] bg-black block hover:scale-105 transition-transform">
                              <img src={`${MEDIA_URL}/Badge/${ach.badgeName}.png`} alt={ach.title} className="w-full h-full object-cover" />
                            </a>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                <a href={`${SITE_URL}/achievement/${ach.achievementId}`} target="_blank" rel="noreferrer" className={`text-[11px] font-medium hover:underline truncate ${ach.hardcoreMode ? 'text-[#e5b143]' : 'text-[#c6d4df]'}`}>
                                  {ach.title}
                                </a>
                                <span className="text-[9px] font-bold text-[#66c0f4] bg-[#101214] border border-[#323f4c] px-1.5 py-[1px] rounded-sm shrink-0">{ach.points} pts</span>
                                {ratio > 0 && <span className="text-[9px] shrink-0" style={{ color: ratio >= 30 ? '#ff6b6b' : ratio >= 20 ? '#e5b143' : ratio >= 10 ? '#66c0f4' : '#8f98a0' }}>×{ratio.toFixed(1)}</span>}
                                {ach.type === 'progression' && (
                                  <span className="pop-wrap">
                                    <Trophy size={11} className="text-[#e5b143]" />
                                    <span className="pop-box">
                                      <div className="pop-name" style={{color:'#e5b143'}}>Progression</div>
                                      <div className="pop-sub">Required to complete the game</div>
                                    </span>
                                  </span>
                                )}
                                {ach.type === 'win_condition' && (
                                  <span className="pop-wrap">
                                    <Crown size={11} className="text-[#ff6b6b]" />
                                    <span className="pop-box">
                                      <div className="pop-name" style={{color:'#ff6b6b'}}>Win Condition</div>
                                      <div className="pop-sub">Triggers game completion</div>
                                    </span>
                                  </span>
                                )}
                                {ach.type === 'missable' && (
                                  <span className="pop-wrap">
                                    <AlertTriangle size={11} className="text-[#ff9800]" />
                                    <span className="pop-box">
                                      <div className="pop-name" style={{color:'#ff9800'}}>Missable</div>
                                      <div className="pop-sub">Can be permanently missed</div>
                                    </span>
                                  </span>
                                )}
                              </div>
                              <p className="text-[9px] text-[#8f98a0] truncate">{ach.description}</p>
                            </div>
                            <span className="text-[9px] text-[#546270] shrink-0">{fmtTime(ach.date)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              );
            })}
          </div>
        )}

        {/* ── Load-more sentinel ── */}
        {!selectedDay && (
          hasMore ? (
            <div ref={sentinelRef} className="flex flex-col gap-2 mt-4">
              {loadingMore ? (
                <>
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-[2px] border border-[#2a475e] bg-[#1b2838]">
                      <div className="shimmer w-8 h-8 rounded-[2px] flex-shrink-0" />
                      <div className="flex-1 flex flex-col gap-1.5">
                        <div className="shimmer h-2.5 w-3/4 rounded" />
                        <div className="shimmer h-2 w-1/2 rounded" />
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-2 text-[11px] text-[#546270]">
                  Showing ~{loadedChunks * 3} of 12 months — scroll to load more
                </div>
              )}
            </div>
          ) : achievements.length > 0 ? (
            <div className="text-center py-3 mt-2 border-t border-[#1e2a35] text-[11px] text-[#546270] anim-fade">
              {achievements.length} achievements · all 12 months loaded
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
    <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 w-full flex-1">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 mb-8">
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

const ActivitySkeleton = () => (
  <div className="flex flex-col gap-6">
    {/* Heatmap */}
    <div>
      <div className="flex items-center gap-2 border-b border-[#2a475e] pb-1.5 mb-3">
        <div className="shimmer w-[3px] h-[14px] rounded-[1px]" />
        <Sk w="w-24" h="h-3.5" /><Sk w="w-48" h="h-2.5" cls="ml-auto" />
      </div>
      <div className="shimmer w-full h-[96px] rounded-[2px]" />
    </div>
    {/* Timeline */}
    <div>
      <div className="flex items-center gap-2 border-b border-[#2a475e] pb-1.5 mb-3">
        <div className="shimmer w-[3px] h-[14px] rounded-[1px]" />
        <Sk w="w-32" h="h-3.5" />
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="mb-4">
          <div className="flex items-center gap-2 mb-2"><div className="shimmer w-2 h-2 rounded-full" /><Sk w="w-32" h="h-2.5" /></div>
          <div className="ml-4 border-l border-[#2a475e] pl-3 flex flex-col gap-1.5">
            {[...Array(2)].map((_, j) => (
              <div key={j} className="flex items-center gap-2 p-2 bg-[#1b2838] border border-[#2a475e] rounded-[2px]">
                <div className="shimmer w-8 h-8 rounded-[2px] flex-shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5"><Sk w="w-3/4" h="h-2.5" /><Sk w="w-1/2" h="h-2" /></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// SeriesProgressTab
// ─────────────────────────────────────────────────────────────────────────────

function SeriesProgressTab({ seriesData, gamesData, watchlistData }) {
  const cards = useMemo(() => {
    const visible = seriesData.filter(s => s.showProgress);

    // Build a flat icon lookup from any source we have: detailedGameProgress + watchlist
    const gameProgress = gamesData?.detailedGameProgress ?? {};
    const wlMap = Object.fromEntries((watchlistData?.results ?? []).map(g => [g.id, g]));
    const getGameInfo = (id) => gameProgress[id] ?? wlMap[id] ?? null;

    return visible.map(series => {
      const total = series.gameIds.length;

      let tracked = 0, inProgress = 0, mastered = 0;
      let pointsEarned = 0, pointsTotal = 0;
      let achEarned = 0, achTotal = 0;
      let latestAch = null; // { title, gameTitle, date }
      const icons = [];

      const iconsNoAch = [];
      series.gameIds.forEach(id => {
        const g  = gameProgress[id];
        const wl = wlMap[id];

        const numAchs = g?.numAchievements ?? wl?.achievementsPublished ?? 0;
        const hasAch  = numAchs > 0;

        if (hasAch) {
          tracked++;
          // Points total: sum from achievement data if available, else watchlist pointsTotal
          if (g?.achievements) {
            Object.values(g.achievements).forEach(a => {
              pointsTotal += a.points ?? 0;
              achTotal++;
              if (a.dateEarned) {
                pointsEarned += a.points ?? 0;
                achEarned++;
                if (!latestAch || toMs(a.dateEarned) > toMs(latestAch.date)) {
                  latestAch = { title: a.title, badgeName: a.badgeName, achId: a.id, gameTitle: g.title, gameId: id, date: a.dateEarned };
                }
              }
            });
          } else if (wl) {
            if (wl.pointsTotal)           pointsTotal += wl.pointsTotal;
            if (wl.achievementsPublished) achTotal    += wl.achievementsPublished;
          }

          if (g) {
            const numAwarded = g.numAwardedToUser ?? 0;
            if (numAwarded === g.numAchievements) mastered++;
            else if (numAwarded > 0)              inProgress++;
          }
        }

        const imageIcon    = g?.imageIcon ?? wl?.imageIcon ?? null;
        const title        = g?.title ?? wl?.title ?? String(id);
        const isMastered   = hasAch && g && g.numAwardedToUser === g.numAchievements && g.numAchievements > 0;
        const isInProgress = hasAch && g && g.numAwardedToUser > 0 && !isMastered;
        const lastUnlockDate = (isMastered || isInProgress) && g?.achievements
          ? Math.max(...Object.values(g.achievements).filter(a => a.dateEarned).map(a => toMs(a.dateEarned)))
          : 0;
        const sortBucket = isMastered ? 0 : isInProgress ? 1 : hasAch ? 2 : 3;
        if (imageIcon) {
          const entry = { id, icon: getMediaUrl(imageIcon), title, hasAch, isMastered, lastUnlockDate, sortBucket };
          if (hasAch) icons.push(entry);
          else        iconsNoAch.push(entry);
        }
      });
      const allIcons = [...icons, ...iconsNoAch].sort((a, b) => {
        if (a.sortBucket !== b.sortBucket) return a.sortBucket - b.sortBucket;
        if (a.sortBucket <= 1) return b.lastUnlockDate - a.lastUnlockDate;
        return a.title.localeCompare(b.title);
      });

      // Cover game: explicitly set, or fall back to first game in series
      // Check both detailedGameProgress and watchlist so unplayed games still resolve
      const coverId   = series.coverGameId ?? series.gameIds[0];
      const coverGame = getGameInfo(coverId);
      const coverBg   = coverGame
        ? getMediaUrl(raShot(coverGame.imageIngame, coverGame.imageTitle) || coverGame.imageIcon)
        : null;
      const coverIcon = coverGame ? getMediaUrl(coverGame.imageIcon) : null;

      return { series, total, tracked, inProgress, mastered, pointsEarned, pointsTotal, achEarned, achTotal, latestAch, icons: allIcons, coverBg, coverIcon, coverId };
    }).sort((a, b) => {
      const key = n => /^[a-zA-Z]/.test(n) ? '2' + n.toLowerCase() : /^\d/.test(n) ? '1' + n.toLowerCase() : '0' + n.toLowerCase();
      return key(a.series.name).localeCompare(key(b.series.name));
    });
  }, [seriesData, gamesData, watchlistData]);

  if (cards.length === 0) {
    return (
      <div className="text-center py-12 text-[#546270] text-[12px] anim-fade">
        No series flagged for progress tracking yet.<br />
        <span className="text-[11px]">Enable <strong className="text-[#8f98a0]">📊 Progress</strong> on a series in the admin panel.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 anim-fade">
      {cards.map(({ series, total, tracked, inProgress, mastered, pointsEarned, pointsTotal, achEarned, achTotal, latestAch, icons, coverBg, coverIcon, coverId }) => {
        const achPct = achTotal > 0 ? (achEarned / achTotal) * 100 : 0;
        const ICON_LIMIT   = 8;
        const shownIcons   = icons.slice(0, ICON_LIMIT);
        const extraIcons   = icons.length - ICON_LIMIT;
        const latestAchTimeAgo = latestAch ? formatTimeAgo(latestAch.date) : null;

        return (
          <div key={series.id} className="flex flex-col bg-[#202d39] rounded-[3px] border-l-[3px] border border-[#323f4c] shadow-md overflow-hidden" style={{ borderLeftColor: '#e5b143' }}>

            {/* Top section: bg image + cover icon + title (game card header style) */}
            <div className="relative flex flex-row p-3 gap-3 md:gap-4 items-center min-h-[90px] overflow-hidden rounded-t-[3px]">
              {/* Background image */}
              {coverBg && (
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-t-[3px]">
                  <img src={coverBg} alt="" className="absolute right-0 top-0 h-full w-full md:w-1/2 object-cover opacity-[0.55] object-center mix-blend-screen mask-fade" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#202d39] via-[#202d39]/95 to-transparent" />
                </div>
              )}

              {/* Cover icon */}
              <a href={`${SITE_URL}/game/${coverId}`} target="_blank" rel="noreferrer"
                className="relative z-10 shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-[2px] shadow-sm border border-[#101214] overflow-hidden bg-[#101214] hover:scale-105 transition-transform">
                {coverIcon
                  ? <img src={coverIcon} alt={series.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-[#172333] flex items-center justify-center text-[#546270] text-[20px]">🗂</div>
                }
              </a>

              {/* Title + points */}
              <div className="relative z-10 flex-1 flex flex-col justify-center min-w-0 gap-1">
                <span className="text-[15px] md:text-base text-white font-medium tracking-wide drop-shadow-sm truncate">{series.name}</span>
                {pointsTotal > 0 && (
                  <span className="text-[11px] text-[#e5b143] font-medium tabular-nums drop-shadow-sm">
                    {pointsEarned.toLocaleString()} <span className="text-[#8f98a0] font-normal">/ {pointsTotal.toLocaleString()} pts</span>
                  </span>
                )}
                {latestAch && (
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="shrink-0 w-3.5 h-3.5 rounded-[1px] overflow-hidden border border-[#101214] bg-black block">
                      <img src={`${MEDIA_URL}/Badge/${latestAch.badgeName}.png`} alt="" className="w-full h-full object-cover" />
                    </span>
                    <a href={`${SITE_URL}/achievement/${latestAch.achId}`} target="_blank" rel="noreferrer"
                      className="text-[9px] text-[#8f98a0] hover:text-[#c6d4df] truncate transition-colors">{latestAch.title}</a>
                    <span className="text-[9px] text-[#546270] shrink-0">in</span>
                    <a href={`${SITE_URL}/game/${latestAch.gameId}`} target="_blank" rel="noreferrer"
                      className="text-[9px] text-[#66c0f4] hover:text-[#c6d4df] truncate transition-colors">{latestAch.gameTitle}</a>
                    <span className="text-[9px] text-[#546270] shrink-0">at {latestAchTimeAgo}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="px-3 pb-3 pt-2 border-t border-[#2a475e]">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-[#8f98a0] border border-[#323f4c] bg-[#101214]/60 px-1.5 py-[1px] rounded-sm">{total} games</span>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-[#c6d4df] border border-[#323f4c] bg-[#101214]/60 px-1.5 py-[1px] rounded-sm">{tracked} tracked</span>
                  {inProgress > 0 && <span className="text-[9px] font-semibold uppercase tracking-wider text-[#66c0f4] border border-[#66c0f4]/30 bg-[#101214]/60 px-1.5 py-[1px] rounded-sm">{inProgress} in progress</span>}
                  {mastered > 0 && <span className="text-[9px] font-bold uppercase tracking-wider text-[#101214] bg-[#e5b143] px-1.5 py-[1px] rounded-sm">{mastered} mastered</span>}
                </div>
                <span className="text-[10px] text-[#8f98a0] tabular-nums shrink-0">{achEarned.toLocaleString()} / {achTotal.toLocaleString()}</span>
                <span className="text-[10px] font-semibold tabular-nums shrink-0" style={{ color: achPct > 0 ? '#e5b143' : '#546270' }}>
                  {achPct.toFixed(2)}%
                </span>
              </div>
              <div className="h-[7px] bg-[#101214] rounded-full overflow-hidden border border-[#0a0f14]">
                <div style={{ width: `${achPct}%`, background: achPct === 100 ? 'linear-gradient(90deg,#e5b143,#f0c96a)' : '#e5b143' }}
                  className="h-full rounded-full transition-all" />
              </div>
            </div>

            {/* Icon strip */}
            {shownIcons.length > 0 && (
              <div className="flex items-center gap-1 px-3 pb-2.5 flex-wrap border-t border-[#2a475e] pt-2.5">
                {shownIcons.map(g => (
                  <a key={g.id} href={`${SITE_URL}/game/${g.id}`} target="_blank" rel="noreferrer"
                    className={`shrink-0 w-8 h-8 rounded-[2px] overflow-hidden bg-black hover:scale-110 transition-transform block ${g.isMastered ? 'border-2 border-[#e5b143]' : 'border border-[#101214]'}`}>
                    <img src={g.icon} alt={g.title} className={`w-full h-full object-cover ${g.hasAch ? '' : 'brightness-[0.35] grayscale'}`} />
                  </a>
                ))}
                {extraIcons > 0 && (
                  <span className="text-[10px] text-[#546270] ml-1 shrink-0">+{extraIcons}</span>
                )}
              </div>
            )}

          </div>
        );
      })}
    </div>
  );
}

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
  const [awardsExpanded, setAwardsExpanded] = useState(false);
  const iconGridCols = useIconGridCols();
  const iconLimit = iconGridCols * 2;
  const [selectedGame, setSelectedGame] = useState(null);
  const [guidesData, setGuidesData] = useState({});
  const [seriesData, setSeriesData] = useState([]);
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

  // ── Fetch profile.json + watchlist.json + guides.json on mount ──
  useEffect(() => {
    fetch('../../data/ra/profile.json')
      .then(r => { if (!r.ok) throw new Error('Failed to load profile.json'); return r.json(); })
      .then(data => { setProfileData(data); setLoadingProfile(false); })
      .catch(err => { setError(err.message); setLoadingProfile(false); });
    fetch('../../data/ra/watchlist.json')
      .then(r => r.ok ? r.json() : { total: 0, results: [] })
      .then(data => setWatchlistData(data))
      .catch(() => setWatchlistData({ total: 0, results: [] }));
    fetch('../../data/ra/guides.json')
      .then(r => r.ok ? r.json() : {})
      .then(data => setGuidesData(data))
      .catch(() => {});
    fetch('../../data/ra/series.json')
      .then(r => r.ok ? r.json() : [])
      .then(data => setSeriesData(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setSeriesLoaded(true));
  }, []);

  // ── Load all achievement chunks when Activity tab is opened ──
  useEffect(() => {
    if (activeTab !== 'activity') return;
    if (achievementChunks[0] === null && loadingChunkIdx === null) loadAllChunks();
  }, [activeTab]);

  // ── Fetch games.json when Recent or Progress tab is opened ─
  useEffect(() => {
    if (['recent', 'progress', 'series'].includes(activeTab) && !gamesData && !loadingGames) {
      setLoadingGames(true);
      fetch('../../data/ra/games.json')
        .then(r => { if (!r.ok) throw new Error('Failed to load games.json'); return r.json(); })
        .then(data => { setGamesData(data); setLoadingGames(false); })
        .catch(err => { console.error(err); setLoadingGames(false); setGamesFailed(true); });
    }
  }, [activeTab]);

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
      detailedGameProgress: gamesData?.detailedGameProgress ?? {},
    };
  }, [profileData, watchlistData, gamesData]);

  const { profile: PROFILE_DATA, games: ALL_GAMES, backlog: BACKLOG } = useMemo(() => transformData(rawData), [rawData]);

  // Header background: the most recently played game's screenshot, or its icon when it has none
  const latestGame = profileData?.recentlyPlayedGames?.[0];
  const latestShot = latestGame ? raShot(latestGame.imageIngame, latestGame.imageTitle) : null;
  const headerArt  = { url: latestGame ? getMediaUrl(latestShot || latestGame.imageIcon) : null, icon: !!latestGame && !latestShot };

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Swipe between tabs on phones (assets/tabs.js); the order follows the tab bar
  const hasSeries = seriesData.some(s => s.showProgress);
  const tabIds = ['overview', 'recent', 'progress', ...(hasSeries ? ['series'] : []), 'activity', 'backlog'];
  const [swipeDir, setSwipeDir] = useSwipeTabs(tabContentRef, tabIds, activeTab, setTab, !loadingProfile && !!PROFILE_DATA);
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
          const getProg = g => {
            const achs = g.achievements.filter(a => a.type === 'progression' || a.type === 'win_condition');
            return achs.length > 0 ? achs.filter(a => a.isUnlocked).length / achs.length : -1;
          };
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
        <HeaderArt urls={[headerArt.url]} icon={headerArt.icon} />
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

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 flex-1 w-full anim-in">
        
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
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-8">
          
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
                      <GameListRow game={g} onViewDetails={setSelectedGame}
                        extra={PROFILE_DATA.richPresenceMsg && <span className="grow-extra rp" title="Rich presence: what the game reports you're doing"><Radio size={11} className="text-[#57cbde]" />{PROFILE_DATA.richPresenceMsg}</span>} />
                    );
                  })()}
                </div>

                {/* Most Recently Unlocked Achievement */}
                <div>
                  <h2 className="text-[13px] text-white tracking-wide uppercase font-medium border-b border-[#2a475e] pb-1.5 flex items-center gap-2 mb-3">
                    <span className="w-[3px] h-[14px] bg-[#e5b143] rounded-[1px] shrink-0"></span>
                    <Trophy size={15} className="text-[#e5b143]"/> Most Recently Unlocked
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
                </div>

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

              </div>

              <div className="flex flex-col gap-5">
            
                <div className="bg-[#1b2838] border border-[#2a475e] rounded-[3px] shadow-sm h-fit">
                  <div className="p-2.5 bg-[#172333] border-b border-[#2a475e] rounded-t-[2px] text-[#c6d4df] flex items-center gap-2">
                    <span className="w-[2px] h-[12px] bg-[#e5b143] rounded-[1px] shrink-0"></span>
                    <span className="text-[11px] uppercase tracking-wide font-semibold flex items-center gap-2 flex-1">
                      <Star size={13} className="text-[#e5b143]" /> Game Awards
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Trophy size={9} className="text-[#e5b143]" />
                      <span className="text-[10px] font-semibold text-[#e5b143]">{PROFILE_DATA.gameAwards.filter(a => a.type === 'Mastery/Completion').length}</span>
                      <Medal size={9} className="text-[#b8c4ce]" />
                      <span className="text-[10px] font-semibold text-[#b8c4ce]">{PROFILE_DATA.gameAwards.filter(a => a.type !== 'Mastery/Completion').length}</span>
                    </div>
                  </div>
                  <div className="p-3 grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-2 min-h-[60px]">
                    {PROFILE_DATA.gameAwards.length > 0 ? (awardsExpanded ? PROFILE_DATA.gameAwards : PROFILE_DATA.gameAwards.slice(0, iconLimit)).map(award => (
                      <div key={award.id} className="relative group cursor-help anim-fade">
                        <img
                          src={award.icon}
                          alt={award.title}
                          className={`w-full aspect-square rounded-[2px] border transition-all duration-200 bg-black relative z-10 group-hover:scale-110 ${award.type === 'Mastery/Completion' ? 'border-2 border-[#e5b143]' : 'border border-[#b8c4ce]'}`}
                        />

                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[200px] bg-[#1b2838] border border-[#2a475e] rounded-[2px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] shadow-xl pointer-events-none overflow-hidden">
                          {/* Gold accent line */}
                          <div className="h-[2px] bg-gradient-to-r from-[#e5b143] to-[#e5b143]/20"></div>
                          {/* Header */}
                          <div className="flex items-center gap-2 px-2.5 py-2 border-b border-[#2a475e] bg-[#172333]">
                            <img src={award.icon} alt="" className="w-8 h-8 rounded-[2px] border border-[#e5b143]/30 bg-black shrink-0" />
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-[11px] text-white font-semibold leading-tight">{award.baseTitle || award.title}</span>
                                {award.isSubset && <span className="text-[8px] font-bold uppercase tracking-[0.07em] px-1.5 py-[1px] rounded-[2px] border border-[rgba(229,177,67,0.3)] bg-[rgba(229,177,67,0.1)] text-[#c8a84b] shrink-0">Subset</span>}
                                {!award.isSubset && renderTildeTags(award.tags)}
                              </div>
                              {award.isSubset && award.subsetName && <span className="text-[9px] text-[#c8a84b] truncate">{award.subsetName}</span>}
                            </div>
                          </div>
                          {/* Body */}
                          <div className="px-2.5 py-2 flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-[#546270]">Console</span>
                              <span className="text-[9px] text-[#66c0f4] font-medium">{award.console}</span>
                            </div>
                            <div className="h-px bg-[#2a475e]"></div>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-[#546270]">Award</span>
                              {award.type === 'Mastery/Completion'
                                ? <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded-[2px] bg-[#e5b143] text-[#101214]">Mastered</span>
                                : <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded-[2px] bg-[#2a3440] text-[#c6d4df] border border-[#b8c4ce]/30">Beaten</span>
                              }
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-[#546270]">Earned</span>
                              <span className="text-[9px] text-[#c6d4df]">{award.date}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="col-span-full text-center text-[#546270] text-[10px] py-2">No game awards yet.</div>
                    )}
                  </div>
                  {PROFILE_DATA.gameAwards.length > iconLimit && (
                    <button
                      onClick={() => setAwardsExpanded(v => !v)}
                      className="w-full flex items-center justify-center gap-1 py-1.5 border-t border-[#2a475e] text-[11px] font-semibold text-[#546270] hover:text-[#c6d4df] hover:bg-[#202d39] transition-colors rounded-b-[2px] outline-none"
                    >
                      {awardsExpanded ? 'Show less' : `Show all ${PROFILE_DATA.gameAwards.length}`}
                      <ChevronDown size={11} className={`transition-transform duration-200 ${awardsExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>

              </div>
            </div>
          ) : activeTab === 'series' ? (
            !seriesLoaded || (!gamesData && !gamesFailed)
              ? <>{[...Array(3)].map((_, i) => <GameCardSkeleton key={i} />)}</>
              : <SeriesProgressTab seriesData={seriesData} gamesData={gamesData} watchlistData={watchlistData} />
          ) : activeTab === 'activity' ? (
            loadedChunkCount === 0 && loadingChunkIdx !== null
              ? <ActivitySkeleton />
              : <ActivityTab
                  achievements={allLoadedAchievements}
                  refTime={rawData?.metadata?.extractionTimestamp}
                  heatmapData={heatmapData}
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
                    ? <GameTile key={game.id} game={game} onViewDetails={setSelectedGame} />
                    : <GameListRow key={game.id} game={game} onViewDetails={setSelectedGame} />)}
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

      {selectedGame && <RAchievementModal game={selectedGame} guides={guidesData[selectedGame.id] ?? null} onClose={() => setSelectedGame(null)} />}
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
