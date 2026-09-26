import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Gamepad2, Activity, BarChart2, Award, Star, ChevronDown, AlertCircle, Trophy, Crown, Lock, Unlock, AlertTriangle, Flame, Feather, Medal, ShieldOff, CircleDashed, X, Clock, BookOpen, Youtube, ExternalLink, Layers } from 'lucide-react';
import { MEDIA_URL, SITE_URL, TILDE_TAG_COLORS } from './utils/constants.js';
import { getMediaUrl, parseTitle, formatTimeAgo } from './utils/helpers.js';
import { transformData } from './utils/transform.js';

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
const STALE_MS   = 30 * 24 * 60 * 60 * 1000;

const chipCls = (active, activeCls = 'bg-[#66c0f4] text-[#101214] border-[#66c0f4]') =>
  `text-[9px] font-semibold uppercase tracking-wider rounded-[2px] border transition-colors ${
    active ? activeCls : 'bg-[#101214] text-[#8f98a0] border-[#323f4c] hover:text-[#c6d4df] hover:border-[#546270]'
  }`;

const ProgressFilterBar = ({ view, onView, sorts, sort, onSort, completedLabel, showCompleted, onShowCompleted, count, search, onSearch }) => {
  const hint = PROGRESS_VIEWS.find(v => v.value === view)?.hint;
  return (
    <div className="flex flex-col gap-2 mb-4">
      {/* View — full-width segmented control on mobile, inline chips on desktop */}
      <div className="grid grid-cols-4 gap-1 md:flex md:items-center md:gap-1.5">
        <span className="hidden md:inline text-[9px] text-[#546270] uppercase tracking-wider mr-0.5">View</span>
        {PROGRESS_VIEWS.map(v => (
          <button key={v.value} onClick={() => onView(v.value)}
            className={`${chipCls(view === v.value)} px-1 py-[6px] leading-tight text-center md:px-2 md:py-[3px]`}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Sort + completed toggle (All view) or the view's rule, plus the game count */}
      <div className="flex items-center gap-2 min-h-[22px]">
        {view === 'all' ? (
          <>
            <span className="text-[9px] text-[#546270] uppercase tracking-wider shrink-0">Sort</span>
            <div className="hidden md:flex items-center gap-1.5">
              {sorts.map(s => (
                <button key={s.value} onClick={() => onSort(s.value)}
                  className={`${chipCls(sort === s.value, s.activeCls)} px-2 py-[3px]`}>
                  {s.label}
                </button>
              ))}
            </div>
            <select value={sort} onChange={e => onSort(e.target.value)}
              className="md:hidden bg-[#101214] border border-[#323f4c] rounded-[2px] text-[10px] text-[#c6d4df] px-1.5 py-[3px] outline-none focus:border-[#546270]"
              style={{ colorScheme: 'dark' }}>
              {sorts.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <div className="w-px h-3.5 bg-[#2a475e] mx-0.5 md:mx-1 shrink-0" />
            <button onClick={() => onShowCompleted(v => !v)}
              className={`${chipCls(showCompleted, 'bg-[#e5b143] text-[#101214] border-[#e5b143]')} px-2 py-[3px] shrink-0`}>
              {completedLabel}
            </button>
          </>
        ) : (
          <span className="text-[9px] text-[#546270] leading-snug">{hint}</span>
        )}
        <span className="ml-auto text-[9px] text-[#546270] shrink-0">{count} games</span>
      </div>

      <div className="relative">
        <input type="text" value={search} onChange={e => onSearch(e.target.value)} placeholder="Search games…"
          className="w-full bg-[#101214] border border-[#323f4c] rounded-[2px] px-2.5 py-1.5 text-[11px] text-[#c6d4df] placeholder-[#546270] outline-none focus:border-[#546270]" />
        {search && <button onClick={() => onSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#546270] hover:text-[#c6d4df] text-[10px]">×</button>}
      </div>
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

// RA dates come as "YYYY-MM-DD HH:MM:SS" (UTC) or ISO; Safari can't parse the former
const raDateMs = s => {
  if (!s) return 0;
  const t = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z').getTime();
  return Number.isNaN(t) ? 0 : t;
};


const GuideStrip = ({ game, guides, isLast }) => {
  const [openCategory, setOpenCategory] = useState(null);
  const ref = useRef(null);

  const searchTitle = encodeURIComponent(game.baseTitle || game.title);
  const categoryIcon = (cat) => {
    const c = cat.toLowerCase();
    if (c === 'videos') return <Youtube size={9} />;
    if (c === 'guides') return <BookOpen size={9} />;
    return <ExternalLink size={9} />;
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
    <div ref={ref} className={`relative flex items-center gap-1 px-3 py-1.5 bg-[#171a21] border-t border-[#323f4c] flex-wrap ${isLast ? 'rounded-b-[3px]' : ''}`}>
      <span className="text-[9px] text-[#546270] uppercase tracking-[0.07em] font-semibold mr-1 shrink-0">Guides</span>
      {categories.map((cat) => {
        const isSingle = !cat.isCustom && cat.links.length === 1;
        const isOpen   = openCategory === cat.category;
        const chipCls  = `flex items-center gap-1 text-[10px] px-1.5 py-[2px] rounded-[2px] border transition-colors bg-[#1b2838] outline-none ${isOpen ? 'text-[#66c0f4] border-[#66c0f4]/50' : 'text-[#8f98a0] border-[#2a475e] hover:text-[#66c0f4] hover:border-[#66c0f4]/50'}`;
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
              <div className="absolute top-full left-0 mt-1 z-50 min-w-[140px] bg-[#101214] border border-[#2a475e] rounded-[3px] shadow-lg py-0.5">
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

const GameCard = ({ game, onViewDetails, guides }) => {
  const stripeColor = game.isMastered
    ? 'border-l-[#e5b143]'
    : game.isBeaten
    ? 'border-l-[#b8c4ce]'
    : game.achievementsUnlocked > 0
    ? 'border-l-[#66c0f4]'
    : game.achievementsTotal > 0
    ? 'border-l-[#323f4c]'
    : 'border-l-[#1e2a35]';

  const hasAchievements = game.achievementsTotal > 0;

  const previewAchs = useMemo(() => {
    if (!game.achievements) return [];
    const unlocked = game.achievements
      .filter(a => a.isUnlocked)
      .sort((a, b) => new Date(b.unlockDate || 0) - new Date(a.unlockDate || 0));
    const locked = game.achievements.filter(a => !a.isUnlocked);
    return [...unlocked, ...locked].slice(0, 6);
  }, [game.achievements]);

  return (
    <div className={`flex flex-col bg-[#202d39] rounded-[3px] transition-transform duration-200 hover:-translate-y-0.5 border-l-[3px] border border-[#323f4c] shadow-md ${stripeColor}`}>

      <div className="relative flex flex-row p-3 gap-3 md:gap-4 items-center min-h-[90px] z-10 overflow-hidden rounded-t-[3px]">

        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-t-[3px]">
          <img 
            src={game.background} 
            alt="" 
            className="absolute right-0 top-0 h-full w-full md:w-1/2 object-cover opacity-[0.55] object-center mix-blend-screen mask-fade" 
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#202d39] via-[#202d39]/95 to-transparent"></div>
        </div>

        <a href={`${SITE_URL}/game/${game.id}`} target="_blank" rel="noreferrer" className="relative z-10 shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-[2px] shadow-sm border border-[#101214] overflow-hidden bg-[#101214] hover:scale-105 transition-transform">
           <img src={game.icon} alt={game.title} className="w-full h-full object-cover" />
        </a>

        <div className="relative z-10 flex-1 flex flex-col justify-center min-w-0">

          <div className="flex flex-col mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <a href={`${SITE_URL}/game/${game.id}`} target="_blank" rel="noreferrer" className="text-[15px] md:text-base text-white font-medium tracking-wide drop-shadow-sm hover:text-[#66c0f4] transition-colors">
                {game.baseTitle || game.title}
              </a>
              {game.isSubset && (
                <span className="text-[8px] font-bold uppercase tracking-[0.07em] px-1.5 py-[1px] rounded-[2px] border border-[rgba(229,177,67,0.3)] bg-[rgba(229,177,67,0.1)] text-[#c8a84b] shrink-0">
                  Subset
                </span>
              )}
              {renderTildeTags(game.tags)}
            </div>
            {game.isSubset && game.subsetName && (
              <span className="text-[10px] text-[#c8a84b] truncate">{game.subsetName}</span>
            )}
          </div>

          <div className="text-[11px] text-[#66c0f4] mb-1.5 flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 shrink-0"><Gamepad2 size={12} /> {game.console}</span>
            <span className="text-[#546270] shrink-0">|</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              
              {!hasAchievements ? (
                <span className="shrink-0 text-[9px] text-[#546270] border border-[#323f4c] bg-[#101214]/60 px-1.5 py-[1px] rounded-sm font-semibold uppercase tracking-wider flex items-center gap-1">
                  <ShieldOff size={10} /> No Achievements
                </span>
              ) : game.achievementsUnlocked === 0 ? (
                <span className="shrink-0 text-[9px] text-[#8f98a0] border border-[#323f4c] bg-[#101214]/60 px-1.5 py-[1px] rounded-sm font-semibold uppercase tracking-wider flex items-center gap-1">
                  <CircleDashed size={10} /> Not Started
                </span>
              ) : game.hardcore ? (
                <span className="shrink-0 text-[9px] text-[#ff6b6b] border border-[#ff6b6b]/30 bg-[#101214]/60 px-1.5 py-[1px] rounded-sm font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Flame size={10} /> Hardcore
                </span>
              ) : (
                <span className="shrink-0 text-[9px] text-[#8f98a0] border border-[#323f4c] bg-[#101214]/60 px-1.5 py-[1px] rounded-sm font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Feather size={10} /> Softcore
                </span>
              )}
              
              {game.isMastered && (
                <span className="shrink-0 text-[9px] text-[#101214] bg-[#e5b143] px-1.5 py-[1px] rounded-sm font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
                  <Trophy size={10} /> Mastered
                </span>
              )}
              {game.isBeaten && !game.isMastered && (
                <span className="shrink-0 text-[9px] text-[#c6d4df] bg-[#2a3440] px-1.5 py-[1px] rounded-sm font-bold uppercase tracking-wider border border-[#b8c4ce]/30 flex items-center gap-1">
                  <Medal size={10} /> Beaten
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] md:text-[11px] mb-2">
            {game.playtime !== "Unknown" && <><div className="flex items-center gap-1 text-[#c6d4df]"><Clock size={9} className="text-[#8f98a0] shrink-0" />{game.playtime}</div><span className="text-[#546270]">·</span></>}
            <span className="text-[#546270]">Last Played <span className="text-[#8f98a0]">{game.lastPlayed}</span></span>
          </div>

          {hasAchievements && (() => {
            const progAchs = game.achievements.filter(a => a.type === 'progression' || a.type === 'win_condition');
            const progTotal = progAchs.length;
            const progUnlocked = progAchs.filter(a => a.isUnlocked).length;
            const progPct = progTotal > 0 ? (progUnlocked / progTotal) * 100 : null;
            const labelW = 'w-[70px] shrink-0';
            return (
              <div className="flex flex-col gap-1.5">
                {progPct !== null && (
                  <div className="flex items-center gap-2">
                    <span className={`${labelW} text-[8px] text-[#546270] uppercase tracking-wider text-right`}>Progression</span>
                    <div className="flex-1 bg-[#101214] h-[4px] rounded-sm overflow-hidden max-w-full">
                      <div
                        className="h-full transition-all duration-1000 ease-out rounded-sm bg-[#e5b143]"
                        style={{ width: `${progPct}%` }}
                      ></div>
                    </div>
                    <div className="text-[10px] text-[#e5b143] shrink-0 whitespace-nowrap" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.6)' }}>
                      <span>{progUnlocked}</span>/{progTotal} <span className="ml-0.5">({progPct.toFixed(2)}%)</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className={`${labelW} text-[8px] text-[#546270] uppercase tracking-wider text-right`}>Overall</span>
                  <div className="flex-1 bg-[#101214] h-[4px] rounded-sm overflow-hidden max-w-full">
                    <div
                      className={`h-full transition-all duration-1000 ease-out rounded-sm ${game.isMastered ? 'bg-[#e5b143]' : 'bg-[#66c0f4]'}`}
                      style={{ width: `${game.rawProgress}%` }}
                    ></div>
                  </div>
                  <div className="text-[10px] text-[#8f98a0] shrink-0 whitespace-nowrap" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.6)' }}>
                    <span className="text-[#c6d4df]">{game.achievementsUnlocked}</span>/{game.achievementsTotal} <span className="ml-0.5">({game.rawProgress.toFixed(2)}%)</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Guide links strip */}
      <GuideStrip game={game} guides={guides} isLast={!hasAchievements || !onViewDetails} />

      {/* Achievement preview strip */}
      {hasAchievements && onViewDetails && (
        <button
          onClick={() => onViewDetails(game)}
          className="w-full flex items-center gap-2.5 px-3 py-2 bg-[#171a21] hover:bg-[#1b2838] transition-colors border-t border-[#323f4c] outline-none z-10 relative group rounded-b-[3px]"
        >
          {/* Badge icon previews */}
          <div className="flex items-center gap-1 shrink-0">
            {previewAchs.map((ach, i) => {
              const isFirst  = i === 0;
              const isLast   = i === previewAchs.length - 1;
              const tipPos   = isFirst ? 'left-0' : isLast ? 'right-0' : 'left-1/2 -translate-x-1/2';
              const caretPos = isFirst ? 'ml-[7px]' : isLast ? 'mr-[7px] ml-auto' : 'mx-auto';
              const borderCls = ach.isHardcore ? 'border-[#e5b143]' : ach.isUnlocked ? 'border-[#8f98a0]' : 'border-[#1e2a35] opacity-40';
              return (
                <div key={ach.id} className="relative shrink-0" style={{ zIndex: previewAchs.length - i }}>
                  <div className={`w-8 h-8 rounded-[2px] overflow-hidden border bg-black peer ${borderCls}`}>
                    <img
                      src={`${MEDIA_URL}/Badge/${ach.badgeName || '00001'}.png`}
                      alt={ach.title}
                      className={`w-full h-full object-cover ${!ach.isUnlocked ? 'grayscale' : ''}`}
                    />
                  </div>
                  {/* Tooltip */}
                  <div className={`pointer-events-none absolute bottom-full ${tipPos} mb-1.5 opacity-0 peer-hover:opacity-100 transition-opacity duration-150 z-50 w-max max-w-[160px]`}>
                    <div className="bg-[#101214] border border-[#2a475e] rounded-[3px] px-2 py-1.5 shadow-lg">
                      <div className={`text-[10px] font-medium leading-tight text-left ${ach.isUnlocked ? 'text-[#e5b143]' : 'text-[#8f98a0]'}`}>
                        {ach.title}
                      </div>
                      <div className="text-[9px] text-[#8f98a0] mt-0.5 text-left leading-snug">
                        {ach.description || ach.title}
                      </div>
                      {ach.isUnlocked ? (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          <span className="text-[8px] font-bold text-[#66c0f4] bg-[#101214] border border-[#323f4c] px-1 py-px rounded-sm">{ach.points}pts</span>
                          {ach.isHardcore && <span className="text-[8px] text-[#ff6b6b] border border-[#ff6b6b]/30 px-1 py-px rounded-sm font-semibold">HC</span>}
                        </div>
                      ) : (
                        <div className="text-[8px] text-[#546270] mt-1 text-left">Locked</div>
                      )}
                    </div>
                    <div className={`w-1.5 h-1.5 bg-[#101214] border-r border-b border-[#2a475e] rotate-45 -mt-[5px] ${caretPos}`} />
                  </div>
                </div>
              );
            })}
            {game.achievementsTotal > previewAchs.length && (
              <span className="text-[9px] text-[#546270] group-hover:text-[#8f98a0] transition-colors ml-0.5">
                +{game.achievementsTotal - previewAchs.length}
              </span>
            )}
          </div>

          {/* Arrow */}
          <div className="ml-auto flex items-center shrink-0">
            <ChevronDown size={10} className="-rotate-90 text-[#546270] group-hover:text-[#66c0f4] transition-colors" />
          </div>
        </button>
      )}
    </div>
  );
};

// ── RAchievementModal ─────────────────────────────────────────────────────────

const RAchievementModal = ({ game, onClose }) => {
  const [lockFilter, setLockFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
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

  const progAchs     = game.achievements?.filter(a => a.type === 'progression' || a.type === 'win_condition') ?? [];
  const progUnlocked = progAchs.filter(a => a.isUnlocked).length;
  const progPct      = progAchs.length > 0 ? (progUnlocked / progAchs.length) * 100 : null;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />

      <div
        className="relative z-10 w-full max-w-xl bg-[#1b2838] border border-[#2a475e] rounded-[4px] shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button onClick={onClose} className="absolute top-2 right-2 z-10 text-[#546270] hover:text-[#c6d4df] transition-colors outline-none">
          <X size={15} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 px-4 py-4 border-b border-[#2a475e] shrink-0">
          <a href={`${SITE_URL}/game/${game.id}`} target="_blank" rel="noreferrer"
            className="shrink-0 w-16 h-16 rounded-[2px] overflow-hidden border border-[#101214] bg-[#101214] hover:scale-105 transition-transform">
            <img src={game.icon} alt={game.title} className="w-full h-full object-cover" />
          </a>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <a href={`${SITE_URL}/game/${game.id}`} target="_blank" rel="noreferrer"
                  className="text-[15px] font-medium text-white hover:text-[#66c0f4] transition-colors leading-tight truncate">
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
                  <span className="w-[64px] shrink-0 text-[8px] text-[#546270] uppercase tracking-wider text-right">Progression</span>
                  <div className="flex-1 bg-[#101214] h-[3px] rounded-sm overflow-hidden">
                    <div className="h-full rounded-sm bg-[#e5b143]" style={{ width: `${progPct}%` }} />
                  </div>
                  <span className="text-[9px] text-[#e5b143] shrink-0">{progUnlocked}/{progAchs.length}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="w-[64px] shrink-0 text-[8px] text-[#546270] uppercase tracking-wider text-right">Overall</span>
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

        {/* Filter bar — two rows */}
        <div className="flex flex-col px-4 py-2 border-b border-[#101214] gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] uppercase tracking-wider text-[#546270] w-[44px] shrink-0">Status</span>
            {[
              { value: 'all',      label: 'All',      icon: null },
              { value: 'unlocked', label: 'Unlocked', icon: <Unlock size={9} /> },
              { value: 'locked',   label: 'Locked',   icon: <Lock size={9} /> },
            ].map(opt => (
              <button key={opt.value} onClick={() => setLockFilter(opt.value)}
                className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-[3px] rounded-sm border transition-colors flex items-center gap-1 ${
                  lockFilter === opt.value
                    ? 'bg-[#66c0f4] text-[#101214] border-[#66c0f4]'
                    : 'bg-[#101214] text-[#8f98a0] border-[#323f4c] hover:text-[#c6d4df] hover:border-[#546270]'
                }`}>{opt.icon}{opt.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] uppercase tracking-wider text-[#546270] w-[44px] shrink-0">Type</span>
            {[
              { value: 'all',         label: 'All',         icon: null },
              { value: 'progression', label: 'Progression', icon: <Trophy size={9} /> },
              { value: 'missable',    label: 'Missable',    icon: <AlertTriangle size={9} /> },
            ].map(opt => (
              <button key={opt.value} onClick={() => setTypeFilter(opt.value)}
                className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-[3px] rounded-sm border transition-colors flex items-center gap-1 ${
                  typeFilter === opt.value
                    ? 'bg-[#e5b143] text-[#101214] border-[#e5b143]'
                    : 'bg-[#101214] text-[#8f98a0] border-[#323f4c] hover:text-[#c6d4df] hover:border-[#546270]'
                }`}>{opt.icon}{opt.label}</button>
            ))}
            <span className="ml-auto text-[9px] text-[#546270]">{filteredAchs.length} / {game.achievements?.length ?? 0}</span>
          </div>
        </div>

        {/* Achievement list */}
        <div className="overflow-y-auto overscroll-contain flex-1 px-4 py-3 space-y-1.5">
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
                      <p className="text-[9px] text-[#66c0f4] shrink-0">Unlocked: {new Date(ach.unlockDate).toLocaleDateString()}</p>
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
          className="pointer-events-none fixed z-[9999] bg-[#131a22] border border-[#2a475e] rounded-[2px] px-2 py-1.5 shadow-lg"
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

  // Auto-load chunk when a clicked heatmap day isn't in the loaded data yet
  useEffect(() => {
    if (!selectedDay || !heatmapData[selectedDay] || dayMap[selectedDay] || !hasMore || loadingMore) return;
    onLoadMoreRef.current();
  }, [selectedDay, dayMap, hasMore, loadingMore]);

  const toggleDay = (day) => setCollapsedDays(prev => {
    const next = new Set(prev);
    next.has(day) ? next.delete(day) : next.add(day);
    return next;
  });

  // Build day map: { 'YYYY-MM-DD': { count, points, achievements[] } }
  const dayMap = useMemo(() => {
    const map = {};
    achievements.forEach(ach => {
      const day = ach.date.substring(0, 10);
      if (!map[day]) map[day] = { count: 0, points: 0, achievements: [] };
      map[day].count++;
      map[day].points += ach.points || 0;
      map[day].achievements.push(ach);
    });
    return map;
  }, [achievements]);

  const maxPoints = useMemo(() => Math.max(1, ...Object.values(heatmapData).map(d => d.points || 0)), [heatmapData]);

  // Build 365-day grid ending on ref date
  const refDate = refTime ? new Date(refTime) : new Date();
  const days = useMemo(() => {
    const arr = [];
    for (let i = 364; i >= 0; i--) {
      const d = new Date(refDate);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().substring(0, 10);
      arr.push({ key, date: d });
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
      const day = ach.date.substring(0, 10);
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
        const dayPts = achs.reduce((s, a) => s + (a.points || 0), 0);
        return { day, dayPts, achCount: achs.length, sessions };
      });
  }, [achievements, selectedDay, dayMap]);

  const fmtTime = (str) => str ? str.substring(11, 16) : '';
  const fmtDay  = (str) => new Date(str + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="flex flex-col gap-6">

      {/* ── Heatmap ── */}
      <div>
        <div className="flex items-center gap-2 border-b border-[#2a475e] pb-1.5 mb-3">
          <span className="w-[3px] h-[14px] bg-[#66c0f4] rounded-[1px] shrink-0"></span>
          <span className="text-[13px] text-white tracking-wide uppercase font-medium flex items-center gap-2"><Activity size={15} className="text-[#66c0f4]" /> Activity</span>
          <span className="text-[10px] text-[#546270] ml-auto hidden sm:block">{loadedChunks < totalChunks ? `~${loadedChunks * 3} months` : '1 year'} · {achievements.length} achievements · click a day to filter</span>
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
                <button onClick={() => setSelectedDay(null)} className="ml-auto text-[8px] text-[#66c0f4] hover:text-[#c6d4df] uppercase tracking-wider">
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
          <div className="text-[#8f98a0] text-[11px] py-4 italic text-center">No achievements unlocked in the last 180 days.</div>
        ) : (
          <div className="flex flex-col gap-0">
            {timelineGroups.map(({ day, dayPts, achCount, sessions }) => {
              const isCollapsed = collapsedDays.has(day);
              return (
              <div key={day} className="mb-4">
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
                  <div key={si} className="ml-4 border-l border-[#2a475e] pl-3 mb-3">
                    {/* Session label */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <a href={`${SITE_URL}/game/${session.gameId}`} target="_blank" rel="noreferrer" className="w-4 h-4 rounded-[1px] overflow-hidden border border-[#101214] bg-black block hover:scale-110 transition-transform shrink-0">
                        <img src={session.gameIcon} alt="" className="w-full h-full object-cover" />
                      </a>
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {(() => { const p = parseTitle(session.gameTitle); return (<>
                          <a href={`${SITE_URL}/game/${session.gameId}`} target="_blank" rel="noreferrer" className="text-[9px] text-[#c6d4df] hover:text-[#66c0f4] transition-colors uppercase tracking-wider font-medium truncate">
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
                <div className="text-center py-2 text-[9px] text-[#546270] uppercase tracking-wider">
                  Showing ~{loadedChunks * 3} of 12 months — scroll to load more
                </div>
              )}
            </div>
          ) : achievements.length > 0 ? (
            <div className="text-center py-3 mt-2 border-t border-[#1e2a35] text-[9px] text-[#546270] uppercase tracking-wider">
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
                const t = new Date(a.dateEarned);
                if (!latestAch || t > new Date(latestAch.date)) {
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
          ? Math.max(...Object.values(g.achievements).filter(a => a.dateEarned).map(a => new Date(a.dateEarned).getTime()))
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
        ? getMediaUrl(coverGame.imageIngame || coverGame.imageTitle || coverGame.imageIcon)
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
      <div className="text-center py-12 text-[#546270] text-[12px]">
        No series flagged for progress tracking yet.<br />
        <span className="text-[11px]">Enable <strong className="text-[#8f98a0]">📊 Progress</strong> on a series in the admin panel.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {cards.map(({ series, total, tracked, inProgress, mastered, pointsEarned, pointsTotal, achEarned, achTotal, latestAch, icons, coverBg, coverIcon, coverId }) => {
        const achPct = achTotal > 0 ? (achEarned / achTotal) * 100 : 0;
        const ICON_LIMIT   = 8;
        const shownIcons   = icons.slice(0, ICON_LIMIT);
        const extraIcons   = icons.length - ICON_LIMIT;
        const latestAchTimeAgo = latestAch ? formatTimeAgo(latestAch.date) : null;

        return (
          <div key={series.id} className="flex flex-col bg-[#202d39] rounded-[3px] border-l-[3px] border border-[#323f4c] shadow-md overflow-hidden" style={{ borderLeftColor: '#e5b143' }}>

            {/* Top section: bg image + cover icon + title (mirrors GameCard header) */}
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
  const [heatmapData,  setHeatmapData]  = useState({});   // achievements/heatmap.json

  const TOTAL_ACH_CHUNKS = 4;
  const [achievementChunks, setAchievementChunks] = useState(() => Array(TOTAL_ACH_CHUNKS).fill(null));
  const [loadingChunkIdx,   setLoadingChunkIdx]   = useState(null);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingGames,   setLoadingGames]   = useState(false);
  const [error, setError] = useState(null);

  const VALID_TABS = ['recent', 'progress', 'series', 'activity', 'backlog'];
  const initialTab = (() => {
    const p = new URLSearchParams(window.location.search).get('tab');
    return VALID_TABS.includes(p) ? p : 'recent';
  })();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [progressSort,   setProgressSort]   = useState('overall');
  const [progressSearch, setProgressSearch] = useState('');
  const [progressView,   setProgressView]   = useState('all');
  const [showMastered,   setShowMastered]   = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showFloatingTabs, setShowFloatingTabs] = useState(false);
  const [pillLeaving, setPillLeaving] = useState(false);
  const pillLeaveTimer = useRef(null);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const tabBarRef = useRef(null);
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

  const loadNextChunk = () => {
    const nextIdx = achievementChunks.findIndex(c => c === null);
    if (nextIdx === -1 || loadingChunkIdx !== null) return;
    setLoadingChunkIdx(nextIdx);
    fetch(`../../data/ra/achievements/${nextIdx + 1}.json`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        setAchievementChunks(prev => { const n = [...prev]; n[nextIdx] = data.recentAchievements || []; return n; });
        setLoadingChunkIdx(null);
      })
      .catch(() => {
        setAchievementChunks(prev => { const n = [...prev]; n[nextIdx] = []; return n; });
        setLoadingChunkIdx(null);
      });
  };

  const setTab = (tab) => {
    setActiveTab(tab);
    const url = new URL(window.location);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url);
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
      .catch(() => {});
  }, []);

  // ── Load heatmap + first achievement chunk when Activity tab is opened ──
  useEffect(() => {
    if (activeTab !== 'activity') return;
    if (Object.keys(heatmapData).length === 0) {
      fetch('../../data/ra/achievements/heatmap.json')
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then(data => setHeatmapData(data.activityHeatmap || {}))
        .catch(() => {});
    }
    if (achievementChunks[0] === null && loadingChunkIdx === null) {
      loadNextChunk();
    }
  }, [activeTab]);

  // ── Fetch games.json when Recent or Progress tab is opened ─
  useEffect(() => {
    if (['recent', 'progress', 'series'].includes(activeTab) && !gamesData && !loadingGames) {
      setLoadingGames(true);
      fetch('../../data/ra/games.json')
        .then(r => { if (!r.ok) throw new Error('Failed to load games.json'); return r.json(); })
        .then(data => { setGamesData(data); setLoadingGames(false); })
        .catch(err => { console.error(err); setLoadingGames(false); });
    }
  }, [activeTab]);

  // ── Merge loaded achievement chunks (newest first) ────────
  const allLoadedAchievements = useMemo(() => {
    return achievementChunks
      .filter(c => c !== null)
      .flat()
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [achievementChunks]);

  const loadedChunkCount = achievementChunks.filter(c => c !== null).length;

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

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setShowScrollTop(y > 400);
      if (window.innerWidth < 768 && tabBarRef.current) {
        const bottom = tabBarRef.current.getBoundingClientRect().bottom;
        if (bottom < 0) {
          if (pillLeaveTimer.current) { clearTimeout(pillLeaveTimer.current); pillLeaveTimer.current = null; }
          setPillLeaving(false);
          setShowFloatingTabs(true);
        } else {
          setShowFloatingTabs(prev => {
            if (prev && !pillLeaveTimer.current) {
              setPillLeaving(true);
              pillLeaveTimer.current = setTimeout(() => {
                setShowFloatingTabs(false);
                setPillLeaving(false);
                pillLeaveTimer.current = null;
              }, 210);
            }
            return prev;
          });
        }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (loadingProfile) return <ProfileLoadingSkeleton />;
  if (error || !PROFILE_DATA) return (
    <div className="min-h-screen bg-[#171a21] flex flex-col items-center justify-center text-[#c6d4df] p-4">
        <AlertCircle className="text-[#ff6b6b] mb-2" size={48} />
        <h1 className="text-xl font-bold mb-2">Data Load Error</h1>
        <p className="text-[#8f98a0] mb-4">{error || "Could not transform profile data."}</p>
    </div>
  );

  let displayedGames = [...ALL_GAMES];
  if (activeTab === 'recent') {
    displayedGames.sort((a, b) => new Date(b.lastPlayedStr || 0) - new Date(a.lastPlayedStr || 0));
    displayedGames = displayedGames.slice(0, 15);
  } else if (activeTab === 'progress') {
    displayedGames = displayedGames
      .filter(g => g.achievementsUnlocked > 0 && g.achievementsTotal > 0 && (!progressSearch || (g.baseTitle || g.title || '').toLowerCase().includes(progressSearch.toLowerCase())));
    const bucketed = applyProgressView(displayedGames, progressView, {
      pct:          g => g.rawProgress,
      left:         g => g.achievementsTotal - g.achievementsUnlocked,
      lastPlayedMs: g => raDateMs(g.lastPlayedStr),
      isCompleted:  g => g.isMastered,
    });
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
      <header className="bg-[#1b2838] border-b border-[#2a475e] px-4 md:px-8 pt-8 pb-5 md:pt-5 shadow-md">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center md:items-start gap-5">

          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-[2px] border border-[#4c9be8] shadow-[0_2px_12px_rgba(0,0,0,0.5)] overflow-hidden bg-[#101214]">
              <img src={PROFILE_DATA.avatar} alt={PROFILE_DATA.username} className="w-full h-full object-cover" />
            </div>
            {PROFILE_DATA.status === 'Online' && (
              <span className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-[#57cbde] border-2 border-[#1b2838]"></span>
            )}
            {PROFILE_DATA.status === 'Playing' && (
              <span className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-[#6bcf7f] border-2 border-[#1b2838]"></span>
            )}
            {PROFILE_DATA.status === 'Offline' && (
              <span className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-[#546270] border-2 border-[#1b2838]"></span>
            )}
          </div>

          {/* Meta */}
          <div className="flex-1 flex flex-col gap-1.5 text-center md:text-left">

            {/* Name row */}
            <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
              <h1 className="text-2xl md:text-[26px] text-white font-medium tracking-wide leading-none">
                {PROFILE_DATA.username}
              </h1>
              <a href={`${SITE_URL}/user/${PROFILE_DATA.username}`} target="_blank" rel="noreferrer" title="View on RetroAchievements" className="hover:opacity-80 transition-opacity bg-[#101214] p-1 rounded-[2px] border border-[#323f4c] flex items-center justify-center shrink-0">
                <img
                  src="https://static.retroachievements.org/assets/images/favicon.webp"
                  onError={(e) => { e.target.onerror = null; e.target.src = "https://avatars.githubusercontent.com/u/49842581?s=32&v=4"; }}
                  alt="RA"
                  className="w-3.5 h-3.5 object-contain"
                />
              </a>
              <span className="text-[10px] text-[#546270]">Last active <span className="text-[#8f98a0]">{PROFILE_DATA.lastActivity}</span></span>
            </div>

            {/* Rank */}
            <div className="text-[11px] text-[#66c0f4]">
              Rank <span className="text-[#e5b143] font-bold">#{PROFILE_DATA.rank}</span>
              {PROFILE_DATA.topPercentage !== '--%' && (
                <span className="text-[#66c0f4]"> · Top <span className="text-[#e5b143] font-bold">{PROFILE_DATA.topPercentage}</span></span>
              )}
            </div>

            {/* Motto */}
            {PROFILE_DATA.bio && (
              <p className="text-[12px] text-[#8f98a0] italic border-l-2 border-[#2a475e] pl-2 leading-snug">
                "{PROFILE_DATA.bio}"
              </p>
            )}

            {/* Pills */}
            <div className="flex flex-wrap justify-center md:justify-start gap-1.5 mt-0.5">
              <span className="text-[9px] font-semibold uppercase tracking-[0.07em] px-2 py-[3px] rounded-[2px] border border-[#323f4c] bg-[#101214] text-[#546270]">
                <span className="text-[#e5b143]">{PROFILE_DATA.totalPoints.toLocaleString()}</span> pts
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.07em] px-2 py-[3px] rounded-[2px] border border-[#323f4c] bg-[#101214] text-[#546270]">
                <span className="text-[#c6d4df]">{PROFILE_DATA.totalUnlocked.toLocaleString()}</span> achievements
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.07em] px-2 py-[3px] rounded-[2px] border border-[#323f4c] bg-[#101214] text-[#546270]">
                Member since <span className="text-[#c6d4df]">{PROFILE_DATA.memberSince}</span>
              </span>
            </div>

          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 flex-1 w-full">
        
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-8 mb-8">
          
          <div className="flex flex-col gap-6">
            
            <div>
              <h2 className="text-[13px] text-white tracking-wide uppercase font-medium border-b border-[#2a475e] pb-1.5 flex items-center gap-2 mb-3">
                <span className="w-[3px] h-[14px] bg-[#66c0f4] rounded-[1px] shrink-0"></span>
                <Activity size={15} className="text-[#66c0f4]"/> Most Recently Played
              </h2>
              
              <div className="flex flex-col gap-2">
                {PROFILE_DATA.mostRecentGame ? (
                  <div className="bg-[#1b2838]/80 border border-[#323f4c] border-l-[3px] border-l-[#66c0f4] rounded-[3px] p-3 flex gap-4 hover:bg-[#202d39] transition-colors shadow-sm">
                    <a href={`${SITE_URL}/game/${PROFILE_DATA.mostRecentGame.id}`} target="_blank" rel="noreferrer" className="w-14 h-14 shrink-0 rounded-[2px] overflow-hidden border border-[#101214] bg-black block hover:scale-105 transition-transform">
                      <img src={PROFILE_DATA.mostRecentGame.icon} alt="Icon" className="w-full h-full object-cover"/>
                    </a>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <a href={`${SITE_URL}/game/${PROFILE_DATA.mostRecentGame.id}`} target="_blank" rel="noreferrer" className="text-[#c6d4df] hover:text-[#66c0f4] font-medium text-[14px] truncate leading-tight">
                          {PROFILE_DATA.mostRecentGame.baseTitle}
                        </a>
                        {PROFILE_DATA.mostRecentGame.isSubset && (
                          <span className="text-[7px] font-bold uppercase tracking-[0.07em] px-1 py-[1px] rounded-[2px] border border-[rgba(229,177,67,0.3)] bg-[rgba(229,177,67,0.1)] text-[#c8a84b] shrink-0">Subset</span>
                        )}
                        {renderTildeTags(PROFILE_DATA.mostRecentGame.tags)}
                      </div>
                      {PROFILE_DATA.mostRecentGame.isSubset && (
                        <div className="text-[10px] text-[#c8a84b] mb-0.5 truncate">{PROFILE_DATA.mostRecentGame.subsetName}</div>
                      )}
                      <div className="text-[10px] mb-1 flex items-center gap-1.5">
                         <span className="text-[#66c0f4]">{PROFILE_DATA.mostRecentGame.console}</span>
                         <span className="text-[#546270]">•</span>
                         <span className="text-[#8f98a0]">{PROFILE_DATA.mostRecentGame.timeAgo}</span>
                      </div>
                      
                      {PROFILE_DATA.richPresenceMsg && (
                         <p className="text-[#c6d4df] text-[11px] leading-snug italic border-l-2 border-[#323f4c] pl-2 mt-1">
                           {PROFILE_DATA.richPresenceMsg}
                         </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-[#8f98a0] text-[11px] py-2">No recent games found.</div>
                )}
              </div>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 md:gap-x-8 px-1">

                <div className="flex flex-col">
                  {PROFILE_DATA.statsLeft.map((stat, i) => (
                    <div key={`left-${i}`} className="flex items-end text-[11px] py-[3px] group hover:bg-[#202d39]/40 rounded-sm px-1 transition-colors">
                      <span className="text-[#8f98a0] font-medium leading-tight whitespace-nowrap">{stat.label}</span>
                      <div className="flex-1 border-b-[1.5px] border-dotted border-[#323f4c] mx-2 relative top-[-4px] opacity-60 group-hover:border-[#546270]"></div>
                      <span className="text-[#c6d4df] font-medium whitespace-nowrap leading-tight text-right">{stat.value}</span>
                    </div>
                  ))}
                </div>

                {/* Right column: always visible on sm+, hidden on mobile until expanded */}
                <div className={`flex flex-col ${statsExpanded ? '' : 'hidden sm:flex'}`}>
                  {PROFILE_DATA.statsRight.map((stat, i) => (
                    <div key={`right-${i}`} className="flex items-end text-[11px] py-[3px] group hover:bg-[#202d39]/40 rounded-sm px-1 transition-colors">
                      <span className="text-[#8f98a0] font-medium leading-tight whitespace-nowrap">{stat.label}</span>
                      <div className="flex-1 border-b-[1.5px] border-dotted border-[#323f4c] mx-2 relative top-[-4px] opacity-60 group-hover:border-[#546270]"></div>
                      <span className="text-[#c6d4df] font-medium whitespace-nowrap leading-tight text-right">{stat.value}</span>
                    </div>
                  ))}
                </div>

              </div>

              {/* Mobile-only expand/collapse toggle */}
              <button
                onClick={() => setStatsExpanded(v => !v)}
                className="sm:hidden mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#546270] hover:text-[#8f98a0] transition-colors border-t border-[#1e2d3a]"
              >
                <ChevronDown size={13} className={`transition-transform duration-200 ${statsExpanded ? 'rotate-180' : ''}`} />
                {statsExpanded ? 'Show less' : 'Show more'}
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
                  <div key={award.id} className="relative group cursor-help">
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
                          <span className="text-[9px] text-[#546270] uppercase tracking-[0.08em]">Console</span>
                          <span className="text-[9px] text-[#66c0f4] font-medium">{award.console}</span>
                        </div>
                        <div className="h-px bg-[#2a475e]"></div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-[#546270] uppercase tracking-[0.08em]">Award</span>
                          {award.type === 'Mastery/Completion'
                            ? <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded-[2px] bg-[#e5b143] text-[#101214]">Mastered</span>
                            : <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded-[2px] bg-[#2a3440] text-[#c6d4df] border border-[#b8c4ce]/30">Beaten</span>
                          }
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-[#546270] uppercase tracking-[0.08em]">Earned</span>
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
                  className="w-full flex items-center justify-center gap-1 py-1.5 border-t border-[#2a475e] text-[9px] font-semibold uppercase tracking-[0.07em] text-[#546270] hover:text-[#c6d4df] hover:bg-[#202d39] transition-colors rounded-b-[2px] outline-none"
                >
                  {awardsExpanded ? 'Show less' : `Show all ${PROFILE_DATA.gameAwards.length}`}
                  <ChevronDown size={11} className={`transition-transform duration-200 ${awardsExpanded ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>

          </div>
        </div>

        {/* ── Tab bar (natural in-flow position; desktop: sticky) ── */}
        <div ref={tabBarRef} className="md:sticky md:top-[26px] z-40 bg-[#171a21] -mx-4 md:-mx-8 mb-4 border-b border-[#2a475e]">
          <div className="flex items-center gap-1 md:gap-6 px-2 md:px-8 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
            <button onClick={() => setTab('recent')} className={`flex-1 md:flex-none flex flex-col md:flex-row items-center justify-center gap-1 md:gap-0 py-2.5 md:py-0 md:pb-2 px-1 md:px-0 transition-colors relative ${activeTab === 'recent' ? 'text-white' : 'text-[#546270] hover:text-[#c6d4df]'}`}>
              <Clock size={18} className="block md:hidden shrink-0" />
              <span className="block md:hidden text-[9px] font-semibold uppercase tracking-[0.06em] leading-none">Recent</span>
              <span className="hidden md:inline text-[11px] md:text-[14px] uppercase tracking-wide font-medium whitespace-nowrap">Recent Games</span>
              {activeTab === 'recent' && <div className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-[#66c0f4]" />}
            </button>
            <button onClick={() => setTab('progress')} className={`flex-1 md:flex-none flex flex-col md:flex-row items-center justify-center gap-1 md:gap-0 py-2.5 md:py-0 md:pb-2 px-1 md:px-0 transition-colors relative ${activeTab === 'progress' ? 'text-white' : 'text-[#546270] hover:text-[#c6d4df]'}`}>
              <BarChart2 size={18} className="block md:hidden shrink-0" />
              <span className="block md:hidden text-[9px] font-semibold uppercase tracking-[0.06em] leading-none">Progress</span>
              <span className="hidden md:inline text-[11px] md:text-[14px] uppercase tracking-wide font-medium whitespace-nowrap">Completion Progress</span>
              {activeTab === 'progress' && <div className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-[#66c0f4]" />}
            </button>
            {seriesData.some(s => s.showProgress) && (
              <button onClick={() => setTab('series')} className={`flex-1 md:flex-none flex flex-col md:flex-row items-center justify-center gap-1 md:gap-0 py-2.5 md:py-0 md:pb-2 px-1 md:px-0 transition-colors relative ${activeTab === 'series' ? 'text-white' : 'text-[#546270] hover:text-[#c6d4df]'}`}>
                <Layers size={18} className="block md:hidden shrink-0" />
                <span className="block md:hidden text-[9px] font-semibold uppercase tracking-[0.06em] leading-none">Series</span>
                <span className="hidden md:inline text-[11px] md:text-[14px] uppercase tracking-wide font-medium whitespace-nowrap">Series Progress</span>
                {activeTab === 'series' && <div className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-[#e5b143]" />}
              </button>
            )}
            <button onClick={() => setTab('activity')} className={`flex-1 md:flex-none flex flex-col md:flex-row items-center justify-center gap-1 md:gap-0 py-2.5 md:py-0 md:pb-2 px-1 md:px-0 transition-colors relative ${activeTab === 'activity' ? 'text-white' : 'text-[#546270] hover:text-[#c6d4df]'}`}>
              <Activity size={18} className="block md:hidden shrink-0" />
              <span className="block md:hidden text-[9px] font-semibold uppercase tracking-[0.06em] leading-none">Activity</span>
              <span className="hidden md:inline text-[11px] md:text-[14px] uppercase tracking-wide font-medium whitespace-nowrap">Activity</span>
              {activeTab === 'activity' && <div className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-[#66c0f4]" />}
            </button>
            <button onClick={() => setTab('backlog')} className={`flex-1 md:flex-none flex flex-col md:flex-row items-center justify-center gap-1 md:gap-0 py-2.5 md:py-0 md:pb-2 px-1 md:px-0 transition-colors relative ${activeTab === 'backlog' ? 'text-white' : 'text-[#546270] hover:text-[#c6d4df]'}`}>
              <Star size={18} className="block md:hidden shrink-0" />
              <span className="block md:hidden text-[9px] font-semibold uppercase tracking-[0.06em] leading-none">Watchlist</span>
              <span className="hidden md:inline text-[11px] md:text-[14px] uppercase tracking-wide font-medium whitespace-nowrap">Watchlist</span>
              {activeTab === 'backlog' && <div className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-[#66c0f4]" />}
            </button>
          </div>
        </div>

        {/* ── Floating tab pill (mobile only, shown when natural bar scrolls off screen) ── */}
        {(showFloatingTabs || pillLeaving) && (
          <div
            className="md:hidden fixed z-[190] flex items-center gap-0.5 px-1.5 py-1.5 rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.7)]"
            style={{
              bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(19,26,34,0.92)',
              border: '1px solid #2a475e',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              animation: pillLeaving ? 'slideDownPill 0.2s ease both' : 'slideUpPill 0.2s ease both',
            }}
          >
            {[
              { id: 'recent',   icon: <Clock size={17} />,    color: '#66c0f4', label: 'Recent' },
              { id: 'progress', icon: <BarChart2 size={17} />, color: '#66c0f4', label: 'Progress' },
              ...(seriesData.some(s => s.showProgress) ? [{ id: 'series', icon: <Layers size={17} />, color: '#e5b143', label: 'Series' }] : []),
              { id: 'activity', icon: <Activity size={17} />, color: '#66c0f4', label: 'Activity' },
              { id: 'backlog',  icon: <Star size={17} />,     color: '#66c0f4', label: 'Watchlist' },
            ].map(({ id, icon, color, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                title={label}
                className="relative w-10 h-10 flex items-center justify-center rounded-full transition-all"
                style={{
                  color: activeTab === id ? color : '#546270',
                  background: activeTab === id ? `${color}22` : 'transparent',
                }}
              >
                {icon}
                {activeTab === id && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: color }} />
                )}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {activeTab === 'series' ? (
            <SeriesProgressTab seriesData={seriesData} gamesData={gamesData} watchlistData={watchlistData} />
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
                  loadingMore={loadingChunkIdx !== null}
                  onLoadMore={loadNextChunk}
                />
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
                  const q = watchlistSearch.toLowerCase();
                  const searchable = [
                    g.baseTitle || g.title,
                    g.isSubset ? 'subset' : null,
                    g.subsetName,
                    ...(g.tags || []),
                  ].filter(Boolean).join(' ').toLowerCase();
                  if (!searchable.includes(q)) return false;
                }
                if (watchlistStatusFilter !== 'all' && status !== watchlistStatusFilter) return false;
                return true;
              });

              const statusMeta = {
                mastered:   { dot: '#e5b143', label: 'Mastered',        defaultOpen: true  },
                inprogress: { dot: '#66c0f4', label: 'In Progress',     defaultOpen: true  },
                notstarted: { dot: '#546270', label: 'Not Started',     defaultOpen: false },
                noach:      { dot: '#1e2a35', label: 'No Achievements', defaultOpen: false },
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

              // Table columns — responsive via CSS classes, not inline styles
              const showConsole  = watchlistGrouping !== 'console';
              const colClass = showConsole ? 'wl-row-full' : 'wl-row-noconsole';
              const headers = [
                { label: '', cls: '' },
                { label: 'Title', cls: '' },
                ...(showConsole ? [{ label: 'Console', cls: 'wl-hide-mobile' }] : []),
                { label: 'Pts', cls: 'wl-hide-mobile text-right' },
                { label: 'Progress', cls: 'text-right' },
              ];

              const GameRow = ({ game }) => {
                const status = getStatus(game);
                const isMastered   = status === 'mastered';
                const isInProgress = status === 'inprogress';
                const hasNoAch     = status === 'noach';
                // Same stripe ladder as game cards: gold → silver (beaten) → blue → gray → near-black
                const stripe = isMastered ? 'border-l-[#e5b143]' : game.isBeaten ? 'border-l-[#b8c4ce]' : isInProgress ? 'border-l-[#66c0f4]' : hasNoAch ? 'border-l-[#1e2a35]' : 'border-l-[#323f4c]';
                return (
                  <div key={game.id} className={`grid gap-2 px-3 py-[5px] border-b border-[#1b2838] last:border-b-0 items-center hover:bg-[#1b2838] transition-colors border-l-[2px] ${stripe} ${hasNoAch ? 'opacity-50' : ''} ${colClass}`}>
                    <a href={`${SITE_URL}/game/${game.id}`} target="_blank" rel="noreferrer" className="shrink-0 w-6 h-6 rounded-[2px] overflow-hidden border border-[#101214] bg-black block hover:scale-110 transition-transform">
                      <img src={game.icon} alt={game.title} className="w-full h-full object-cover" />
                    </a>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <a href={`${SITE_URL}/game/${game.id}`} target="_blank" rel="noreferrer" className="text-[11px] text-[#c6d4df] font-medium hover:text-[#66c0f4] transition-colors truncate leading-tight">{game.baseTitle || game.title}</a>
                        {game.isSubset && <span className="text-[7px] font-bold uppercase tracking-[0.07em] px-1 py-[1px] rounded-[2px] border border-[rgba(229,177,67,0.3)] bg-[rgba(229,177,67,0.1)] text-[#c8a84b] shrink-0">Subset</span>}
                        {renderTildeTags(game.tags)}
                      </div>
                      {game.isSubset && game.subsetName && <span className="text-[9px] text-[#c8a84b] truncate block">{game.subsetName}</span>}
                      {watchlistGrouping === 'status' && <span className="text-[9px] text-[#546270]">{game.console}</span>}
                      {watchlistGrouping !== 'status' && <>
                        {isMastered   && <span className="text-[8px] text-[#e5b143] flex items-center gap-1"><Trophy size={8}/> Mastered</span>}
                        {isInProgress && <span className="text-[8px] text-[#66c0f4] flex items-center gap-1"><Activity size={8}/> In Progress</span>}
                        {status === 'notstarted' && <span className="text-[8px] text-[#546270] flex items-center gap-1"><CircleDashed size={8}/> Not Started</span>}
                        {hasNoAch && <span className="text-[8px] text-[#323f4c] flex items-center gap-1"><ShieldOff size={8}/> No Achievements</span>}
                      </>}
                    </div>
                    {showConsole && <span className="wl-hide-mobile text-[10px] text-[#66c0f4] truncate">{game.console}</span>}
                    <span className="wl-hide-mobile text-[10px] text-[#8f98a0] text-right">{game.pointsTotal > 0 ? game.pointsTotal.toLocaleString() : <span className="text-[#323f4c]">—</span>}</span>
                    <div className="flex items-center justify-end">
                      {hasNoAch ? <span className="text-[10px] text-[#323f4c]">—</span>
                        : isMastered   ? <span className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded-[2px] bg-[#e5b143] text-[#101214]">Mastered</span>
                        : isInProgress ? <span className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded-[2px] bg-[#66c0f4] text-[#101214]">{game.numAwarded}/{game.achievementsTotal}</span>
                        : <span className="text-[10px] text-[#8f98a0]">{game.achievementsTotal}</span>}
                    </div>
                  </div>
                );
              };

              return (
                <>
                  {/* ── Filter + Group bar ── */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <div className="relative">
                      <input type="text" placeholder="Search games…" value={watchlistSearch} onChange={e => setWatchlistSearch(e.target.value)}
                        className="bg-[#101214] border border-[#323f4c] hover:border-[#546270] focus:border-[#66c0f4] outline-none text-[10px] text-[#c6d4df] placeholder-[#546270] px-2 py-[4px] rounded-[2px] w-44 transition-colors" />
                      {watchlistSearch && <button onClick={() => setWatchlistSearch('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#546270] hover:text-[#c6d4df] text-[10px]">×</button>}
                    </div>
                    <span className="text-[#2a475e] text-[10px] select-none">|</span>
                    {[
                      { value: 'all',        label: 'All',             cls: 'bg-[#546270] text-[#101214] border-[#546270]' },
                      { value: 'noach',      label: 'No Achievements', cls: 'bg-[#323f4c] text-[#8f98a0] border-[#323f4c]' },
                      { value: 'notstarted', label: 'Not Started',     cls: 'bg-[#546270] text-[#101214] border-[#546270]' },
                      { value: 'inprogress', label: 'In Progress',     cls: 'bg-[#66c0f4] text-[#101214] border-[#66c0f4]' },
                      { value: 'mastered',   label: 'Mastered',        cls: 'bg-[#e5b143] text-[#101214] border-[#e5b143]' },
                    ].map(opt => (
                      <button key={opt.value} onClick={() => setWatchlistStatusFilter(opt.value)}
                        className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-[3px] rounded-[2px] border transition-colors ${watchlistStatusFilter === opt.value ? opt.cls : 'bg-[#101214] text-[#8f98a0] border-[#323f4c] hover:text-[#c6d4df] hover:border-[#546270]'}`}>
                        {opt.label}
                      </button>
                    ))}
                    <span className="text-[#2a475e] text-[10px] select-none">|</span>
                    <span className="text-[9px] text-[#546270] uppercase tracking-wider">Group</span>
                    {[
                      { value: 'none',    label: 'None'    },
                      { value: 'console', label: 'Console' },
                      { value: 'status',  label: 'Status'  },
                      { value: 'series',  label: 'Series'  },
                    ].map(opt => (
                      <button key={opt.value} onClick={() => { setWatchlistGrouping(opt.value); setCollapsedGroups(new Set()); }}
                        className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-[3px] rounded-[2px] border transition-colors ${watchlistGrouping === opt.value ? 'bg-[#1b2838] text-[#c6d4df] border-[#2a475e]' : 'bg-[#101214] text-[#546270] border-[#323f4c] hover:text-[#c6d4df] hover:border-[#546270]'}`}>
                        {opt.label}
                      </button>
                    ))}
                    {(watchlistSearch || watchlistStatusFilter !== 'all') && (
                      <button onClick={() => { setWatchlistSearch(''); setWatchlistStatusFilter('all'); }} className="ml-auto text-[9px] text-[#546270] hover:text-[#66c0f4] uppercase tracking-wider transition-colors">Clear ×</button>
                    )}
                  </div>

                  {/* Stats line */}
                  <p className="text-[10px] text-[#546270] px-1 mb-1">
                    <span className="text-[#8f98a0]">{BACKLOG.total.toLocaleString()}</span> games in watchlist
                    {BACKLOG.games.length < BACKLOG.total && <> · showing first {BACKLOG.games.length}</>}
                    <span className="mx-2 text-[#2a475e]">|</span>
                    <span className="text-[#c6d4df]">{BACKLOG.games.filter(g => g.achievementsTotal > 0).length}</span> with achievements
                    <span className="mx-1.5 text-[#2a475e]">·</span>
                    <span className="text-[#546270]">{BACKLOG.games.filter(g => g.achievementsTotal === 0).length}</span> without
                    <span className="mx-2 text-[#2a475e]">|</span>
                    <span className="text-[#66c0f4]">{BACKLOG.games.filter(g => g.inProgress && g.numAwarded !== g.achievementsTotal).length}</span> in progress
                    <span className="mx-1.5 text-[#2a475e]">·</span>
                    <span className="text-[#e5b143]">{BACKLOG.games.filter(g => g.achievementsTotal > 0 && g.numAwarded === g.achievementsTotal).length}</span> mastered
                    {filtered.length !== BACKLOG.games.length && <><span className="mx-2 text-[#2a475e]">|</span><span className="text-[#8f98a0]">{filtered.length}</span> shown</>}
                  </p>

                  {/* Table */}
                  <div className="border border-[#2a475e] rounded-[2px] overflow-hidden">
                    {/* Header */}
                    <div className={`grid gap-2 px-3 py-2 bg-[#172333] border-b border-[#2a475e] items-center ${colClass}`}>
                      {headers.map((h, i) => (
                        <span key={i} className={`text-[9px] font-bold uppercase tracking-[0.1em] text-[#8f98a0] whitespace-nowrap ${h.cls}`}>{h.label}</span>
                      ))}
                    </div>

                    {filtered.length === 0 ? (
                      <div className="text-center py-6 text-[#546270] text-[11px]">No games match the current filters.</div>
                    ) : watchlistGrouping === 'none' ? (
                      filtered.map(game => <GameRow key={game.id} game={game} />)
                    ) : (
                      groups.map(group => {
                        const isOpen = collapsedGroups.has(group.key)
                          ? !group.defaultOpen  // toggled: flip from default
                          : (group.defaultOpen ?? true); // not toggled: use default
                        return (
                          <div key={group.key}>
                            <button onClick={() => toggleGroup(group.key)} className="w-full flex items-center gap-2 px-3 py-[6px] bg-[#1b2838] border-b border-[#2a475e] hover:bg-[#202d39] transition-colors group outline-none">
                              <div className="w-2 h-2 rounded-[1px] shrink-0" style={{background: group.dot}}></div>
                              <span className="text-[10px] text-white font-semibold flex-1 text-left">{group.label}</span>
                              <span className="text-[9px] text-[#546270]">{group.games.length} game{group.games.length !== 1 ? 's' : ''}</span>
                              <ChevronDown size={11} className={`text-[#546270] transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isOpen && group.games.map(game => <GameRow key={game.id} game={game} />)}
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              );
            })()}</>
          ) : (
            loadingGames
              ? <>{[...Array(5)].map((_, i) => <GameCardSkeleton key={i} />)}</>
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
                  count={displayedGames.length}
                  search={progressSearch} onSearch={setProgressSearch}
                />
              )}
              {activeTab === 'progress' && displayedGames.length === 0 && (
                <div className="text-center py-12 text-[#546270] text-[12px]">
                  {progressSearch ? 'No games match your search.' : 'No games in this view.'}
                </div>
              )}
              {displayedGames.map(game => (
                <GameCard key={game.id} game={game} onViewDetails={setSelectedGame} guides={guidesData[game.id] ?? null} />
              ))}
            </>
          )}
        </div>

      </main>

      {/* Footer B */}
      <footer className="bg-[#1b2838] border-t-2 border-[#2a475e] px-4 md:px-8 py-2.5 flex items-center gap-3 mt-6">
        <div className="w-[3px] h-[18px] rounded-[1px] bg-[#66c0f4] opacity-50 shrink-0"></div>
        <p className="text-[10px] text-[#546270]">
          Generated from <span className="text-[#8f98a0]">RetroAchievements API</span>
          <span className="mx-2 text-[#2a475e]">·</span>
          Data as of <span className="text-[#8f98a0]">{rawData?.metadata?.extractionTimestamp ? new Date(rawData.metadata.extractionTimestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
        </p>
        <a href={SITE_URL} target="_blank" rel="noreferrer" className="ml-auto text-[10px] text-[#546270] hover:text-[#66c0f4] transition-colors shrink-0">
          retroachievements.org ↗
        </a>
      </footer>

      {/* Scroll-to-top button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="scroll-top-btn fixed right-4 z-[195] w-10 h-10 bg-[#131a22] border border-[#2a475e] hover:border-[#66c0f4] hover:text-[#66c0f4] text-[#8f98a0] rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-90"
          style={{ bottom: showFloatingTabs ? 'calc(120px + env(safe-area-inset-bottom, 0px))' : '3.5rem' }}
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
        .pop-wrap:hover .pop-box { display: block; }
        .pop-name { font-size: 10px; color: #c6d4df; font-weight: 600; margin-bottom: 2px; }
        .pop-sub  { font-size: 9px; color: #546270; margin-bottom: 2px; }
        .pop-val  { font-size: 10px; font-weight: 700; }
        
        .mask-fade {
           mask-image: linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%);
           -webkit-mask-image: linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%);
        }

        @keyframes slideUpPill {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes slideDownPill {
          from { opacity: 1; transform: translateX(-50%) translateY(0); }
          to   { opacity: 0; transform: translateX(-50%) translateY(12px); }
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

        /* Watchlist responsive grid */
        .wl-row-full    { grid-template-columns: 28px 1fr 90px 50px 80px; }
        .wl-row-noconsole { grid-template-columns: 28px 1fr 50px 80px; }
        @media (max-width: 639px) {
          .wl-row-full      { grid-template-columns: 28px 1fr 80px; }
          .wl-row-noconsole { grid-template-columns: 28px 1fr 80px; }
          .wl-hide-mobile   { display: none !important; }
        }


      `}</style>

      {selectedGame && <RAchievementModal game={selectedGame} onClose={() => setSelectedGame(null)} />}
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
