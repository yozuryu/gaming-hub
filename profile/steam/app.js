import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Trophy, BarChart2, Activity, ChevronDown, Lock, Unlock, Star, Gem, Clock, X, Medal, List, LayoutGrid, Search, Check, Plus, User, Layers, ArrowDown, Hourglass, ChevronLeft } from 'lucide-react';
import { STEAM_STATUS, PROGRESS_SORTS } from './utils/constants.js';
import { formatPlaytime, formatDate, formatTimeAgo, fmtDay, fmtTime, achIconUrl, capsuleUrl, headerUrl, heroUrl, setMovedHeaders, bannerError, libraryPortraitUrl, rarityLabel, rarityBorderColor } from './utils/helpers.js';
import { TZ, toMs, dayKey, todayKey, addDays, keyToDate, buildHeatmap } from '../../assets/time.js';
import { useSheet, useArtSrc, useAnimatedHeight, SheetHead, seriesTags, statusPills } from '../../assets/sheet.js';
import { SubFold, SubStrip, SubChips, subsMatch } from '../../assets/subseries.js';
import { useGameView, shortAgo } from '../../assets/game-view.js';
import { CompletionsPanel } from '../../assets/completions.js';
import { TabBar, useSwipeTabs, scrollToTabs } from '../../assets/tabs.js';
import { computeStreak, useSummaryOpen, ActivitySummary, yearOf, DayHead, RunCard, RunCount, UnlockRow, ActivitySkeleton } from '../../assets/activity-ui.js';


// ── Overview stat tiles (styles in assets/ui.css) ──────────────────────────────
const StatTiles = ({ items }) => (
    <div className="stiles">
        {items.map(st => <div key={st.label} className="stile"><b title={st.value}>{st.value}</b><span>{st.label}</span></div>)}
    </div>
);

// ── Game list: list / tiles views ────────────────────────────────────────────
// Status colour on the card edge, same ladder as everywhere: complete gold, beaten silver,
// started blue, not started, no achievements
const gameStatus = (achievementData, beatenInfo) => {
    const hasAch = !!(achievementData?.hasAchievements && achievementData?.total > 0);
    const pct = hasAch ? (achievementData.unlocked / achievementData.total) * 100 : null;
    const done = pct !== null && pct >= 100;
    const color = done ? '#e5b143' : beatenInfo ? '#b8c4ce' : pct > 0 ? '#66c0f4' : hasAch ? '#323f4c' : '#1e2a35';
    return { hasAch, pct, done, color };
};

const ViewToggle = ({ view, onChange }) => (
    <div className="vtoggle" role="group" aria-label="Game list view">
        <button onClick={() => onChange('list')} className={view === 'list' ? 'on' : ''} aria-pressed={view === 'list'} title="List"><List size={14} /></button>
        <button onClick={() => onChange('tiles')} className={view === 'tiles' ? 'on' : ''} aria-pressed={view === 'tiles'} title="Tiles"><LayoutGrid size={13} /></button>
    </div>
);

const GameBar = ({ pct, done }) => (
    <div className="gbar"><i style={{ width: `${pct}%`, background: done ? '#e5b143' : '#66c0f4' }} /></div>
);

// Faded art behind rows and series cards: the library hero, else the store cover (some games
// have no hero), else nothing
const heroFallback = appId => e => {
    const img = e.currentTarget, header = headerUrl(appId);
    if (img.src !== header) img.src = header; else img.style.display = 'none';
};

// One compact row: full store banner, title, playtime · last played, count and bar.
// Tap opens the achievement sheet.
const GameListRow = ({ game, achievementData, onViewDetails, beatenInfo, extra = null }) => {
    const { hasAch, pct, done, color } = gameStatus(achievementData, beatenInfo);
    const ago = shortAgo(game.lastPlayedTs ? Date.parse(game.lastPlayedTs) : 0);
    const Tag = hasAch ? 'button' : 'div';
    return (
        <Tag onClick={hasAch ? () => onViewDetails({ game, achievementData, beatenInfo }) : undefined} className="grow" style={{ borderLeftColor: color }}>
            <div className="grow-art"><img src={heroUrl(game.appId)} alt="" loading="lazy" onError={heroFallback(game.appId)} /></div>
            <img src={headerUrl(game.appId)} alt="" loading="lazy" className="grow-banner" onError={bannerError(game.appId)} />
            <div className="grow-main">
                <span className="grow-title">{game.name}</span>
                <div className="grow-sub">
                    <span className="shrink">{[game.playtimeForever ? formatPlaytime(game.playtimeForever) : null, ago].filter(Boolean).join(' · ') || 'Not played'}</span>
                </div>
                {extra}
            </div>
            <div className="grow-prog">
                {hasAch ? <>
                    <span className="gcount" style={done ? { color: '#e5b143' } : undefined}>{achievementData.unlocked}<span>/{achievementData.total}</span></span>
                    <GameBar pct={pct} done={done} />
                </> : <span className="text-[11px] text-[#546270]">No achievements</span>}
            </div>
        </Tag>
    );
};

// Tile: the store banner uncropped on top, last played, title, one bar, count and playtime;
// status colour on the bottom edge
const GameTile = ({ game, achievementData, onViewDetails, beatenInfo }) => {
    const { hasAch, pct, done, color } = gameStatus(achievementData, beatenInfo);
    const ago = shortAgo(game.lastPlayedTs ? Date.parse(game.lastPlayedTs) : 0);
    const Tag = hasAch ? 'button' : 'div';
    return (
        <Tag onClick={hasAch ? () => onViewDetails({ game, achievementData, beatenInfo }) : undefined} className="gtile" style={{ borderBottomColor: color }}>
            <div className="gtile-art">
                <img src={headerUrl(game.appId)} alt="" loading="lazy" className="banner" onError={bannerError(game.appId)} />
                {ago && <span className="gtile-ago">{ago}</span>}
            </div>
            <div className="gtile-body">
                <span className="gtile-title">{game.name}</span>
                {hasAch && <GameBar pct={pct} done={done} />}
                <div className="gtile-meta">
                    <span style={done ? { color: '#e5b143' } : undefined}>{hasAch ? `${achievementData.unlocked}/${achievementData.total}` : 'No achievements'}</span>
                    {game.playtimeForever > 0 && <span>{formatPlaytime(game.playtimeForever)}</span>}
                </div>
            </div>
        </Tag>
    );
};

const GameCardFor = ({ view, ...props }) => view === 'tiles' ? <GameTile {...props} /> : <GameListRow {...props} />;

// ── AchievementModal ───────────────────────────────────────────────────────────

// Profile header background: the latest game's art, blurred, fading into the header
// (layers in assets/ui.css). Fades in once loaded; the header stays flat until then.
const HeaderArt = ({ urls }) => {
    const art = useArtSrc(urls);
    if (!art.src) return null;
    return (
        <div className="art-bg art-header">
            <img src={art.src} alt="" ref={art.ref} onLoad={art.onLoad} onError={art.onError}
                className={art.loaded ? 'loaded' : ''} />
        </div>
    );
};

// Achievement list placeholder while the game's file loads
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

// Opens straight away; while `loading` (the game's file is being fetched) the header uses the
// card's summary and the list is a skeleton, then the panel grows to the real list.
const AchievementModal = ({ game, achievementData, onClose, beatenInfo, loading = false, onBack = null, backLabel = '' }) => {
    const [lockFilter, setLockFilter] = useState('all');
    const panelRef = useRef(null);
    useAnimatedHeight(panelRef);

    const achs = achievementData?.achievements ?? [];
    const pct  = achievementData?.total > 0
        ? (achievementData.unlocked / achievementData.total) * 100
        : null;
    const isPerfect = pct !== null && pct >= 100;
    const lastAgo = shortAgo(game.lastPlayedTs ? Date.parse(game.lastPlayedTs) : 0);

    const achCounts = useMemo(() => {
        const unlocked = achs.filter(a => a.unlocked).length;
        return { all: achs.length, unlocked, locked: achs.length - unlocked };
    }, [achs]);

    const filteredAchs = useMemo(() => {
        const unl = achs
            .filter(a => a.unlocked)
            .sort((a, b) => new Date(b.unlockedAt || 0) - new Date(a.unlockedAt || 0));
        const lck = achs.filter(a => !a.unlocked);
        if (lockFilter === 'unlocked') return unl;
        if (lockFilter === 'locked')   return lck;
        return [...unl, ...lck];
    }, [achs, lockFilter]);

    // Sheet on phone, dialog from md (assets/sheet.js): Escape, scroll lock, drag to close
    const rootRef = useRef(null);
    const dragRef = useRef(null);
    const close = useSheet({ panelRef, dragRef, rootRef, onClose });
    const art = useArtSrc([heroUrl(game.appId), headerUrl(game.appId)]);

    return (
        <div ref={rootRef} className="sheet-root" onClick={close}>
            <div className="sheet-backdrop anim-backdrop" />

            {/* Panel (height animates as the content changes on desktop) */}
            <div ref={panelRef} className="sheet-panel" onClick={e => e.stopPropagation()}>
                <button onClick={close} className="sheet-close" aria-label="Close"><X size={15} /></button>
                {onBack && <button onClick={onBack} className="sheet-back" aria-label={`Back to ${backLabel}`}><ChevronDown size={14} className="rotate-90" />{backLabel}</button>}

                {/* Header (shared SheetHead): blurred hero art behind it; drag it down to close on phone */}
                <SheetHead dragRef={dragRef} back={!!onBack}
                    art={art.src && <div className="art-bg art-sheet"><img src={art.src} alt="" ref={art.ref} onLoad={art.onLoad} onError={art.onError} className={art.loaded ? 'loaded' : ''} /></div>}
                    cover={
                        <a href={game.storeUrl} target="_blank" rel="noreferrer"
                            className="relative shrink-0 w-32 h-16 rounded-[2px] overflow-hidden border border-[#101214] bg-[#2a475e] shadow-[0_6px_18px_rgba(0,0,0,0.55)] hover:scale-105 transition-transform">
                            <img src={headerUrl(game.appId)} alt={game.name} className="w-full h-full object-cover" onError={bannerError(game.appId)} />
                        </a>
                    }
                    title={<a href={game.storeUrl} target="_blank" rel="noreferrer" className="transition-colors">{game.name}</a>}
                    tags={[
                        isPerfect && <span key="p" className="shrink-0 text-[9px] text-[#101214] bg-[#e5b143] px-1.5 py-[1px] rounded-sm font-bold uppercase tracking-wider flex items-center gap-1"><Star size={9} /> Perfect</span>,
                        !isPerfect && beatenInfo && <span key="b" className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded-sm flex items-center gap-1" style={{ background: '#2a3440', color: '#c6d4df', border: '1px solid rgba(184,196,206,0.3)' }}><Medal size={9} /> Beaten</span>,
                    ]}
                    stats={[
                        achievementData?.total > 0 && { value: achievementData.unlocked, total: achievementData.total, label: 'Achievements', color: '#66c0f4' },
                        game.playtimeForever > 0
                            ? { value: formatPlaytime(game.playtimeForever), label: 'Played', color: '#66c0f4' }
                            : { value: '–', label: 'Played', color: '#546270' },
                        { value: lastAgo ? `${lastAgo} ago` : 'Never', label: 'Last played', color: lastAgo ? '#c6d4df' : '#546270' },
                    ].filter(Boolean)}
                    bar={pct !== null ? { pct, color: isPerfect ? '#e5b143' : '#66c0f4' } : null}
                />

                {loading ? <ModalListSkeleton /> : (<>
                {/* Filter */}
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
                    </div>
                </div>

                {/* Achievement list (re-keyed so a filter change fades the new list in) */}
                <div key={lockFilter} className="sheet-scroll overflow-y-auto overscroll-contain flex-1 min-h-0 px-4 pt-3 space-y-1.5 anim-fade">
                    {filteredAchs.map(ach => (
                        <div
                            key={ach.apiName}
                            className={`flex items-center gap-3 p-2 rounded-[2px] border border-transparent border-l-[3px] transition-colors ${
                                ach.unlocked
                                    ? 'bg-[#202d39] hover:bg-[#253444]'
                                    : 'bg-[#171a21] opacity-75 border-l-[#323f4c]'
                            }`}
                            style={ach.unlocked ? { borderLeftColor: rarityBorderColor(ach.globalPct) } : undefined}
                        >
                            <div className="relative shrink-0 w-10 h-10 rounded-[2px] border border-[#101214] overflow-hidden bg-black">
                                {ach.iconUrl
                                    ? <img
                                        src={ach.unlocked ? achIconUrl(achievementData.appId, ach.iconUrl) : (achIconUrl(achievementData.appId, ach.iconGrayUrl) || achIconUrl(achievementData.appId, ach.iconUrl))}
                                        alt={ach.displayName}
                                        className={`w-full h-full object-cover ${!ach.unlocked ? 'grayscale brightness-40' : ''}`}
                                      />
                                    : <div className="w-full h-full bg-[#2a475e]" />
                                }
                                {!ach.unlocked && (
                                    <Lock size={14} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/50" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <div className={`text-[12px] font-medium tracking-wide leading-tight truncate mb-1 ${ach.unlocked ? 'text-[#e5b143]' : 'text-[#8f98a0]'}`}>
                                    {ach.displayName}
                                </div>
                                <p className="text-[10px] text-[#8f98a0] leading-snug mb-1.5">{ach.description || ach.displayName}</p>
                                {ach.globalPct != null && (
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                            <div className="relative h-1.5 bg-[#101214] rounded-full overflow-hidden w-full max-w-[180px]">
                                                <div className="absolute top-0 left-0 h-full rounded-full" style={{ width: `${Math.min(100, ach.globalPct)}%`, background: ach.unlocked ? rarityBorderColor(ach.globalPct) : '#323f4c' }} />
                                            </div>
                                            <div className="flex items-center gap-1 text-[8px] font-medium" style={{ color: ach.unlocked ? rarityBorderColor(ach.globalPct) : '#546270' }}>
                                                <Gem size={7} />
                                                {ach.unlocked ? `${rarityLabel(ach.globalPct)} · ${ach.globalPct}%` : `${ach.globalPct}%`}
                                            </div>
                                        </div>
                                        {ach.unlocked && ach.unlockedAt && (
                                            <p className="text-[9px] text-[#66c0f4] shrink-0">Unlocked: {formatDate(ach.unlockedAt)}</p>
                                        )}
                                    </div>
                                )}
                                {ach.globalPct == null && ach.unlocked && ach.unlockedAt && (
                                    <p className="text-[9px] text-[#66c0f4]">Unlocked: {formatDate(ach.unlockedAt)}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                </>)}
            </div>
        </div>
    );
};

// ── ActivityTab ───────────────────────────────────────────────────────────────

const ActivityTab = ({ achievements, heatmapData, gameIcons, gameArt, loading, hasMore, loadingMore, onLoadMore }) => {
    const [selectedDay,   setSelectedDay]   = useState(null);
    const [summaryOpen, toggleSummary] = useSummaryOpen();
    const sentinelRef  = useRef(null);
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
    }, [hasMore, loadingMore]);

    const loadedDays = useMemo(() => new Set(achievements.map(a => dayKey(a.unlockedAt))), [achievements]);

    // Auto-load next chunk when selected day has heatmap data but isn't loaded yet
    useEffect(() => {
        if (!selectedDay || !heatmapData[selectedDay] || loadedDays.has(selectedDay) || !hasMore || loadingMore) return;
        onLoadMoreRef.current();
    }, [selectedDay, loadedDays, hasMore, loadingMore]);

    // 365 local days ending today
    const days = useMemo(() => {
        const arr   = [];
        const today = todayKey();
        for (let i = 364; i >= 0; i--) {
            const key = addDays(today, -i);
            arr.push({ key, date: keyToDate(key) });
        }
        return arr;
    }, []);

    const weeks = useMemo(() => {
        const ws = [];
        for (let i = 0; i < days.length; i += 7) ws.push(days.slice(i, i + 7));
        return ws;
    }, [days]);

    const monthLabels = useMemo(() => {
        const labels = [];
        let lastMonth = -1;
        weeks.forEach((week, wi) => {
            const m = week[0].date.getMonth();
            if (m !== lastMonth) {
                labels.push({ wi, label: week[0].date.toLocaleDateString('en-GB', { month: 'short' }) });
                lastMonth = m;
            }
        });
        return labels;
    }, [weeks]);

    const maxCount = useMemo(() =>
        Math.max(1, ...Object.values(heatmapData).map(d => d.count)),
    [heatmapData]);

    const getColor = (key) => {
        const d = heatmapData[key];
        if (!d) return '#101214';
        const ratio = d.count / maxCount;
        if (ratio >= 0.8)  return '#e5b143';
        if (ratio >= 0.5)  return '#66c0f4';
        if (ratio >= 0.25) return '#2a6b9e';
        return '#1a4a70';
    };

    const timelineGroups = useMemo(() => {
        const source = selectedDay
            ? achievements.filter(a => dayKey(a.unlockedAt) === selectedDay)
            : achievements;

        const byDay = {};
        source.forEach(ach => {
            const day = dayKey(ach.unlockedAt);
            if (!byDay[day]) byDay[day] = [];
            byDay[day].push(ach);
        });

        return Object.entries(byDay)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([day, achs]) => {
                // Sessions = runs of consecutive unlocks in the same game (like cheevo-tracker),
                // so switching games mid-day keeps timeline order. Newest session first.
                const sessions = [];
                [...achs].sort((a, b) => toMs(a.unlockedAt) - toMs(b.unlockedAt)).forEach(ach => {
                    const last = sessions[sessions.length - 1];
                    if (last && last.appId === ach.appId) last.achievements.push(ach);
                    else sessions.push({ appId: ach.appId, gameName: ach.gameName, achievements: [ach] });
                });
                sessions.reverse();
                return { day, achCount: achs.length, sessions };
            });
    }, [achievements, selectedDay]);

    // Summary numbers: the last 14 days (folded row) and the past year (open card)
    const streak = useMemo(() => computeStreak(heatmapData, 1), [heatmapData]);
    const year = useMemo(() => yearOf(heatmapData), [heatmapData]);
    const recent = useMemo(() => {
        const from = addDays(todayKey(), -13);
        const recentAchs = achievements.filter(a => dayKey(a.unlockedAt) >= from);
        return { n: recentAchs.length, games: new Set(recentAchs.map(a => a.appId)).size };
    }, [achievements]);
    const describe = key => heatmapData[key] ? `${key} · ${heatmapData[key].count} achievement${heatmapData[key].count !== 1 ? 's' : ''}` : key;

    if (loading) {
        return <ActivitySkeleton />;
    }

    if (achievements.length === 0) {
        return (
            <div className="text-center py-12 text-[#546270] text-[12px] anim-fade">
                No achievements unlocked in the past year
            </div>
        );
    }


    const heatmap = (
        <div className="overflow-x-auto" ref={heatmapScrollRef}>
            <div style={{ minWidth: `${53 * 14}px` }}>
                {/* Month labels */}
                <div className="flex mb-1" style={{ paddingLeft: '28px' }}>
                    {weeks.map((_, wi) => {
                        const ml = monthLabels.find(m => m.wi === wi);
                        return (
                            <div key={wi} style={{ flex: 1, fontSize: '8px', color: '#546270', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                {ml ? ml.label : ''}
                            </div>
                        );
                    })}
                </div>

                <div className="flex gap-0">
                    {/* Day labels */}
                    <div className="flex flex-col gap-[2px] mr-1" style={{ paddingTop: '1px' }}>
                        {['M','','W','','F','','S'].map((l, i) => (
                            <div key={i} style={{ height: '12px', width: '20px', fontSize: '7px', lineHeight: '12px', textAlign: 'right', color: '#546270', flexShrink: 0 }}>{l}</div>
                        ))}
                    </div>

                    {/* Grid */}
                    <div className="flex flex-1 gap-[2px]">
                        {weeks.map((week, wi) => (
                            <div key={wi} className="flex flex-col gap-[2px] flex-1" style={{ minWidth: '10px' }}>
                                {week.map(({ key }) => (
                                    <div
                                        key={key}
                                        onClick={() => setSelectedDay(selectedDay === key ? null : key)}
                                        title={`${key}${heatmapData[key] ? ` · ${heatmapData[key].count} achievement${heatmapData[key].count !== 1 ? 's' : ''}` : ''}`}
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
                    { v: year.active, l: 'Active days' },
                    { v: year.best ? year.best.count : '–', l: 'Best day', sub: year.best ? fmtDay(year.best.key) : null },
                ]}
                streak={streak} heatmapData={heatmapData}
                cellLabel={key => heatmapData[key]?.count ?? ''} describe={describe}
                selectedDay={selectedDay} onSelectDay={setSelectedDay}
                heatmap={heatmap} />

            {/* ── Timeline ── */}
            <div>
                <div className="flex items-center gap-2 border-b border-[#2a475e] pb-1.5 mt-2 mb-1">
                    <span className="w-[3px] h-[14px] bg-[#e5b143] rounded-[1px] shrink-0" />
                    <span className="text-[13px] text-white tracking-wide uppercase font-medium">Recent Unlocks</span>
                    {selectedDay && (
                        <button onClick={() => setSelectedDay(null)} className="ml-auto fchip on anim-fade" style={{ height: 22 }}>{fmtDay(selectedDay)} ✕</button>
                    )}
                </div>

                {timelineGroups.length === 0 ? (
                    <div key={selectedDay ?? 'all'} className="text-[#8f98a0] text-[11px] py-4 italic text-center anim-fade">
                        {selectedDay ? 'No achievements on this day.' : 'No achievements unlocked in the last year.'}
                    </div>
                ) : (
                    <div key={selectedDay ?? 'all'} className="flex flex-col gap-4">
                        {timelineGroups.map(({ day, achCount, sessions }) => (
                            <section key={day} className="anim-fade">
                                <DayHead day={day}>
                                    <b>{achCount}</b> unlock{achCount !== 1 ? 's' : ''}{sessions.length > 1 ? ` · ${new Set(sessions.map(x => x.appId)).size} games` : ''}
                                </DayHead>
                                <div className="flex flex-col gap-2">
                                    {sessions.map(session => {
                                        const sorted = [...session.achievements].sort((a, b) => toMs(b.unlockedAt) - toMs(a.unlockedAt));
                                        const t0 = fmtTime(sorted[sorted.length - 1].unlockedAt), t1 = fmtTime(sorted[0].unlockedAt);
                                        return (
                                            <RunCard key={`${session.appId}-${sorted[0].unlockedAt}`}
                                                accent="#66c0f4" href={`https://store.steampowered.com/app/${session.appId}`} icon={gameIcons?.[session.appId]}
                                                art={[`https://cdn.akamai.steamstatic.com/steam/apps/${session.appId}/library_hero.jpg`, `https://cdn.akamai.steamstatic.com/steam/apps/${session.appId}/header.jpg`]}
                                                title={<span className="truncate">{session.gameName}</span>}
                                                sub={<>
                                                    <span>{t0 === t1 ? t0 : `${t0}–${t1}`}</span>
                                                    <RunCount n={sorted.length} />
                                                </>}
                                                rows={sorted.map((ach, ai) => (
                                                    <UnlockRow key={`${ach.apiName ?? ai}-${ach.unlockedAt}`}
                                                        icon={ach.iconUrl}
                                                        title={ach.displayName}
                                                        desc={ach.description && ach.description !== ach.displayName ? ach.description : null}
                                                        time={fmtTime(ach.unlockedAt)}
                                                        value={<em>{ach.globalPct != null && <span style={{ color: rarityBorderColor(ach.globalPct) }} title={rarityLabel(ach.globalPct)}>{ach.globalPct}%</span>}</em>} />
                                                ))} />
                                        );
                                    })}
                                </div>
                            </section>
                        ))}
                    </div>
                )}

                {/* Scroll sentinel */}
                {!selectedDay && hasMore && (
                    <div ref={sentinelRef} className="pt-2 flex flex-col gap-2">
                        {loadingMore && [...Array(2)].map((_, i) => <div key={i} className="shimmer h-[86px] rounded-[3px]" />)}
                    </div>
                )}
            </div>
        </div>
    );
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

// ── ProgressTab ───────────────────────────────────────────────────────────────

const ProgressTab = ({ achievementProgress, recentlyPlayed, onViewDetails, beatenMap, gameView, onGameView }) => {
    const [sort,        setSort]        = useState('pct');
    const [showPerfect, setShowPerfect] = useState(false);
    const [view,        setView]        = useState('all');
    const [search,      setSearch]      = useState('');

    const playtimeMap = useMemo(() => {
        const m = {};
        (recentlyPlayed || []).forEach(g => { m[g.appId] = g; });
        return m;
    }, [recentlyPlayed]);

    const [games, counts] = useMemo(() => {
        const list = Object.entries(achievementProgress)
            .filter(([, d]) => d.hasAchievements && d.unlocked > 0 && d.total > 0 && (!search || fold(d.gameName).includes(fold(search))))
            .map(([appId, d]) => {
                const pt = playtimeMap[Number(appId)];
                const lastUnlockedAt = d.lastUnlockedAt ?? null;
                return {
                    appId:           Number(appId),
                    gameName:        d.gameName ?? `App ${appId}`,
                    unlocked:        d.unlocked,
                    total:           d.total,
                    pct:             d.total > 0 ? (d.unlocked / d.total) * 100 : 0,
                    lastUnlockedAt,
                    // prefer enriched data from games.json, fall back to recentlyPlayed map
                    playtimeForever: d.playtimeForever ?? pt?.playtimeForever ?? 0,
                    playtime2Weeks:  d.playtime2Weeks  ?? pt?.playtime2Weeks  ?? 0,
                    lastPlayedTs:    d.lastPlayedTs    ?? pt?.lastPlayedTs    ?? null,
                };
            });

        const acc = {
            pct:          g => g.pct,
            left:         g => g.total - g.unlocked,
            lastPlayedMs: g => (g.lastPlayedTs ? Date.parse(g.lastPlayedTs) || 0 : 0),
            isCompleted:  g => g.unlocked >= g.total,
        };
        const counts = progressViewCounts(list, acc, showPerfect);
        const bucketed = applyProgressView(list, view, acc);
        if (bucketed) return [bucketed, counts];

        const sorted = list
            .filter(g => showPerfect || g.unlocked < g.total)
            .sort((a, b) => {
                if (sort === 'name')  return a.gameName.localeCompare(b.gameName);
                if (sort === 'hours') return b.playtimeForever - a.playtimeForever;
                if (sort === 'lastPlayed') {
                    if (!a.lastPlayedTs && !b.lastPlayedTs) return 0;
                    if (!a.lastPlayedTs) return 1;
                    if (!b.lastPlayedTs) return -1;
                    return b.lastPlayedTs.localeCompare(a.lastPlayedTs);
                }
                if (b.pct !== a.pct) return b.pct - a.pct;
                if (!a.lastUnlockedAt && !b.lastUnlockedAt) return 0;
                if (!a.lastUnlockedAt) return 1;
                if (!b.lastUnlockedAt) return -1;
                return b.lastUnlockedAt.localeCompare(a.lastUnlockedAt);
            });
        return [sorted, counts];
    }, [achievementProgress, playtimeMap, sort, showPerfect, search, view]);

    return (
        <div>
            <ProgressFilterBar
                view={view} onView={setView}
                sorts={PROGRESS_SORTS.map(s => ({ value: s.id, label: s.label }))}
                sort={sort} onSort={setSort}
                completedLabel="Perfect" showCompleted={showPerfect} onShowCompleted={setShowPerfect}
                counts={counts}
                search={search} onSearch={setSearch}
                viewToggle={<ViewToggle view={gameView} onChange={onGameView} />}
            />
            {/* Re-keyed on sort/view/filter changes so the new order fades in (not on search keystrokes) */}
            <div key={`${sort}-${view}-${showPerfect}-${gameView}`} className={`${gameView === 'tiles' ? 'gtiles' : 'glist'} anim-fade`}>
                {games.length === 0 && (
                    <div className="text-center py-12 text-[#546270] text-[12px]">
                        {search ? 'No games match your search.' : view !== 'all' ? 'No games in this view.' : 'No achievement progress tracked yet.'}
                    </div>
                )}
                {games.map(g => (
                    <GameCardFor view={gameView}
                        key={g.appId}
                        game={{
                            appId:           g.appId,
                            name:            g.gameName,
                            storeUrl:        `https://store.steampowered.com/app/${g.appId}`,
                            playtime2Weeks:  g.playtime2Weeks,
                            playtimeForever: g.playtimeForever,
                            lastPlayedTs:    g.lastPlayedTs,
                        }}
                        achievementData={achievementProgress[g.appId]}
                        onViewDetails={onViewDetails}
                        beatenInfo={beatenMap?.get(g.appId) ?? null}
                    />
                ))}
            </div>
        </div>
    );
};

// ── Skeletons ─────────────────────────────────────────────────────────────────

const Sk = ({ w = 'w-full', h = 'h-4', cls = '' }) => (
    <div className={`shimmer ${w} ${h} ${cls}`} />
);

// Placeholders for the lazy-loaded tabs (same look as the RA page's)
const GameViewSkeleton = ({ view, count = 5 }) => view === 'tiles' ? (
    <div className="gtiles">
        {[...Array(count + 1)].map((_, i) => (
            <div key={i} className="gtile"><div className="gtile-art shimmer" /><div className="gtile-body"><div className="shimmer h-3 w-3/4 rounded-[2px]" /><div className="shimmer h-1 rounded-[2px]" /></div></div>
        ))}
    </div>
) : (
    <div className="glist">
        {[...Array(count)].map((_, i) => (
            <div key={i} className="grow"><div className="grow-icon shimmer" /><div className="grow-main"><div className="shimmer h-3 w-2/3 rounded-[2px]" /><div className="shimmer h-2.5 w-1/2 rounded-[2px]" /></div></div>
        ))}
    </div>
);

const ProfileLoadingSkeleton = () => (
    <div className="min-h-screen bg-[#171a21] flex flex-col">
        <div className="bg-[#131a22] border-b border-[#101214] px-4 md:px-8 py-1.5 flex items-center gap-2">
            <Sk w="w-16" h="h-2.5" /><span className="text-[#2a475e]">›</span><Sk w="w-20" h="h-2.5" />
        </div>
        <header className="bg-[#1b2838] border-b border-[#2a475e] px-4 md:px-8 pt-8 pb-5 md:pt-5">
            <div className="max-w-5xl mx-auto flex items-center gap-5">
                <div className="shimmer w-20 h-20 md:w-24 md:h-24 rounded-[2px] shrink-0" />
                <div className="flex flex-col gap-2.5 flex-1">
                    <Sk w="w-44" h="h-6" />
                    <Sk w="w-24" h="h-3" />
                    <div className="flex gap-2 mt-1">
                        <Sk w="w-20" h="h-5" /><Sk w="w-28" h="h-5" /><Sk w="w-24" h="h-5" />
                    </div>
                </div>
            </div>
        </header>
        <main className="max-w-5xl lg:max-w-[79rem] mx-auto px-4 md:px-8 py-6 w-full flex-1">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 mb-8">
                <div className="flex flex-col gap-6">
                    <div><Sk w="w-40" h="h-3" cls="mb-3" /><div className="shimmer h-[80px] rounded-[3px]" /></div>
                    <div><Sk w="w-48" h="h-3" cls="mb-3" /><div className="shimmer h-[80px] rounded-[3px]" /></div>
                    <div>
                        <Sk w="w-24" h="h-3" cls="mb-3" />
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1 px-1">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="flex items-end py-[3px] gap-2">
                                    <Sk w="w-28" h="h-2.5" />
                                    <div className="flex-1 border-b border-dotted border-[#2a475e] mb-1" />
                                    <Sk w="w-16" h="h-2.5" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="shimmer rounded-[3px] h-[200px]" />
            </div>
            <div className="flex gap-6 border-b border-[#2a475e] mb-4 pb-2">
                {[...Array(3)].map((_, i) => <Sk key={i} w="w-24" h="h-3.5" />)}
            </div>
            {[...Array(3)].map((_, i) => (
                <div key={i} className="shimmer h-[90px] rounded-[3px] mb-3" />
            ))}
        </main>
    </div>
);

// ── App ───────────────────────────────────────────────────────────────────────

// ── Series (data/steam/series.json, edited in the admin) ───────────────────────
// Same cards and sheet as the RA Series tab (styles in assets/ui.css). A series shows once
// SERIES_MIN of its games are in the library; Steam has no points, so the sheet counts hours.
const SERIES_MIN = 3;

// Sub-series (admin, `groups`): each gets the same card from its own games, plus "Other" for games in none
const buildSeries = (seriesData, achProgress, perfectMap, beatenMap) => seriesData
    .filter(s => s.showProgress !== false)
    .map(series => buildSeriesCard(series, achProgress, perfectMap, beatenMap))
    .filter(c => c.total >= SERIES_MIN)
    .map(card => {
        const groups = card.series.groups ?? [];
        if (!groups.length) return card;
        const ids = card.series.gameIds.map(String), inGroup = new Set(groups.flatMap(g => g.gameIds.map(String)));
        const rest = ids.filter(id => !inGroup.has(id));
        const defs = [...groups, ...(rest.length ? [{ id: '_other', name: 'Other', gameIds: rest }] : [])]
            .map(g => ({ ...g, gameIds: g.gameIds.map(String).filter(id => ids.includes(id)) }));
        const subs = defs.map(g => ({ g, sc: buildSeriesCard({ id: `${card.series.id}/${g.id}`, name: g.name, gameIds: g.gameIds }, achProgress, perfectMap, beatenMap) }))
            .filter(({ sc }) => sc.total > 0)
            .map(({ g, sc }) => ({ ...sc, key: g.id, groupId: g.id, name: g.name,
                icon: sc.games.find(x => x.id === sc.coverId)?.icon ?? null, done: sc.perfect, beaten: sc.beatenCount, doneLabel: 'perfect' }));
        return subs.length ? { ...card, subs } : card;
    });

const buildSeriesCard = (series, achProgress, perfectMap, beatenMap) => {
    let started = 0, beatenCount = 0, perfect = 0, achEarned = 0, achTotal = 0, minutes = 0, latest = null;
    const games = series.gameIds.filter(id => achProgress[id]).map(id => {
        const d = achProgress[id];
        const hasAch = !!(d.hasAchievements && d.total > 0);
        const isPerfect = hasAch && d.unlocked >= d.total;
        const beaten = beatenMap.get(Number(id)) ?? null;
        const isStarted = hasAch && d.unlocked > 0 && !isPerfect;
        if (isPerfect) perfect++; else if (isStarted && beaten) beatenCount++; else if (isStarted) started++;
        if (hasAch) { achEarned += d.unlocked; achTotal += d.total; }
        minutes += d.playtimeForever ?? 0;
        const unlockMs = d.lastUnlockedAt ? toMs(d.lastUnlockedAt) : 0;
        if (unlockMs && (!latest || unlockMs > latest.ms)) latest = { ms: unlockMs, name: d.lastUnlockName, appId: Number(id), gameName: d.gameName, at: d.lastUnlockedAt, icon: (d.preview ?? []).find(a => a.displayName === d.lastUnlockName)?.iconUrl ?? null };
        const lastMs = Math.max(unlockMs, d.lastPlayedTs ? toMs(d.lastPlayedTs) : 0);
        return {
            id: Number(id), title: d.gameName ?? `App ${id}`, icon: d.iconUrl ?? null, hasAch, isPerfect, isStarted, beaten,
            awarded: hasAch ? d.unlocked : 0, numAchs: hasAch ? d.total : 0, lastMs, perfectInfo: perfectMap.get(Number(id)) ?? null,
            game: { appId: Number(id), name: d.gameName ?? `App ${id}`, storeUrl: `https://store.steampowered.com/app/${id}`, playtimeForever: d.playtimeForever ?? 0, playtime2Weeks: d.playtime2Weeks ?? 0, lastPlayedTs: d.lastPlayedTs ?? null },
            data: d,
        };
    });
    const tracked = games.filter(x => x.hasAch).length;
    // Cover: your ★ pick (admin), else the game with the most achievements you've unlocked, else the first
    // game that has achievements (nothing played yet), else the first game
    const mostUnlocked = games.filter(x => x.awarded > 0).sort((a, b) => b.awarded - a.awarded)[0];
    const coverId = games.some(x => x.id === Number(series.coverGameId)) ? Number(series.coverGameId)
        : mostUnlocked?.id ?? games.find(x => x.hasAch)?.id ?? games[0]?.id;
    return {
        series, games, total: games.length, tracked, started, beatenCount, perfect, achEarned, achTotal, minutes, latest, coverId,
        lastMs: Math.max(0, ...games.map(x => x.lastMs)),
        pct: achTotal > 0 ? (achEarned / achTotal) * 100 : 0,
    };
};

const seriesEdge = c => c.tracked > 0 && c.perfect === c.tracked ? '#e5b143' : c.started || c.beatenCount || c.perfect ? '#66c0f4' : '#323f4c';
const pctLabel = p => p > 0 && p < 1 ? '<1%' : `${Math.floor(p)}%`;
// Icons in the card strip: perfect and started first (latest first), then the rest by title
const seriesIconOrder = games => [...games].sort((a, b) => {
    const k = x => x.isPerfect ? 0 : x.isStarted ? 1 : x.hasAch ? 2 : 3;
    return (k(a) - k(b)) || (k(a) <= 1 ? b.lastMs - a.lastMs : a.title.localeCompare(b.title));
});
const SERIES_SORTS = [
    { value: 'name', label: 'Name' },
    { value: 'progress', label: 'Most progress' },
    { value: 'recent', label: 'Last played' },
    { value: 'games', label: 'Most games' },
];
const hoursLabel = m => m >= 600 ? `${Math.round(m / 60).toLocaleString()}h` : formatPlaytime(m);

const SeriesTab = ({ cards, onOpen }) => {
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('name');
    const [filter, setFilter] = useState('all');

    if (cards.length === 0) return (
        <div className="text-center py-12 text-[#546270] text-[12px] anim-fade">No series yet.</div>
    );

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
                        <button key={c.series.id} onClick={() => onOpen(c)} className="scard smooth" style={{ borderLeftColor: seriesEdge(c) }}>
                            <div className="scard-art"><img src={heroUrl(c.coverId)} alt="" loading="lazy" onError={heroFallback(c.coverId)} /></div>
                            <div className="scard-top">
                                <img src={headerUrl(c.coverId)} alt="" loading="lazy" className="scard-cover banner" onError={bannerError(c.coverId)} />
                                <div className="scard-main">
                                    <span className="scard-name">{c.series.name}</span>
                                    <span className="scard-sub">
                                        <span>{c.total} games</span>
                                        {statusPills({ done: c.perfect, doneLabel: 'perfect', beaten: c.beatenCount, started: c.started })}
                                    </span>
                                </div>
                                <span className="scard-end">
                                    <span className="scard-pct" style={{ color: c.pct > 0 ? '#e5b143' : '#546270' }}>{pctLabel(c.pct)}</span>
                                    {c.lastMs > 0 && <em title="Last activity in this series">{shortAgo(c.lastMs)}</em>}
                                </span>
                            </div>
                            <div className="gbar"><i style={{ width: `${c.pct}%`, background: '#e5b143' }} /></div>
                            <div className="sicons">
                                {icons.slice(0, 10).map(x => x.icon && <img key={x.id} src={x.icon} alt="" title={x.title} loading="lazy" className={x.isPerfect ? 'mastered' : x.awarded > 0 ? '' : x.hasAch ? 'dim' : 'noach'} />)}
                                {icons.length > 10 && <span>+{icons.length - 10}</span>}
                            </div>
                        </button>
                    );
                    return c.subs ? <SubFold key={c.series.id} subs={c.subs} onOpen={i => onOpen({ ...c, __sub: i })}>{card}</SubFold> : card;
                })}
            </div>
        </div>
    );
};

// A perfect game in the series sheet: its row, then a band with the date and the last achievement
const PerfectRow = ({ x, onOpenGame }) => {
    const p = x.perfectInfo;
    return (
        <div className="smast">
            <GameListRow game={x.game} achievementData={x.data} onViewDetails={onOpenGame} beatenInfo={x.beaten} />
            {p?.completedAt && (
                <div className="smast-band">
                    <div className="c"><b className="text-[#e5b143]"><Star size={10} fill="currentColor" className="inline -mt-0.5 mr-1" />{formatDate(p.completedAt)}</b><span>Perfect</span></div>
                    {p.lastAchName && (
                        <div className="c rare" title={`Last achievement: ${p.lastAchName}`}>
                            {p.lastAchIconUrl && <img src={p.lastAchIconUrl} alt="" loading="lazy" />}
                            <div><b style={{ color: rarityBorderColor(p.lastAchGlobalPct) }}>{p.lastAchGlobalPct != null ? `${p.lastAchGlobalPct}%` : 'Last'}</b><span>{p.lastAchName.replace(/^"|"$/g, '')}</span></div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// card.__sub: the sub-series picked (index into card.subs) or null for All; kept on the page's card, so a game
// opened from a sub-series comes back to it
const SeriesSheet = ({ card: series, onOpenGame, onClose, onScope }) => {
    const sub = series.subs && series.__sub != null ? series.__sub : null;
    const c = sub != null ? series.subs[sub] : series;
    const panelRef = useRef(null), rootRef = useRef(null), dragRef = useRef(null);
    useAnimatedHeight(panelRef);
    const close = useSheet({ panelRef, dragRef, rootRef, onClose });
    const art = useArtSrc([heroUrl(c.coverId), headerUrl(c.coverId)]);
    const groups = [
        { key: 'started', label: 'In progress',     games: c.games.filter(x => x.isStarted && !x.beaten).sort((a, b) => b.lastMs - a.lastMs) },
        { key: 'perfect', label: 'Perfect',         games: c.games.filter(x => x.isPerfect).sort((a, b) => b.lastMs - a.lastMs) },
        { key: 'beaten',  label: 'Beaten',          games: c.games.filter(x => x.isStarted && x.beaten).sort((a, b) => b.lastMs - a.lastMs) },
        { key: 'none',    label: 'Not started',     games: c.games.filter(x => x.hasAch && !x.awarded).sort((a, b) => a.title.localeCompare(b.title)) },
        { key: 'noach',   label: 'No achievements', games: c.games.filter(x => !x.hasAch).sort((a, b) => a.title.localeCompare(b.title)) },
    ].filter(gr => gr.games.length);
    const L = c.latest;
    return (
        <div ref={rootRef} className="sheet-root" onClick={close}>
            <div className="sheet-backdrop anim-backdrop" />
            <div ref={panelRef} className="sheet-panel" onClick={e => e.stopPropagation()}>
                <button onClick={close} className="sheet-close" aria-label="Close"><X size={15} /></button>
                <SheetHead dragRef={dragRef}
                    art={art.src && <div className="art-bg art-sheet"><img src={art.src} alt="" ref={art.ref} onLoad={art.onLoad} onError={art.onError} className={art.loaded ? 'loaded' : ''} /></div>}
                    cover={<img src={headerUrl(c.coverId)} alt="" className="relative shrink-0 w-32 h-16 rounded-[2px] border border-[#101214] bg-[#2a475e] shadow-[0_6px_18px_rgba(0,0,0,0.55)] object-cover" onError={bannerError(c.coverId)} />}
                    title={c.series.name}
                    meta={[sub != null && <button onClick={() => onScope(null)} className="inline-flex items-center gap-0.5 text-[#8f98a0] hover:text-[#c6d4df]"><ChevronLeft size={11} />{series.series.name}</button>, <span className="inline-flex items-center gap-1 text-[#66c0f4]"><Layers size={11} />{c.total} games</span>].filter(Boolean)}
                    tags={seriesTags({ done: c.perfect, doneLabel: 'Perfect', beaten: c.beatenCount, started: c.started })}
                    stats={[
                        { value: c.achEarned.toLocaleString(), total: c.achTotal.toLocaleString(), label: 'Achievements', color: '#66c0f4' },
                        { value: hoursLabel(c.minutes), label: 'Played', color: '#66c0f4' },
                    ]}
                    bar={c.achTotal > 0 ? { pct: c.pct, color: c.pct >= 100 ? '#e5b143' : '#66c0f4' } : null}
                    games={{ icon: <Layers size={11} />, items: c.games.map(x => ({ state: !x.hasAch ? 'noach' : x.isPerfect ? 'done' : x.isStarted && x.beaten ? 'beaten' : x.isStarted ? 'started' : 'none', pct: x.numAchs ? (x.awarded / x.numAchs) * 100 : 0 })) }}
                />
                {series.subs && <SubChips subs={series.subs} total={series.total} allPct={series.pct} active={sub} onPick={onScope} />}
                <div key={sub ?? 'all'} className="sheet-scroll overflow-y-auto overscroll-contain flex-1 min-h-0 px-4 pt-3 flex flex-col gap-2 anim-fade">
                    {series.subs && sub == null && <SubStrip subs={series.subs} onPick={onScope} />}
                    {L && <div className={`ssheet-sec ${series.subs && sub == null ? 'next' : ''}`} style={{ '--c': '#e5b143' }}>Latest unlock</div>}
                    {L && (
                        <div className="grow compact" style={{ borderLeftColor: '#e5b143' }} title="Latest unlock in this series">
                            {L.icon ? <img src={achIconUrl(L.appId, L.icon)} alt="" className="grow-icon" onError={e => { e.target.style.visibility = 'hidden'; }} /> : <img src={headerUrl(L.appId)} alt="" className="grow-banner" onError={bannerError(L.appId)} />}
                            <div className="grow-main">
                                <span className="grow-title" style={{ color: '#e5b143' }}><Trophy size={11} className="inline -mt-0.5 mr-1" />{L.name}</span>
                                <div className="grow-sub"><span className="text-[#66c0f4] shrink">{L.gameName}</span><span>· {formatTimeAgo(L.at)}</span></div>
                            </div>
                        </div>
                    )}
                    <div className={`ssheet-sec ${L || (series.subs && sub == null) ? 'next' : ''}`} style={{ '--c': '#66c0f4' }}>Games<span className="n">{c.total}</span></div>
                    {groups.map(gr => (
                        <React.Fragment key={gr.key}>
                            <div className="ssheet-group">{gr.label}<span className="n">{gr.games.length}</span></div>
                            {gr.games.map(x => x.isPerfect
                                ? <PerfectRow key={x.id} x={x} onOpenGame={onOpenGame} />
                                : <GameListRow key={x.id} game={x.game} achievementData={x.data} onViewDetails={onOpenGame} beatenInfo={x.beaten} />)}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
};

const App = () => {
    const [profileData,       setProfileData]       = useState(null);
    const [gamesData,         setGamesData]         = useState(null);
    // All 4 chunks load together when Activity opens: the heatmap needs every unlock's
    // timestamp to group them into the viewer's local days. The timeline still reveals
    // them one chunk at a time (shownChunks).
    const [achievementChunks, setAchievementChunks] = useState([null, null, null, null]);
    const [shownChunks,       setShownChunks]       = useState(1);
    const [loadingChunkIdx,   setLoadingChunkIdx]   = useState(null);
    const [loading,           setLoading]           = useState(true);
    const [error,             setError]             = useState(null);
    const [selectedGame,     setSelectedGame]     = useState(null);
    const [gameDetails,       setGameDetails]       = useState({});
    const [beatenGames,       setBeatenGames]       = useState([]);
    const [beatenLoaded,      setBeatenLoaded]      = useState(false);   // win-condition games fetched (Completions shows a skeleton until then)
    const [seriesData,        setSeriesData]        = useState([]);
    const [selectedSeries,    setSelectedSeries]    = useState(null);   // series sheet
    const [seriesBack,        setSeriesBack]        = useState(null);   // series to return to from a game opened in it
    const VALID_TABS = ['overview', 'recent', 'progress', 'series', 'activity'];
    const initialTab = (() => {
        const p = new URLSearchParams(window.location.search).get('tab');
        return VALID_TABS.includes(p) ? p : 'overview';
    })();
    const [activeTab, setActiveTab] = useState(initialTab);
    // Overview, wide screens only: the latest unlocks for the list under the newest one
    const [ovUnlocks, setOvUnlocks] = useState(null);
    useEffect(() => {
        if (activeTab !== 'overview' || ovUnlocks || !window.matchMedia('(min-width: 1024px)').matches) return;
        fetch('../../data/steam/achievements/1.json')
            .then(r => r.ok ? r.json() : { recentAchievements: [] })
            .then(d => setOvUnlocks([...(d.recentAchievements ?? [])].sort((a, b) => toMs(b.unlockedAt) - toMs(a.unlockedAt)).slice(0, 6)))
            .catch(() => setOvUnlocks([]));
    }, [activeTab]);
    const [gameView, setGameView] = useGameView();
    const [recentSearch, setRecentSearch] = useState('');
    const [showScrollTop, setShowScrollTop] = useState(false);
    const tabBarRef = useRef(null);
    const tabContentRef = useRef(null);
    const setTab = (tab) => {
        setActiveTab(tab);
        const url = new URL(window.location);
        url.searchParams.set('tab', tab);
        window.history.replaceState({}, '', url);
        scrollToTabs(tabBarRef);
    };

    useEffect(() => {
        const onScroll = () => setShowScrollTop(window.scrollY > 400);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Series (admin-made); shown once SERIES_MIN of a series' games are in the library
    useEffect(() => {
        fetch('../../data/steam/series.json').then(r => r.ok ? r.json() : []).then(d => setSeriesData(Array.isArray(d) ? d : [])).catch(() => {});
    }, []);
    const seriesCards = useMemo(() => gamesData ? buildSeries(
        seriesData, gamesData.achievementProgress ?? {},
        new Map((profileData?.perfectGames ?? []).map(g => [g.appId, g])),
        new Map(beatenGames.map(g => [g.appId, g])),
    ) : [], [seriesData, gamesData, profileData, beatenGames]);
    const hasSeries = seriesCards.length > 0;

    // Swipe between tabs on phones (assets/tabs.js); the order follows the tab bar
    const tabIds = ['overview', 'recent', 'progress', ...(hasSeries ? ['series'] : []), 'activity'];
    // Skeleton shape of each tab while it slides in (assets/tabs.js PEEK_PARTS)
    const peekList = gameView === 'tiles' ? 'tiles' : 'list';
    const tabPeeks = {
        overview: ['h2', 'row', 'h2', 'unlock', 'h2', 'stats'],
        recent:   ['fbar', peekList],
        progress: ['chips', 'fbar', peekList],
        series:   ['fbar', 'chips', 'cards'],
        activity: ['h2', 'heatmap', 'h2', 'timeline'],
    };
    const [swipeDir, setSwipeDir] = useSwipeTabs(tabContentRef, tabIds, activeTab, setTab, !loading, tabPeeks);
    const pickTab = id => { setSwipeDir(null); setTab(id); };

    // Load win conditions + beaten game data
    useEffect(() => {
        fetch('../../data/steam/win-conditions.json')
            .then(r => r.json())
            .then(async wc => {
                const entries = Object.entries(wc);
                if (!entries.length) return;
                const results = await Promise.all(
                    entries.map(async ([appId, wc]) => {
                        try {
                            const isArr = Array.isArray(wc);
                            const mode  = isArr ? 'or' : (wc.mode || 'or');
                            const names = isArr ? wc : (wc.achievements || []);
                            const game = await fetch(`../../data/steam/games/${appId}.json`).then(r => r.json());
                            const matched = (game.achievements || [])
                                .filter(a => names.includes(a.apiName) && a.unlocked && a.unlockedAt);
                            if (mode === 'and') {
                                if (matched.length < names.length) return null;
                                matched.sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt));
                            } else {
                                if (!matched.length) return null;
                                matched.sort((a, b) => new Date(a.unlockedAt) - new Date(b.unlockedAt));
                            }
                            const pick = matched[0];
                            return {
                                appId: game.appId,
                                gameName: game.gameName,
                                iconUrl: game.iconUrl,
                                total: game.total,
                                playtimeForever: game.playtimeForever,
                                beatenAt: pick.unlockedAt,
                                winConditionName: pick.displayName,
                                winCondIconHash: pick.iconUrl,
                                winCondGlobalPct: pick.globalPct,
                            };
                        } catch { return null; }
                    })
                );
                setBeatenGames(results.filter(Boolean));
            })
            .catch(() => {})
            .finally(() => setBeatenLoaded(true));
    }, []);

    // Load profile on mount
    useEffect(() => {
        fetch('../../data/steam/profile.json')
            .then(r => { if (!r.ok) throw new Error('Steam data not found'); return r.json(); })
            .then(p => { setProfileData(p); setLoading(false); })
            .catch(e => { setError(e.message); setLoading(false); });
    }, []);

    const loadAllChunks = () => {
        setLoadingChunkIdx(0);
        Promise.all([1, 2, 3, 4].map(i =>
            fetch(`../../data/steam/achievements/${i}.json`)
                .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
                .then(data => data.recentAchievements ?? [])
                .catch(() => [])
        )).then(chunks => {
            setAchievementChunks(chunks);
            setLoadingChunkIdx(null);
        });
    };

    const loadNextChunk = () => setShownChunks(n => Math.min(n + 1, achievementChunks.length));

    // Load all chunks when Activity tab opens
    useEffect(() => {
        if (activeTab !== 'activity') return;
        if (achievementChunks[0] === null && loadingChunkIdx === null) loadAllChunks();
    }, [activeTab]);

    // Load games/index.json for every tab (Overview's Last played shows progress; Recent was the old default and loaded it too)
    useEffect(() => {
        if (['overview', 'recent', 'progress', 'series', 'activity'].includes(activeTab) && profileData && !gamesData) {
            fetch('../../data/steam/games/index.json')
                .then(r => r.json())
                .then(d => { setMovedHeaders(d.achievementProgress); setGamesData(d); })
                .catch(() => setGamesData({ achievementProgress: {} }));
        }
    }, [activeTab, profileData, gamesData]);

    const handleViewDetails = useCallback(async ({ game, achievementData, beatenInfo }) => {
        const appId = game.appId;
        if (gameDetails[appId]) {
            setSelectedGame({ game, achievementData: gameDetails[appId], beatenInfo });
            return;
        }
        // Open now with the card's summary; fill in when the file arrives (unless closed meanwhile)
        setSelectedGame({ game, achievementData, beatenInfo, loading: true });
        const fill = (data) => setSelectedGame(prev => (prev?.game.appId === appId ? { game, achievementData: data, beatenInfo } : prev));
        try {
            const data = await fetch(`../../data/steam/games/${appId}.json`).then(r => r.json());
            setGameDetails(prev => ({ ...prev, [appId]: data }));
            fill(data);
        } catch {
            fill(achievementData);
        }
    }, [gameDetails]);

    // ?game=<appId> (from series/): open that game's sheet once the index is in, then drop the parameter
    const deepGame = useRef(new URLSearchParams(location.search).get('game'));
    useEffect(() => {
        if (!deepGame.current || !gamesData) return;
        const id = deepGame.current, d = gamesData.achievementProgress?.[id];
        deepGame.current = null;
        const u = new URL(location.href); u.searchParams.delete('game'); history.replaceState({}, '', u);
        if (!d) return;
        handleViewDetails({
            game: { appId: Number(id), name: d.gameName ?? `App ${id}`, storeUrl: `https://store.steampowered.com/app/${id}`, playtimeForever: d.playtimeForever ?? 0, playtime2Weeks: d.playtime2Weeks ?? 0, lastPlayedTs: d.lastPlayedTs ?? null },
            achievementData: d, beatenInfo: beatenGames.find(g => String(g.appId) === id) ?? null,
        });
    }, [gamesData]);

    // Derived state — read pre-computed fields from JSON, no client-side iteration needed
    const achProgress  = gamesData?.achievementProgress ?? {};
    const recentAchs   = useMemo(() =>
        achievementChunks.slice(0, shownChunks).filter(c => c !== null).flat()
            .sort((a, b) => toMs(b.unlockedAt) - toMs(a.unlockedAt)),
    [achievementChunks, shownChunks]);
    const heatmapData  = useMemo(() =>
        buildHeatmap(achievementChunks.filter(c => c !== null).flat(), a => a.unlockedAt),
    [achievementChunks]);
    const perfectGames = [...(profileData?.perfectGames ?? [])].sort((a, b) => {
        if (a.lastAchGlobalPct == null && b.lastAchGlobalPct == null) return 0;
        if (a.lastAchGlobalPct == null) return 1;
        if (b.lastAchGlobalPct == null) return -1;
        return a.lastAchGlobalPct - b.lastAchGlobalPct;
    });
    const perfectAppIds = new Set(perfectGames.map(g => g.appId));
    const beatenOnly    = beatenGames
        .filter(g => !perfectAppIds.has(g.appId))
        .sort((a, b) => new Date(b.beatenAt) - new Date(a.beatenAt));
    const beatenMap     = useMemo(() => new Map(beatenGames.map(g => [g.appId, g])), [beatenGames]);

    // Completions section (assets/completions.js): perfect games, then beaten-only games from the win conditions
    const openGameById = (id) => {
        const d = gamesData?.achievementProgress?.[id];
        if (!d) return;
        handleViewDetails({
            game: { appId: Number(id), name: d.gameName ?? `App ${id}`, storeUrl: `https://store.steampowered.com/app/${id}`, playtimeForever: d.playtimeForever ?? 0, playtime2Weeks: d.playtime2Weeks ?? 0, lastPlayedTs: d.lastPlayedTs ?? null },
            achievementData: d, beatenInfo: beatenGames.find(g => String(g.appId) === String(id)) ?? null,
        });
    };
    const completionItems = useMemo(() => {
        const perfect = profileData?.perfectGames ?? [], ids = new Set(perfect.map(g => g.appId));
        const art = (g) => ({ cover: headerUrl(g.appId), tile: headerUrl(g.appId), art: heroUrl(g.appId), artFallback: headerUrl(g.appId) });
        return [
            ...perfect.map(g => ({ key: g.appId, tier: 'gold', name: g.gameName, at: g.completedAt, minutes: g.playtimeForever,
                fact: g.lastAchName ? { label: g.lastAchName.replace(/^"|"$/g, ''), pct: g.lastAchGlobalPct, icon: 'trophy' } : null, ...art(g) })),
            ...beatenGames.filter(g => !ids.has(g.appId)).map(g => ({ key: g.appId, tier: 'silver', name: g.gameName, at: g.beatenAt, minutes: g.playtimeForever,
                fact: g.winConditionName ? { label: g.winConditionName, pct: g.winCondGlobalPct } : null, ...art(g) })),
        ].map(x => ({ ...x, onOpen: () => openGameById(x.key) }));
    }, [profileData, beatenGames, gamesData]);

    if (loading) return <ProfileLoadingSkeleton />;

    if (error) return (
        <div className="flex items-center justify-center min-h-screen bg-[#171a21] text-[#546270] anim-fade">
            <div className="text-center">
                <div className="text-[14px] mb-2">Could not load Steam data</div>
                <div className="text-[11px]">{error}</div>
            </div>
        </div>
    );

    const { profile, stats, recentlyPlayed, metadata, mostRecentGame } = profileData;
    // Recent tab: the recently played list; a search looks through every game, newest played first (up to 50)
    const recentShown = !recentSearch ? recentlyPlayed : Object.entries(achProgress)
        .filter(([, d]) => fold(d.gameName).includes(fold(recentSearch)))
        .map(([id, d]) => ({ appId: Number(id), name: d.gameName ?? `App ${id}`, storeUrl: `https://store.steampowered.com/app/${id}`, playtimeForever: d.playtimeForever ?? 0, playtime2Weeks: d.playtime2Weeks ?? 0, lastPlayedTs: d.lastPlayedTs ?? null }))
        .sort((a, b) => (b.lastPlayedTs || '').localeCompare(a.lastPlayedTs || ''))
        .slice(0, 50);
    const status = STEAM_STATUS[profile.status] ?? STEAM_STATUS[0];

    const completionPct    = stats.completionPct ?? 0;
    const mostRecentUnlock  = profileData?.mostRecentUnlock ?? null;
    const mostRecentGameAch = mostRecentGame
        ? (recentAchs.find(a => a.appId === mostRecentGame.appId) ?? null)
        : null;
    const avgPlaytime      = stats.avgPlaytimeMin > 0
        ? formatPlaytime(stats.avgPlaytimeMin)
        : '—';

    const statsLeft = [
        { label: 'Total games',         value: stats.totalGames.toLocaleString() },
        { label: 'Games with playtime', value: stats.gamesWithPlaytime.toLocaleString() },
        { label: 'Hours played',        value: `${stats.totalPlaytimeHrs.toLocaleString()}h` },
        { label: 'Avg per game',        value: avgPlaytime },
    ];
    const statsRight = [
        { label: 'Achievements',           value: `${stats.unlockedAchievements.toLocaleString()} / ${stats.totalAchievements.toLocaleString()}` },
        { label: 'Games w/ achievements',  value: stats.gamesWithAchievements.toLocaleString() },
        { label: 'Overall completion',     value: `${completionPct}%` },
        { label: 'Perfect games',          value: (stats.perfectCount ?? (gamesData ? perfectGames.length : null))?.toString() ?? '—' },
    ];

    return (
        <div className="bg-[#171a21] text-[#c6d4df] min-h-screen flex flex-col font-sans selection:bg-[#66c0f4] selection:text-[#171a21]">
            <style>{`
            `}</style>

            {/* Topbar */}
            <div className="page-topbar sticky top-0 z-50 bg-[#131a22] border-b border-[#101214] px-4 md:px-8 py-1.5 flex items-center gap-2 text-[10px]">
                <a href="../../" className="text-[#546270] font-bold tracking-[0.15em] uppercase hover:text-[#8f98a0] transition-colors">Yozuryu</a>
                <span className="text-[#2a475e]">›</span>
                <a href="../../" className="text-[#546270] hover:text-[#8f98a0] transition-colors">Gaming Hub</a>
                <span className="text-[#2a475e]">›</span>
                <span className="text-[#c6d4df]">Steam</span>
            </div>

            {/* Header */}
            <header className="phead anim-fade">
                <HeaderArt urls={recentlyPlayed[0] ? [heroUrl(recentlyPlayed[0].appId), headerUrl(recentlyPlayed[0].appId)] : []} />
                <div className="phead-in art-shadow">
                    <div className="phead-main">
                        <div className="phead-top">
                            <div className="phead-av">
                                <img src={profile.avatar} alt={profile.displayName} />
                                <span className="dot" title={status.label} style={{ background: status.color }} />
                            </div>
                            <div className="phead-id">
                                <div className="phead-name">
                                    <h1>{profile.displayName}</h1>
                                    <a href={profile.profileUrl} target="_blank" rel="noreferrer" title="View on Steam" className="phead-link">
                                        <img src="https://store.steampowered.com/favicon.ico" alt="Steam" />
                                    </a>
                                </div>
                                <div className="phead-sub flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.07em]" style={{ color: status.color }}>{status.label}</span>
                                    {profile.lastOnline && profile.status !== 1 && <span>· Last online {formatTimeAgo(profile.lastOnline)}</span>}
                                </div>
                                <div className="phead-sub phone-only">Last change <b>{formatDate(metadata.extractionTimestamp)}</b></div>
                            </div>
                        </div>
                    </div>

                    <div className="phead-side">
                        <div className="phead-stats">
                            <div className="phead-stat"><b className="text-[#66c0f4]">{stats.totalPlaytimeHrs.toLocaleString()}h</b><span>Played</span></div>
                            <div className="phead-stat"><b className="text-[#c6d4df]">{stats.totalGames.toLocaleString()}</b><span>Games</span></div>
                            <div className="phead-stat"><b className="text-[#66c0f4]">{stats.unlockedAchievements.toLocaleString()}</b><span>Achievements</span></div>
                        </div>
                        <div className="phead-meta">Last change <b>{formatDate(metadata.extractionTimestamp)}</b></div>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl lg:max-w-[79rem] mx-auto px-4 md:px-8 py-6 flex-1 w-full anim-in">

                {/* ── Overview 2-column ── */}
                {/* ── Tabs: sticky, scroll sideways, swipe between them on phones (assets/tabs.js) ── */}
                <div className="ptabs-anchor" />
                <TabBar barRef={tabBarRef} active={activeTab} onChange={pickTab} tabs={[
                    { id: 'overview', label: 'Overview', icon: <User size={15} />,      color: '#66c0f4' },
                    { id: 'recent',   label: 'Recent',   icon: <Clock size={15} />,     color: '#66c0f4' },
                    { id: 'progress', label: 'Progress', icon: <BarChart2 size={15} />, color: '#66c0f4' },
                    ...(hasSeries || activeTab === 'series' ? [{ id: 'series', label: 'Series', icon: <Layers size={15} />, color: '#66c0f4' }] : []),
                    { id: 'activity', label: 'Activity', icon: <Activity size={15} />,  color: '#66c0f4' },
                ]} />

                {/* ── Tab content ── (re-keyed per tab so each tab fades in; the swipe listener sits on the
                    stable wrapper, the keyed child is replaced on every tab change) */}
                <div ref={tabContentRef}>
                <div key={activeTab} className={`flex flex-col gap-3 ${swipeDir === 'swipe' ? '' : 'anim-in'}`}>

                    {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 lg:gap-8">

                        {/* Left column */}
                        <div className="flex flex-col gap-6">

                            {/* Last played: the same row as Recent / Progress (tap opens the sheet), with that game's latest unlock inside it */}
                            <div>
                                <h2 className="text-[13px] text-white tracking-wide uppercase font-medium border-b border-[#2a475e] pb-1.5 flex items-center gap-2 mb-3">
                                    <span className="w-[3px] h-[14px] bg-[#66c0f4] rounded-[1px] shrink-0" />
                                    <Activity size={15} className="text-[#66c0f4]" /> Last Played
                                </h2>
                                {mostRecentGame ? (
                                        <GameListRow game={{ ...mostRecentGame, storeUrl: `https://store.steampowered.com/app/${mostRecentGame.appId}` }} achievementData={achProgress[mostRecentGame.appId]}
                                            onViewDetails={handleViewDetails} beatenInfo={beatenMap.get(mostRecentGame.appId) ?? null} extra={mostRecentGameAch && (
                                            <span className="grow-extra"><Trophy size={11} className="text-[#e5b143]" />{mostRecentGameAch.displayName} <em>· {formatTimeAgo(mostRecentGameAch.unlockedAt)}</em></span>
                                        )} />
                                ) : (
                                    <div className="text-[#8f98a0] text-[11px] py-2">No recently played games.</div>
                                )}
                            </div>

                            {/* Most Recently Unlocked */}
                            <div>
                                <h2 className="text-[13px] text-white tracking-wide uppercase font-medium border-b border-[#2a475e] pb-1.5 flex items-center gap-2 mb-3">
                                    <span className="w-[3px] h-[14px] bg-[#e5b143] rounded-[1px] shrink-0" />
                                    <Trophy size={15} className="text-[#e5b143]" /> Recent unlocks
                                </h2>
                                {mostRecentUnlock ? (
                                    <div className="bg-[#1b2838]/80 border border-[#323f4c] border-l-[3px] border-l-[#e5b143] rounded-[3px] p-3 flex items-center gap-3 hover:bg-[#202d39] transition-colors shadow-sm">
                                        <div className="shrink-0 w-12 h-12 rounded-[2px] overflow-hidden border border-[#101214] bg-black">
                                            {mostRecentUnlock.iconUrl
                                                ? <img src={mostRecentUnlock.iconUrl} alt={mostRecentUnlock.displayName} className="w-full h-full object-cover" />
                                                : <div className="w-full h-full bg-[#2a475e]" />
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col">
                                            <div className="text-[13px] font-medium truncate leading-tight mb-0.5 text-[#e5b143]">
                                                {mostRecentUnlock.displayName}
                                            </div>
                                            <p className="text-[10px] text-[#8f98a0] leading-snug mb-0.5 truncate">
                                                {mostRecentUnlock.description || mostRecentUnlock.displayName}
                                            </p>
                                            {mostRecentUnlock.globalPct != null && (
                                                <div className="flex items-center gap-1 text-[9px] font-medium mb-1" style={{ color: rarityBorderColor(mostRecentUnlock.globalPct) }}>
                                                    <Gem size={9} />
                                                    {rarityLabel(mostRecentUnlock.globalPct)} · {mostRecentUnlock.globalPct}%
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1.5 text-[10px]">
                                                <img
                                                    src={achProgress[mostRecentUnlock.appId]?.iconUrl}
                                                    alt=""
                                                    className="w-4 h-4 rounded-[1px] border border-[#101214] object-cover"
                                                    onError={e => { e.target.style.display = 'none'; }}
                                                />
                                                <a href={`https://store.steampowered.com/app/${mostRecentUnlock.appId}`} target="_blank" rel="noreferrer" className="text-[#66c0f4] hover:text-[#c6d4df] transition-colors">{mostRecentUnlock.gameName}</a>
                                                <span className="text-[#546270]">•</span>
                                                <span className="text-[#546270]">{formatTimeAgo(mostRecentUnlock.unlockedAt)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-[#8f98a0] text-[11px] py-2 italic">
                                        No achievements unlocked in the last year.
                                    </div>
                                )}
                                {/* Wide screens: the next few unlocks as compact rows */}
                                {ovUnlocks?.some(a => !(mostRecentUnlock && a.appId === mostRecentUnlock.appId && a.apiName === mostRecentUnlock.apiName)) && (
                                    <div className="ulist anim-fade">
                                        {ovUnlocks.filter(a => !(mostRecentUnlock && a.appId === mostRecentUnlock.appId && a.apiName === mostRecentUnlock.apiName)).slice(0, 5).map(a => (
                                            <div key={`${a.appId}-${a.apiName}`} className="urow">
                                                {a.iconUrl ? <img src={a.iconUrl} alt="" loading="lazy" /> : <span className="w-8 h-8 shrink-0 rounded-[2px] bg-[#2a475e]" />}
                                                <div className="urow-main">
                                                    <span className="urow-title">{a.displayName}</span>
                                                    <span className="urow-sub"><span className="text-[#66c0f4]">{a.gameName}</span> · {formatTimeAgo(a.unlockedAt)}</span>
                                                </div>
                                                <span className="urow-end" style={{ color: rarityBorderColor(a.globalPct) }}>{a.globalPct}%</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* Rail (wide screens): user stats, then completions. Phone: below the left column, same order */}
                        <div className="prail flex flex-col gap-5">
                            {/* User Stats: tiles, value over label; the header already shows the headline numbers */}
                            <div>
                                <h2 className="text-[13px] text-white tracking-wide uppercase font-medium border-b border-[#2a475e] pb-1.5 flex items-center gap-2 mb-3">
                                    <span className="w-[3px] h-[14px] bg-[#66c0f4] rounded-[1px] shrink-0" />
                                    <BarChart2 size={15} className="text-[#66c0f4]" /> User Stats
                                </h2>
                                <StatTiles items={[...statsLeft, ...statsRight].filter(st => !['Total games', 'Hours played'].includes(st.label))} />
                            </div>
                            <CompletionsPanel title="Completions" labels={{ gold: 'Perfect', silver: 'Beaten' }} shape="wd" items={completionItems} loading={!beatenLoaded} />
                        </div>

                    </div>
                    )}

                    {activeTab === 'recent' && (
                        gamesData
                            ? <div className="flex flex-col gap-3 anim-fade">
                                {/* A search over the whole library (newest played first) and the list / tiles switch */}
                                <div className="fbar">
                                    <div className="fsearch">
                                        <Search size={14} />
                                        <input type="text" inputMode="search" value={recentSearch} onChange={e => setRecentSearch(e.target.value)} placeholder="Search games" aria-label="Search games" />
                                        {recentSearch && <button onClick={() => setRecentSearch('')} aria-label="Clear search"><X size={13} /></button>}
                                    </div>
                                    <ViewToggle view={gameView} onChange={setGameView} />
                                </div>
                                {recentSearch && recentShown.length === 0 && <div className="text-center py-12 text-[#546270] text-[12px]">No games match your search.</div>}
                                <div key={gameView} className={`${gameView === 'tiles' ? 'gtiles' : 'glist'} anim-fade`}>
                                    {recentShown.map(game => {
                                        const Card = gameView === 'tiles' ? GameTile : GameListRow;
                                        return <Card key={game.appId} game={game} achievementData={achProgress[game.appId]} onViewDetails={handleViewDetails} beatenInfo={beatenMap.get(game.appId) ?? null} />;
                                    })}
                                </div>
                              </div>
                            : <GameViewSkeleton view={gameView} />
                    )}

                    {activeTab === 'progress' && (
                        gamesData
                            ? <ProgressTab achievementProgress={achProgress} recentlyPlayed={recentlyPlayed} onViewDetails={handleViewDetails} beatenMap={beatenMap} gameView={gameView} onGameView={setGameView} />
                            : <GameViewSkeleton view={gameView} />
                    )}

                    {activeTab === 'series' && (
                        gamesData
                            ? <SeriesTab cards={seriesCards} onOpen={setSelectedSeries} />
                            : <GameViewSkeleton view="list" />
                    )}

                    {activeTab === 'activity' && (
                        <ActivityTab
                            achievements={recentAchs}
                            heatmapData={heatmapData}
                            gameIcons={Object.fromEntries(Object.entries(gamesData?.achievementProgress ?? {}).map(([id, g]) => [id, g.iconUrl]))}
                            loading={loadingChunkIdx !== null || achievementChunks[0] === null}
                            hasMore={shownChunks < achievementChunks.length}
                            loadingMore={false}
                            onLoadMore={loadNextChunk}
                        />
                    )}

                </div>
                </div>

            </main>

            {/* Footer */}
            <footer className="bg-[#1b2838] border-t-2 border-[#2a475e] px-4 md:px-8 py-2.5 flex items-center gap-3 mt-auto">
                <div className="w-[3px] h-[18px] rounded-[1px] bg-[#66c0f4] opacity-50 shrink-0" />
                <p className="text-[10px] text-[#546270]">
                    Personal gaming hub ·
                    <span className="text-[#8f98a0] ml-1">{profile.profileUrl}</span>
                </p>
                <a href="https://store.steampowered.com" target="_blank" rel="noreferrer"
                    className="ml-auto text-[10px] text-[#546270] hover:text-[#66c0f4] transition-colors">
                    steampowered.com ↗
                </a>
            </footer>

            {/* Scroll-to-top button */}
            {showScrollTop && (
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="scroll-top-btn anim-fade fixed right-4 z-50 w-10 h-10 bg-[#131a22] border border-[#2a475e] hover:border-[#66c0f4] hover:text-[#66c0f4] text-[#8f98a0] rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-90"
                    style={{ bottom: '3.5rem' }}
                    title="Scroll to top"
                >
                    <ChevronDown size={16} className="rotate-180" />
                </button>
            )}

            {/* Achievement modal */}
            {selectedGame && (
                <AchievementModal
                    game={selectedGame.game}
                    achievementData={selectedGame.achievementData}
                    beatenInfo={selectedGame.beatenInfo}
                    loading={!!selectedGame.loading}
                    onClose={() => { setSelectedGame(null); setSeriesBack(null); }}
                    onBack={seriesBack ? () => { setSelectedGame(null); setSelectedSeries(seriesBack); setSeriesBack(null); } : null}
                    backLabel={seriesBack?.series.name}
                />
            )}

            {/* Series sheet: a game opened from it gets a way back */}
            {selectedSeries && (
                <SeriesSheet card={selectedSeries} onClose={() => setSelectedSeries(null)} onScope={i => setSelectedSeries(s => s && { ...s, __sub: i })}
                    onOpenGame={arg => { setSeriesBack(selectedSeries); setSelectedSeries(null); handleViewDetails(arg); }} />
            )}

        </div>
    );
};

createRoot(document.getElementById('root')).render(<App />);
