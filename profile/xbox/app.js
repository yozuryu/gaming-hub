import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Trophy, BarChart2, Activity, ChevronDown, Lock, Unlock, Star, Gem, Clock, X, Medal, Gamepad2 } from 'lucide-react';
import { PROGRESS_SORTS } from './utils/constants.js';
import { formatDate, formatTimeAgo, fmtDay, fmtTime, xboxSearchUrl, xboxProfileUrl, xboxImg, rarityLabel, rarityBorderColor } from './utils/helpers.js';

// Xbox 360 titles only return unlocked achievements (`partial: true`), but the
// total is known, so the rest are filled in as locked placeholders.
const lockedPlaceholder = (i) => ({
    apiName:     `placeholder-${i}`,
    displayName: 'Locked achievement',
    description: 'Unlock to reveal',
    unlocked:    false,
    unlockedAt:  null,
    iconUrl:     null,
    placeholder: true,
});
const withPlaceholders = (achs, data, limit = Infinity) => {
    if (!data?.partial) return achs;
    const missing = Math.max(0, Math.min((data.total ?? 0) - achs.length, limit - achs.length));
    return [...achs, ...Array.from({ length: missing }, (_, i) => lockedPlaceholder(i))];
};

// ── XboxGameCard ──────────────────────────────────────────────────────────────

const XboxGameCard = ({ game, achievementData, onViewDetails, beatenInfo }) => {
    const hasAch = achievementData?.hasAchievements && achievementData?.total > 0;
    const pct    = hasAch && achievementData.total > 0
        ? (achievementData.unlocked / achievementData.total) * 100
        : null;
    const isPerfect = pct !== null && pct >= 100;

    const stripeColor = isPerfect
        ? 'border-l-[#e5b143]'
        : beatenInfo
        ? 'border-l-[#b8c4ce]'
        : pct > 0
        ? 'border-l-[#66c0f4]'
        : hasAch
        ? 'border-l-[#323f4c]'
        : 'border-l-[#1e2a35]';

    // Use pre-computed fields from games/index.json (no achievements[] iteration needed)
    const lastUnlock  = hasAch && achievementData.lastUnlockName
        ? { displayName: achievementData.lastUnlockName, unlockedAt: achievementData.lastUnlockedAt }
        : null;
    const previewAchs = hasAch ? withPlaceholders(achievementData.preview ?? [], achievementData, 6) : [];

    return (
        <div className={`flex flex-col bg-[#202d39] rounded-[3px] transition-transform duration-200 hover:-translate-y-0.5 border-l-[3px] border border-[#323f4c] shadow-md ${stripeColor}`}>

            {/* Main row — background scoped here so it doesn't stretch when expanded */}
            <div className="relative overflow-hidden rounded-t-[3px]">
                <div className="absolute inset-0 z-0 pointer-events-none">
                    {(achievementData?.heroUrl || game.heroUrl) && (
                        <img
                            src={xboxImg(achievementData?.heroUrl || game.heroUrl, 640)}
                            alt=""
                            className="absolute right-0 top-0 h-full w-full md:w-1/2 object-cover opacity-[0.45] mix-blend-screen mask-fade"
                            onError={e => { e.target.style.display = 'none'; }}
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#202d39] from-50% via-[#202d39]/80 to-transparent" />
                </div>

            <div className="relative z-10 flex items-center gap-3 md:gap-4 p-3">
                <a
                    href={game.storeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-[2px] shadow-sm border border-[#101214] overflow-hidden bg-[#2a475e] hover:scale-105 transition-transform"
                >
                    <img
                        src={xboxImg(achievementData?.iconUrl || game.iconUrl, 160)}
                        alt={game.name}
                        className="w-full h-full object-cover"
                        onError={e => { e.target.style.display = 'none'; }}
                    />
                </a>

                <div className="flex-1 min-w-0 flex flex-col justify-center">

                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <a
                            href={game.storeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[15px] md:text-base text-white font-medium tracking-wide hover:text-[#66c0f4] transition-colors leading-tight"
                        >
                            {game.name}
                        </a>
                        {isPerfect && (
                            <span className="text-[8px] font-bold uppercase tracking-[0.07em] px-1.5 py-[1px] rounded-[2px] bg-[#e5b143] text-[#101214] shrink-0 flex items-center gap-1">
                                <Star size={8} /> Completed
                            </span>
                        )}
                        {!isPerfect && beatenInfo && (
                            <span className="text-[8px] font-bold uppercase tracking-[0.07em] px-1.5 py-[1px] rounded-[2px] shrink-0 flex items-center gap-1" style={{ background: '#2a3440', color: '#c6d4df', border: '1px solid rgba(184,196,206,0.3)' }}>
                                <Medal size={8} /> Beaten
                            </span>
                        )}
                    </div>

                    {(hasAch || game.lastPlayedTs) && (
                        <div className="flex items-center leading-none gap-2 text-[10px] md:text-[11px] mb-1.5">
                            {hasAch && (
                                <span className="text-[#8f98a0]">
                                    <span className="text-[#c6d4df]">{(achievementData.gamerscore ?? 0).toLocaleString()}</span> / {(achievementData.totalGamerscore ?? 0).toLocaleString()} G
                                </span>
                            )}
                            {hasAch && game.lastPlayedTs && <span className="text-[#546270]">·</span>}
                            {game.lastPlayedTs && (
                                <span className="text-[#546270]">Last Played <span className="text-[#8f98a0]">{formatTimeAgo(game.lastPlayedTs)}</span></span>
                            )}
                        </div>
                    )}

                    {lastUnlock && (
                        <div className="flex items-center leading-none gap-1 text-[10px] mb-1.5 truncate">
                            <Trophy size={9} className="text-[#e5b143] shrink-0" />
                            <span className="text-[#c6d4df] truncate">{lastUnlock.displayName}</span>
                            <span className="text-[#546270] shrink-0">· {formatTimeAgo(lastUnlock.unlockedAt)}</span>
                        </div>
                    )}

                    {pct !== null && (
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-[#101214] h-[4px] rounded-sm overflow-hidden">
                                <div
                                    className="h-full rounded-sm transition-all duration-700"
                                    style={{ width: `${pct}%`, background: isPerfect ? '#e5b143' : '#66c0f4' }}
                                />
                            </div>
                            <div className="text-[10px] shrink-0 whitespace-nowrap" style={{ color: isPerfect ? '#e5b143' : '#8f98a0', textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.6)' }}>
                                <span className="text-[#c6d4df]">{achievementData.unlocked}</span>/{achievementData.total}
                                <span className="ml-0.5">({Math.floor(pct)}%)</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            </div>{/* end main-row background scope */}

            {/* Achievement preview strip */}
            {hasAch && onViewDetails && (
                <button
                    onClick={() => onViewDetails({ game, achievementData, beatenInfo })}
                    className="w-full flex items-center gap-2.5 px-3 py-2 bg-[#171a21] hover:bg-[#1b2838] transition-colors border-t border-[#323f4c] outline-none z-10 relative group rounded-b-[3px]"
                >
                    {/* Achievement icon previews */}
                    <div className="flex items-center gap-1 shrink-0">
                        {previewAchs.map((ach, i) => {
                            const isFirst = i === 0;
                            const isLast  = i === previewAchs.length - 1;
                            const tipPos  = isFirst ? 'left-0' : isLast ? 'right-0' : 'left-1/2 -translate-x-1/2';
                            const caretPos = isFirst ? 'ml-[7px]' : isLast ? 'mr-[7px] ml-auto' : 'mx-auto';
                            return (
                            <div key={i} className="relative shrink-0" style={{ zIndex: previewAchs.length - i }}>
                                {/* Icon */}
                                <div className={`w-8 h-8 rounded-[2px] overflow-hidden border bg-black transition-all peer ${ach.unlocked ? 'border-[#2a475e]' : 'border-[#1e2a35] opacity-40'}`}>
                                    {ach.iconUrl
                                        ? <img
                                            src={xboxImg(ach.iconUrl, 128)}
                                            alt={ach.displayName}
                                            className={`w-full h-full object-cover ${!ach.unlocked ? 'grayscale' : ''}`}
                                          />
                                        : <div className="w-full h-full bg-[#2a475e] flex items-center justify-center">
                                            {ach.placeholder && <Lock size={12} className="text-white/60" />}
                                          </div>
                                    }
                                </div>
                                {/* Tooltip */}
                                <div className={`pointer-events-none absolute bottom-full ${tipPos} mb-1.5 opacity-0 peer-hover:opacity-100 transition-opacity duration-150 z-50 w-max max-w-[160px]`}>
                                    <div className="bg-[#101214] border border-[#2a475e] rounded-[3px] px-2 py-1.5 shadow-lg">
                                        <div className={`text-[10px] font-medium leading-tight text-left ${ach.unlocked ? 'text-[#e5b143]' : 'text-[#8f98a0]'}`}>
                                            {ach.displayName}
                                        </div>
                                        <div className="text-[9px] mt-0.5 text-left leading-snug text-[#8f98a0]">
                                            {ach.description || ach.displayName}
                                        </div>
                                        {ach.unlocked
                                            ? <div className="flex items-center gap-1 mt-1">
                                                <Gem size={7} style={{ color: rarityBorderColor(ach.globalPct), flexShrink: 0 }} />
                                                <span className="text-[8px] font-medium text-left" style={{ color: rarityBorderColor(ach.globalPct) }}>
                                                    {rarityLabel(ach.globalPct)}{ach.globalPct != null ? ` · ${ach.globalPct}%` : ''}
                                                </span>
                                              </div>
                                            : <div className="text-[8px] text-[#546270] mt-1 text-left">Locked</div>
                                        }
                                    </div>
                                    <div className={`w-1.5 h-1.5 bg-[#101214] border-r border-b border-[#2a475e] rotate-45 -mt-[5px] ${caretPos}`} />
                                </div>
                            </div>
                            );
                        })}
                        {achievementData.total > previewAchs.length && (
                            <span className="text-[9px] text-[#546270] group-hover:text-[#8f98a0] transition-colors ml-0.5">
                                +{achievementData.total - previewAchs.length}
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

// ── AchievementModal ───────────────────────────────────────────────────────────

const AchievementModal = ({ game, achievementData, onClose, beatenInfo }) => {
    const [lockFilter, setLockFilter] = useState('all');

    const achs = withPlaceholders(achievementData?.achievements ?? [], achievementData);
    const pct  = achievementData.total > 0
        ? (achievementData.unlocked / achievementData.total) * 100
        : null;
    const isPerfect = pct !== null && pct >= 100;

    const filteredAchs = useMemo(() => {
        const unl = achs
            .filter(a => a.unlocked)
            .sort((a, b) => new Date(b.unlockedAt || 0) - new Date(a.unlockedAt || 0));
        const lck = achs.filter(a => !a.unlocked);
        if (lockFilter === 'unlocked') return unl;
        if (lockFilter === 'locked')   return lck;
        return [...unl, ...lck];
    }, [achs, lockFilter]);

    // Close on Escape
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    // Lock body scroll
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />

            {/* Panel */}
            <div
                className="relative z-10 w-full max-w-xl bg-[#1b2838] border border-[#2a475e] rounded-[4px] shadow-2xl flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Close button — absolute top-right */}
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 z-10 text-[#546270] hover:text-[#c6d4df] transition-colors outline-none"
                >
                    <X size={15} />
                </button>

                {/* Modal header */}
                <div className="flex items-center gap-4 px-4 py-4 border-b border-[#2a475e] shrink-0">
                    <a
                        href={game.storeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 w-16 h-16 rounded-[2px] overflow-hidden border border-[#101214] bg-[#2a475e] hover:scale-105 transition-transform"
                    >
                        <img src={xboxImg(achievementData?.iconUrl || game.iconUrl, 128)} alt={game.name} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
                    </a>
                    <div className="flex-1 min-w-0">
                        <a
                            href={game.storeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[15px] font-medium text-white hover:text-[#66c0f4] transition-colors leading-tight truncate block"
                        >
                            {game.name}
                        </a>
                        {(isPerfect || beatenInfo) && (
                            <div className="flex items-center gap-1.5 mt-1">
                                {isPerfect && (
                                    <span className="shrink-0 text-[9px] text-[#101214] bg-[#e5b143] px-1.5 py-[1px] rounded-sm font-bold uppercase tracking-wider flex items-center gap-1">
                                        <Star size={9} /> Completed
                                    </span>
                                )}
                                {!isPerfect && beatenInfo && (
                                    <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded-sm flex items-center gap-1" style={{ background: '#2a3440', color: '#c6d4df', border: '1px solid rgba(184,196,206,0.3)' }}>
                                        <Medal size={9} /> Beaten
                                    </span>
                                )}
                            </div>
                        )}
                        {pct !== null && (
                            <div className="flex items-center gap-2 mt-1.5">
                                <div className="flex-1 bg-[#101214] h-[3px] rounded-sm overflow-hidden">
                                    <div className="h-full rounded-sm" style={{ width: `${pct}%`, background: isPerfect ? '#e5b143' : '#66c0f4' }} />
                                </div>
                                <span className="text-[10px] shrink-0" style={{ color: isPerfect ? '#e5b143' : '#8f98a0' }}>
                                    <span className="text-[#c6d4df]">{achievementData.unlocked}</span>/{achievementData.total}
                                    <span className="ml-0.5">({Math.floor(pct)}%)</span>
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Filter bar */}
                <div className="flex items-center gap-2 px-4 py-2 border-b border-[#101214] shrink-0">
                    {[
                        { value: 'all',      label: 'All',      icon: null },
                        { value: 'unlocked', label: 'Unlocked', icon: <Unlock size={9} /> },
                        { value: 'locked',   label: 'Locked',   icon: <Lock size={9} /> },
                    ].map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setLockFilter(opt.value)}
                            className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-[3px] rounded-sm border transition-colors flex items-center gap-1 ${
                                lockFilter === opt.value
                                    ? 'bg-[#66c0f4] text-[#101214] border-[#66c0f4]'
                                    : 'bg-[#101214] text-[#8f98a0] border-[#323f4c] hover:text-[#c6d4df] hover:border-[#546270]'
                            }`}
                        >
                            {opt.icon}{opt.label}
                        </button>
                    ))}
                    <span className="ml-auto text-[9px] text-[#546270]">
                        {filteredAchs.length} / {achs.length}
                    </span>
                </div>

                {/* Achievement list */}
                <div className="overflow-y-auto overscroll-contain flex-1 px-4 py-3 space-y-1.5">
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
                                        src={xboxImg(ach.iconUrl, 128)}
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
                                <div className="flex items-center gap-2 mb-1 min-w-0">
                                    <div className={`text-[12px] font-medium tracking-wide leading-tight truncate ${ach.unlocked ? 'text-[#e5b143]' : 'text-[#8f98a0]'}`}>
                                        {ach.displayName}
                                    </div>
                                    {ach.gamerscore > 0 && (
                                        <span className={`text-[9px] font-semibold shrink-0 ${ach.unlocked ? 'text-[#c6d4df]' : 'text-[#546270]'}`}>{ach.gamerscore}G</span>
                                    )}
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
            </div>
        </div>
    );
};

// ── ActivityTab ───────────────────────────────────────────────────────────────

const ActivityTab = ({ achievements, heatmapData, gameIcons, loading, hasMore, loadingMore, onLoadMore }) => {
    const [selectedDay,   setSelectedDay]   = useState(null);
    const [collapsedDays, setCollapsedDays] = useState(new Set());
    const sentinelRef  = useRef(null);
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
    }, [hasMore, loadingMore]);

    const loadedDays = useMemo(() => new Set(achievements.map(a => a.unlockedAt.substring(0, 10))), [achievements]);

    // Auto-load next chunk when selected day has heatmap data but isn't loaded yet
    useEffect(() => {
        if (!selectedDay || !heatmapData[selectedDay] || loadedDays.has(selectedDay) || !hasMore || loadingMore) return;
        onLoadMoreRef.current();
    }, [selectedDay, loadedDays, hasMore, loadingMore]);

    const toggleDay = (day) => setCollapsedDays(prev => {
        const next = new Set(prev);
        next.has(day) ? next.delete(day) : next.add(day);
        return next;
    });

    const days = useMemo(() => {
        const arr   = [];
        const today = new Date();
        for (let i = 364; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            arr.push({ key: d.toISOString().substring(0, 10), date: d });
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
            ? achievements.filter(a => a.unlockedAt.substring(0, 10) === selectedDay)
            : achievements;

        const byDay = {};
        source.forEach(ach => {
            const day = ach.unlockedAt.substring(0, 10);
            if (!byDay[day]) byDay[day] = [];
            byDay[day].push(ach);
        });

        return Object.entries(byDay)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([day, achs]) => {
                const byGame = {};
                achs.forEach(ach => {
                    if (!byGame[ach.titleId]) byGame[ach.titleId] = { titleId: ach.titleId, gameName: ach.gameName, achievements: [] };
                    byGame[ach.titleId].achievements.push(ach);
                });
                const sessions = Object.values(byGame).sort((a, b) => {
                    const aT = Math.min(...a.achievements.map(x => new Date(x.unlockedAt).getTime()));
                    const bT = Math.min(...b.achievements.map(x => new Date(x.unlockedAt).getTime()));
                    return aT - bT;
                });
                return { day, achCount: achs.length, sessions };
            });
    }, [achievements, selectedDay]);

    if (loading) {
        return (
            <div className="text-center py-12 text-[#546270] text-[12px]">
                Loading activity…
            </div>
        );
    }

    if (achievements.length === 0) {
        return (
            <div className="text-center py-12 text-[#546270] text-[12px]">
                No achievements unlocked in the past year
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">

            {/* ── Heatmap ── */}
            <div>
                <div className="flex items-center gap-2 border-b border-[#2a475e] pb-1.5 mb-3">
                    <span className="w-[3px] h-[14px] bg-[#66c0f4] rounded-[1px] shrink-0" />
                    <span className="text-[13px] text-white tracking-wide uppercase font-medium flex items-center gap-2">
                        <Activity size={15} className="text-[#66c0f4]" /> Activity
                    </span>
                    <span className="text-[10px] text-[#546270] ml-auto hidden sm:block">
                        {achievements.length} achievements · click a day to filter
                    </span>
                    <span className="text-[10px] text-[#546270] ml-auto sm:hidden">
                        {achievements.length} achievements
                    </span>
                </div>

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
                    <span className="w-[3px] h-[14px] bg-[#e5b143] rounded-[1px] shrink-0" />
                    <span className="text-[13px] text-white tracking-wide uppercase font-medium flex items-center gap-2">
                        <Trophy size={15} className="text-[#e5b143]" /> Recent Unlocks
                    </span>
                    <span className="text-[10px] text-[#546270] ml-auto">
                        {selectedDay
                            ? `${fmtDay(selectedDay)} · ${timelineGroups[0]?.achCount || 0} achievements`
                            : `${achievements.length} total`}
                    </span>
                </div>

                {timelineGroups.length === 0 ? (
                    <div className="text-[#8f98a0] text-[11px] py-4 italic text-center">
                        {selectedDay ? 'No achievements on this day.' : 'No achievements unlocked in the last year.'}
                    </div>
                ) : (
                    <div className="flex flex-col gap-0">
                        {timelineGroups.map(({ day, achCount, sessions }) => {
                            const isCollapsed = collapsedDays.has(day);
                            return (
                            <div key={day} className="mb-4">
                                <button onClick={() => toggleDay(day)} className="w-full flex items-center gap-2 mb-2 group outline-none">
                                    <div className="w-2 h-2 rounded-full bg-[#2a475e] border border-[#66c0f4] shrink-0" />
                                    <span className="text-[10px] text-[#66c0f4] font-semibold group-hover:text-[#c6d4df] transition-colors">{fmtDay(day)}</span>
                                    <div className="flex-1 h-px bg-[#2a475e] opacity-40" />
                                    <span className="text-[9px] text-[#546270]">
                                        {achCount} achievement{achCount !== 1 ? 's' : ''}
                                    </span>
                                    <ChevronDown size={11} className={`text-[#546270] transition-transform duration-200 shrink-0 ${isCollapsed ? '' : 'rotate-180'}`} />
                                </button>

                                {!isCollapsed && sessions.map((session, si) => {
                                    const sorted = [...session.achievements].sort(
                                        (a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt)
                                    );
                                    const startT = fmtTime(session.achievements.reduce(
                                        (min, a) => a.unlockedAt < min ? a.unlockedAt : min,
                                        session.achievements[0].unlockedAt
                                    ));
                                    const endT = fmtTime(session.achievements.reduce(
                                        (max, a) => a.unlockedAt > max ? a.unlockedAt : max,
                                        session.achievements[0].unlockedAt
                                    ));

                                    return (
                                        <div key={si} className="ml-4 border-l border-[#2a475e] pl-3 mb-3">
                                            {/* Session header */}
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <div className="w-4 h-4 rounded-[1px] overflow-hidden border border-[#101214] bg-[#1b2838] shrink-0">
                                                    <img
                                                        src={xboxImg(gameIcons?.[session.titleId], 64)}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                        onError={e => { e.target.style.display = 'none'; }}
                                                    />
                                                </div>
                                                <a href={xboxSearchUrl(session.gameName)} target="_blank" rel="noreferrer" className="text-[9px] text-[#c6d4df] hover:text-[#66c0f4] uppercase tracking-wider font-medium truncate flex-1 transition-colors">
                                                    {session.gameName}
                                                </a>
                                                <span className="text-[8px] text-[#546270] shrink-0">
                                                    {startT}{startT !== endT ? `–${endT}` : ''}
                                                </span>
                                            </div>

                                            {/* Achievements in session */}
                                            <div className="flex flex-col gap-1">
                                                {sorted.map((ach, ai) => (
                                                    <div key={ai} className="flex items-center gap-2 p-2 rounded-[2px] border border-[#2a475e] border-l-[2px] bg-[#1b2838] hover:bg-[#2a475e] transition-colors" style={{ borderLeftColor: rarityBorderColor(ach.globalPct) }}>
                                                        <div className="shrink-0 w-8 h-8 rounded-[2px] overflow-hidden border border-[#101214] bg-black">
                                                            {ach.iconUrl
                                                                ? <img src={xboxImg(ach.iconUrl, 128)} alt={ach.displayName} className="w-full h-full object-cover" />
                                                                : <div className="w-full h-full bg-[#2a475e]" />
                                                            }
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[11px] font-medium truncate" style={{ color: rarityBorderColor(ach.globalPct) }}>{ach.displayName}</div>
                                                            <p className="text-[9px] text-[#8f98a0] truncate">{ach.description || ach.displayName}</p>
                                                            {ach.globalPct != null && (
                                                                <div className="flex items-center gap-1 text-[9px] font-medium" style={{ color: rarityBorderColor(ach.globalPct) }}>
                                                                    <Gem size={8} />
                                                                    {rarityLabel(ach.globalPct)} · {ach.globalPct}%
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col items-end shrink-0">
                                                            {ach.gamerscore > 0 && <span className="text-[9px] text-[#c6d4df] font-semibold">{ach.gamerscore}G</span>}
                                                            <span className="text-[9px] text-[#546270]">{fmtTime(ach.unlockedAt)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                        })}
                    </div>
                )}

                {/* Scroll sentinel */}
                {!selectedDay && hasMore && (
                    <div ref={sentinelRef} className="pt-2">
                        {loadingMore && (
                            <div className="flex flex-col gap-2 w-full">
                                {[...Array(2)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-2 p-2 rounded-[2px] border border-[#2a475e] bg-[#1b2838]">
                                        <div className="shimmer w-8 h-8 rounded-[2px] shrink-0" />
                                        <div className="flex-1 flex flex-col gap-1.5">
                                            <div className="shimmer h-2.5 w-3/4 rounded" />
                                            <div className="shimmer h-2 w-1/2 rounded" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
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
// Steam and Xbox games (different shapes) share the same rules.
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

// ── ProgressTab ───────────────────────────────────────────────────────────────

const ProgressTab = ({ achievementProgress, onViewDetails, beatenMap }) => {
    const [sort,          setSort]          = useState('pct');
    const [showCompleted, setShowCompleted] = useState(false);
    const [view,          setView]          = useState('all');
    const [search,        setSearch]        = useState('');

    const games = useMemo(() => {
        const list = Object.values(achievementProgress)
            .filter(d => d.hasAchievements && d.unlocked > 0 && d.total > 0 && (!search || (d.gameName ?? '').toLowerCase().includes(search.toLowerCase())))
            .map(d => ({
                ...d,
                pct: (d.unlocked / d.total) * 100,
            }));

        const bucketed = applyProgressView(list, view, {
            pct:          g => g.pct,
            left:         g => g.total - g.unlocked,
            lastPlayedMs: g => (g.lastPlayedTs ? Date.parse(g.lastPlayedTs) || 0 : 0),
            isCompleted:  g => g.unlocked >= g.total,
        });
        if (bucketed) return bucketed;

        return list
            .filter(g => showCompleted || g.unlocked < g.total)
            .sort((a, b) => {
                if (sort === 'gamerscore') return (b.gamerscore ?? 0) - (a.gamerscore ?? 0);
                if (sort === 'lastPlayed') return (b.lastPlayedTs || '').localeCompare(a.lastPlayedTs || '');
                if (b.pct !== a.pct) return b.pct - a.pct;
                return (b.lastUnlockedAt || '').localeCompare(a.lastUnlockedAt || '');
            });
    }, [achievementProgress, sort, showCompleted, search, view]);

    return (
        <div>
            <ProgressFilterBar
                view={view} onView={setView}
                sorts={PROGRESS_SORTS.map(s => ({ value: s.id, label: s.label }))}
                sort={sort} onSort={setSort}
                completedLabel="Completed" showCompleted={showCompleted} onShowCompleted={setShowCompleted}
                count={games.length}
                search={search} onSearch={setSearch}
            />
            <div className="flex flex-col gap-3">
                {games.length === 0 && (
                    <div className="text-center py-12 text-[#546270] text-[12px]">
                        {search ? 'No games match your search.' : view !== 'all' ? 'No games in this view.' : 'No achievement progress tracked yet.'}
                    </div>
                )}
                {games.map(g => (
                    <XboxGameCard
                        key={g.titleId}
                        game={{
                            titleId:      g.titleId,
                            name:         g.gameName,
                            storeUrl:     xboxSearchUrl(g.gameName),
                            lastPlayedTs: g.lastPlayedTs,
                            heroUrl:      g.heroUrl,
                            iconUrl:      g.iconUrl,
                        }}
                        achievementData={achievementProgress[g.titleId]}
                        onViewDetails={onViewDetails}
                        beatenInfo={beatenMap?.get(g.titleId) ?? null}
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
        <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 w-full flex-1">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 mb-8">
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

const App = () => {
    const [profileData,       setProfileData]       = useState(null);
    const [completionsExpanded, setCompletionsExpanded] = useState(false);
    const iconGridCols = useIconGridCols();
    const iconLimit = iconGridCols * 2;
    const [gamesData,         setGamesData]         = useState(null);
    const [achievementChunks, setAchievementChunks] = useState([null, null, null, null]);
    const [heatmapData,       setHeatmapData]       = useState({});
    const [loadingChunkIdx,   setLoadingChunkIdx]   = useState(null);
    const [loading,           setLoading]           = useState(true);
    const [error,             setError]             = useState(null);
    const [selectedGame,     setSelectedGame]     = useState(null);
    const [gameDetails,       setGameDetails]       = useState({});
    const [modalLoading,      setModalLoading]      = useState(null); // game object being fetched
    const [beatenGames,       setBeatenGames]       = useState([]);
    const VALID_TABS = ['recent', 'progress', 'activity'];
    const initialTab = (() => {
        const p = new URLSearchParams(window.location.search).get('tab');
        return VALID_TABS.includes(p) ? p : 'recent';
    })();
    const [activeTab, setActiveTab] = useState(initialTab);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [showFloatingTabs, setShowFloatingTabs] = useState(false);
    const [pillLeaving, setPillLeaving] = useState(false);
    const pillLeaveTimer = useRef(null);
    const tabBarRef = useRef(null);
    const setTab = (tab) => {
        setActiveTab(tab);
        const url = new URL(window.location);
        url.searchParams.set('tab', tab);
        window.history.replaceState({}, '', url);
    };

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

    // Load win conditions + beaten game data
    useEffect(() => {
        fetch('../../data/xbox/win-conditions.json')
            .then(r => r.json())
            .then(async wc => {
                const entries = Object.entries(wc);
                if (!entries.length) return;
                const results = await Promise.all(
                    entries.map(async ([titleId, wc]) => {
                        try {
                            const isArr = Array.isArray(wc);
                            const mode  = isArr ? 'or' : (wc.mode || 'or');
                            const names = isArr ? wc : (wc.achievements || []);
                            const game = await fetch(`../../data/xbox/games/${titleId}.json`).then(r => r.json());
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
                                titleId: game.titleId,
                                gameName: game.gameName,
                                iconUrl: game.iconUrl,
                                total: game.total,
                                beatenAt: pick.unlockedAt,
                                winConditionName: pick.displayName,
                                winCondIconUrl: pick.iconUrl,
                                winCondGlobalPct: pick.globalPct,
                            };
                        } catch { return null; }
                    })
                );
                setBeatenGames(results.filter(Boolean));
            })
            .catch(() => {});
    }, []);

    // Load profile on mount
    useEffect(() => {
        fetch('../../data/xbox/profile.json')
            .then(r => { if (!r.ok) throw new Error('Xbox data not found'); return r.json(); })
            .then(p => { setProfileData(p); setLoading(false); })
            .catch(e => { setError(e.message); setLoading(false); });
    }, []);

    const loadNextChunk = () => {
        const nextIdx = achievementChunks.findIndex(c => c === null);
        if (nextIdx === -1 || loadingChunkIdx !== null) return;
        setLoadingChunkIdx(nextIdx);
        fetch(`../../data/xbox/achievements/${nextIdx + 1}.json`)
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then(data => {
                setAchievementChunks(prev => { const n = [...prev]; n[nextIdx] = data.recentAchievements ?? []; return n; });
                setLoadingChunkIdx(null);
            })
            .catch(() => {
                setAchievementChunks(prev => { const n = [...prev]; n[nextIdx] = []; return n; });
                setLoadingChunkIdx(null);
            });
    };

    // Load heatmap + first chunk when Activity tab opens
    useEffect(() => {
        if (activeTab !== 'activity') return;
        if (Object.keys(heatmapData).length === 0) {
            fetch('../../data/xbox/achievements/heatmap.json')
                .then(r => r.json()).then(d => setHeatmapData(d.activityHeatmap || {}))
                .catch(() => {});
        }
        if (achievementChunks[0] === null && loadingChunkIdx === null) {
            loadNextChunk();
        }
    }, [activeTab]);

    // Load games.json when Recent or Progress tab opens
    useEffect(() => {
        if (['recent', 'progress', 'activity'].includes(activeTab) && profileData && !gamesData) {
            fetch('../../data/xbox/games/index.json')
                .then(r => r.json())
                .then(setGamesData)
                .catch(() => setGamesData({ achievementProgress: {} }));
        }
    }, [activeTab, profileData, gamesData]);

    const handleViewDetails = useCallback(async ({ game, achievementData, beatenInfo }) => {
        const titleId = game.titleId;
        if (gameDetails[titleId]) {
            setSelectedGame({ game, achievementData: gameDetails[titleId], beatenInfo });
            return;
        }
        setModalLoading(game);
        try {
            const data = await fetch(`../../data/xbox/games/${titleId}.json`).then(r => r.json());
            setGameDetails(prev => ({ ...prev, [titleId]: data }));
            setModalLoading(null);
            setSelectedGame({ game, achievementData: data, beatenInfo });
        } catch {
            setModalLoading(null);
            setSelectedGame({ game, achievementData, beatenInfo });
        }
    }, [gameDetails]);

    // Derived state — read pre-computed fields from JSON, no client-side iteration needed
    const achProgress  = gamesData?.achievementProgress ?? {};
    const recentAchs   = useMemo(() =>
        achievementChunks.filter(c => c !== null).flat()
            .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt)),
    [achievementChunks]);
    const perfectGames = [...(profileData?.perfectGames ?? [])].sort((a, b) => {
        if (a.lastAchGlobalPct == null && b.lastAchGlobalPct == null) return 0;
        if (a.lastAchGlobalPct == null) return 1;
        if (b.lastAchGlobalPct == null) return -1;
        return a.lastAchGlobalPct - b.lastAchGlobalPct;
    });
    const perfectIds    = new Set(perfectGames.map(g => g.titleId));
    const beatenOnly    = beatenGames
        .filter(g => !perfectIds.has(g.titleId))
        .sort((a, b) => new Date(b.beatenAt) - new Date(a.beatenAt));
    const beatenMap     = useMemo(() => new Map(beatenGames.map(g => [g.titleId, g])), [beatenGames]);

    if (loading) return <ProfileLoadingSkeleton />;

    if (error) return (
        <div className="flex items-center justify-center min-h-screen bg-[#171a21] text-[#546270]">
            <div className="text-center">
                <div className="text-[14px] mb-2">Could not load Xbox data</div>
                <div className="text-[11px]">{error}</div>
            </div>
        </div>
    );

    const { profile, stats, metadata, mostRecentGame } = profileData;
    const recentlyPlayed = (profileData.recentlyPlayed ?? []).map(g => ({ ...g, storeUrl: xboxSearchUrl(g.name) }));
    const profileUrl = xboxProfileUrl(profile.gamertag);

    const completionPct    = stats.completionPct ?? 0;
    const mostRecentUnlock  = profileData?.mostRecentUnlock ?? null;
    const mostRecentGameAch = mostRecentGame
        ? (recentAchs.find(a => a.titleId === mostRecentGame.titleId) ?? null)
        : null;

    const statsLeft = [
        { label: 'Total Games',          value: stats.totalGames.toLocaleString() },
        { label: 'Games w/ Achievements', value: stats.gamesWithAchievements.toLocaleString() },
        { label: 'Games Started',        value: stats.gamesStarted.toLocaleString() },
        { label: 'Gamerscore',           value: `${stats.gamerscore.toLocaleString()} G` },
    ];
    const statsRight = [
        { label: 'Achievements',       value: `${stats.unlockedAchievements.toLocaleString()} / ${stats.totalAchievements.toLocaleString()}` },
        { label: 'Overall Completion', value: `${completionPct}%` },
        { label: 'Completed Games',    value: (stats.perfectCount ?? perfectGames.length).toString() },
        { label: 'Beaten Games',       value: beatenOnly.length.toString() },
    ];

    return (
        <div className="bg-[#171a21] text-[#c6d4df] min-h-screen flex flex-col font-sans selection:bg-[#66c0f4] selection:text-[#171a21]">
            <style>{`
                @keyframes slideUpPill {
                    from { opacity: 0; transform: translateX(-50%) translateY(12px); }
                    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
                @keyframes slideDownPill {
                    from { opacity: 1; transform: translateX(-50%) translateY(0); }
                    to   { opacity: 0; transform: translateX(-50%) translateY(12px); }
                }
            `}</style>

            {/* Topbar */}
            <div className="page-topbar sticky top-0 z-50 bg-[#131a22] border-b border-[#101214] px-4 md:px-8 py-1.5 flex items-center gap-2 text-[10px]">
                <a href="../../" className="text-[#546270] font-bold tracking-[0.15em] uppercase hover:text-[#8f98a0] transition-colors">Yozuryu</a>
                <span className="text-[#2a475e]">›</span>
                <a href="../../" className="text-[#546270] hover:text-[#8f98a0] transition-colors">Gaming Hub</a>
                <span className="text-[#2a475e]">›</span>
                <span className="text-[#c6d4df]">Xbox</span>
            </div>

            {/* Header */}
            <header className="bg-[#1b2838] border-b border-[#2a475e] px-4 md:px-8 pt-8 pb-5 md:pt-5 shadow-md">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center md:items-start gap-5">

                    {/* Avatar */}
                    <div className="relative shrink-0">
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-[2px] border border-[#52b043] shadow-[0_2px_12px_rgba(0,0,0,0.5)] overflow-hidden bg-[#101214]">
                            <img src={xboxImg(profile.avatar, 208)} alt={profile.gamertag} className="w-full h-full object-cover" />
                        </div>
                    </div>

                    {/* Meta */}
                    <div className="flex-1 flex flex-col gap-1.5 text-center md:text-left">

                        <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                            <h1 className="text-2xl md:text-[26px] text-white font-medium tracking-wide leading-none">
                                {profile.gamertag}
                            </h1>
                            <a href={profileUrl} target="_blank" rel="noreferrer"
                                title="View on Xbox"
                                className="hover:opacity-80 transition-opacity bg-[#101214] p-1 rounded-[2px] border border-[#323f4c] flex items-center justify-center shrink-0">
                                <img src="../../assets/icon-xbox.png" alt="Xbox" className="w-3.5 h-3.5 object-contain" />
                            </a>
                            {mostRecentGame?.lastPlayedTs && (
                                <span className="text-[10px] text-[#546270]">
                                    Last played <span className="text-[#8f98a0]">{formatTimeAgo(mostRecentGame.lastPlayedTs)}</span>
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start gap-1.5 mt-0.5">
                            <span className="text-[9px] font-semibold uppercase tracking-[0.07em] px-2 py-[3px] rounded-[2px] border border-[#323f4c] bg-[#101214] text-[#546270]">
                                <span className="text-[#e5b143]">{stats.gamerscore.toLocaleString()}</span> gamerscore
                            </span>
                            <span className="text-[9px] font-semibold uppercase tracking-[0.07em] px-2 py-[3px] rounded-[2px] border border-[#323f4c] bg-[#101214] text-[#546270]">
                                <span className="text-[#c6d4df]">{stats.totalGames.toLocaleString()}</span> games
                            </span>
                            <span className="text-[9px] font-semibold uppercase tracking-[0.07em] px-2 py-[3px] rounded-[2px] border border-[#323f4c] bg-[#101214] text-[#546270]">
                                <span className="text-[#c6d4df]">{stats.unlockedAchievements.toLocaleString()}</span> achievements
                            </span>
                        </div>

                        <p className="text-[9px] text-[#546270]">
                            Last updated <span className="text-[#8f98a0]">{formatDate(metadata.extractionTimestamp)}</span>
                        </p>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 flex-1 w-full">

                {/* ── Overview 2-column ── */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 lg:gap-8 mb-8">

                    {/* Left column */}
                    <div className="flex flex-col gap-6">

                        {/* Most Recently Played */}
                        <div>
                            <h2 className="text-[13px] text-white tracking-wide uppercase font-medium border-b border-[#2a475e] pb-1.5 flex items-center gap-2 mb-3">
                                <span className="w-[3px] h-[14px] bg-[#66c0f4] rounded-[1px] shrink-0" />
                                <Activity size={15} className="text-[#66c0f4]" /> Most Recently Played
                            </h2>
                            {mostRecentGame ? (
                                <div className="bg-[#1b2838]/80 border border-[#323f4c] border-l-[3px] border-l-[#66c0f4] rounded-[3px] p-3 flex items-center gap-4 hover:bg-[#202d39] transition-colors shadow-sm">
                                    <a href={xboxSearchUrl(mostRecentGame.name)} target="_blank" rel="noreferrer"
                                        className="w-14 h-14 shrink-0 rounded-[2px] overflow-hidden border border-[#101214] bg-black block hover:scale-105 transition-transform">
                                        <img src={xboxImg(mostRecentGame.iconUrl, 112)} alt={mostRecentGame.name} className="w-full h-full object-cover block"
                                            onError={e => { e.target.style.display = 'none'; }} />
                                    </a>
                                    <div className="flex-1 min-w-0 flex flex-col">
                                        <a href={xboxSearchUrl(mostRecentGame.name)} target="_blank" rel="noreferrer"
                                            className="text-[#c6d4df] hover:text-[#66c0f4] font-medium text-[14px] truncate leading-tight transition-colors">
                                            {mostRecentGame.name}
                                        </a>
                                        <div className="text-[10px] mt-1.5 flex items-center leading-none gap-1.5">
                                            {mostRecentGame.totalGamerscore > 0 && (
                                                <span className="text-[#8f98a0]"><span className="text-[#c6d4df]">{mostRecentGame.gamerscore.toLocaleString()}</span> / {mostRecentGame.totalGamerscore.toLocaleString()} G</span>
                                            )}
                                            {mostRecentGame.lastPlayedTs && (
                                                <>
                                                    {mostRecentGame.totalGamerscore > 0 && <span className="text-[#546270]">•</span>}
                                                    <span className="text-[#546270]">{formatTimeAgo(mostRecentGame.lastPlayedTs)}</span>
                                                </>
                                            )}
                                        </div>
                                        {mostRecentGameAch && (
                                            <div className="flex items-center leading-none gap-1 text-[10px] mt-1.5 truncate">
                                                <Trophy size={9} className="text-[#e5b143] shrink-0" />
                                                <span className="text-[#c6d4df] truncate">{mostRecentGameAch.displayName}</span>
                                                <span className="text-[#546270] shrink-0">· {formatTimeAgo(mostRecentGameAch.unlockedAt)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-[#8f98a0] text-[11px] py-2">No recently played games.</div>
                            )}
                        </div>

                        {/* Most Recently Unlocked */}
                        <div>
                            <h2 className="text-[13px] text-white tracking-wide uppercase font-medium border-b border-[#2a475e] pb-1.5 flex items-center gap-2 mb-3">
                                <span className="w-[3px] h-[14px] bg-[#e5b143] rounded-[1px] shrink-0" />
                                <Trophy size={15} className="text-[#e5b143]" /> Most Recently Unlocked
                            </h2>
                            {mostRecentUnlock ? (
                                <div className="bg-[#1b2838]/80 border border-[#323f4c] border-l-[3px] border-l-[#e5b143] rounded-[3px] p-3 flex items-center gap-3 hover:bg-[#202d39] transition-colors shadow-sm">
                                    <div className="shrink-0 w-12 h-12 rounded-[2px] overflow-hidden border border-[#101214] bg-black">
                                        {mostRecentUnlock.iconUrl
                                            ? <img src={xboxImg(mostRecentUnlock.iconUrl, 208)} alt={mostRecentUnlock.displayName} className="w-full h-full object-cover" />
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
                                                src={xboxImg(achProgress[mostRecentUnlock.titleId]?.iconUrl, 64)}
                                                alt=""
                                                className="w-4 h-4 rounded-[1px] border border-[#101214] object-cover"
                                                onError={e => { e.target.style.display = 'none'; }}
                                            />
                                            <a href={xboxSearchUrl(mostRecentUnlock.gameName)} target="_blank" rel="noreferrer" className="text-[#66c0f4] hover:text-[#c6d4df] transition-colors">{mostRecentUnlock.gameName}</a>
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
                        </div>

                        {/* User Stats */}
                        <div>
                            <h2 className="text-[13px] text-white tracking-wide uppercase font-medium border-b border-[#2a475e] pb-1.5 flex items-center gap-2 mb-2">
                                <span className="w-[3px] h-[14px] bg-[#66c0f4] rounded-[1px] shrink-0" />
                                <BarChart2 size={15} className="text-[#66c0f4]" /> User Stats
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 md:gap-x-8 px-1">
                                {[statsLeft, statsRight].map((col, ci) => (
                                    <div key={ci} className="flex flex-col">
                                        {col.map((stat, i) => (
                                            <div key={i} className="flex items-end text-[11px] py-[3px] group hover:bg-[#202d39]/40 rounded-sm px-1 transition-colors">
                                                <span className="text-[#8f98a0] font-medium leading-tight whitespace-nowrap">{stat.label}</span>
                                                <div className="flex-1 border-b-[1.5px] border-dotted border-[#323f4c] mx-2 relative top-[-4px] opacity-60 group-hover:border-[#546270]" />
                                                <span className="text-[#c6d4df] font-medium whitespace-nowrap leading-tight text-right">{stat.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Sidebar: Completions */}
                    <div className="flex flex-col gap-5">
                        <div className="bg-[#1b2838] border border-[#2a475e] rounded-[3px] shadow-sm h-fit">
                            <div className="p-2.5 bg-[#172333] border-b border-[#2a475e] rounded-t-[2px] flex items-center gap-2">
                                <span className="w-[2px] h-[12px] bg-[#e5b143] rounded-[1px] shrink-0" />
                                <span className="text-[11px] uppercase tracking-wide font-semibold text-[#c6d4df] flex items-center gap-2 flex-1">
                                    <Star size={13} className="text-[#e5b143]" /> Completions
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <Star size={9} className="text-[#e5b143]" />
                                    <span className="text-[10px] font-semibold text-[#e5b143]">{perfectGames.length}</span>
                                    <Medal size={9} className="text-[#b8c4ce]" />
                                    <span className="text-[10px] font-semibold text-[#b8c4ce]">{beatenOnly.length}</span>
                                </div>
                            </div>
                            <div className="p-3 grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-2 min-h-[60px]">
                                {(completionsExpanded ? perfectGames : perfectGames.slice(0, iconLimit)).map(g => (
                                    <div key={g.titleId} className="relative group cursor-help">
                                        <a href={xboxSearchUrl(g.gameName)} target="_blank" rel="noreferrer">
                                            <img
                                                src={xboxImg(g.iconUrl, 128)}
                                                alt={g.gameName}
                                                className="w-full aspect-square object-cover rounded-[2px] border-2 border-[#e5b143] group-hover:scale-110 transition-all duration-200 bg-[#101214]"
                                            />
                                        </a>
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[200px] bg-[#1b2838] border border-[#2a475e] rounded-[2px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] shadow-xl pointer-events-none overflow-hidden">
                                            <div className="h-[2px] bg-gradient-to-r from-[#e5b143] to-[#e5b143]/20" />
                                            <div className="flex items-center gap-2 px-2.5 py-2 border-b border-[#2a475e] bg-[#172333]">
                                                <img src={xboxImg(g.iconUrl, 128)} alt=""
                                                    className="w-8 h-8 rounded-[2px] border border-[#e5b143]/30 bg-black shrink-0 object-cover" />
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[11px] text-white font-semibold leading-tight line-clamp-2">{g.gameName}</span>
                                                    {g.lastAchName && <span className="text-[9px] text-[#8f98a0] leading-tight truncate mt-0.5">{g.lastAchName}</span>}
                                                </div>
                                            </div>
                                            <div className="px-2.5 py-2 flex flex-col gap-1.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[9px] text-[#546270] uppercase tracking-[0.08em]">Award</span>
                                                    <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded-[2px] bg-[#e5b143] text-[#101214]">★ Completed</span>
                                                </div>
                                                <div className="h-px bg-[#2a475e]" />
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[9px] text-[#546270] uppercase tracking-[0.08em]">Achievements</span>
                                                    <span className="text-[9px] text-[#e5b143] font-medium">{g.total} / {g.total} · {(g.totalGamerscore ?? 0).toLocaleString()}G</span>
                                                </div>
                                                {g.lastAchGlobalPct != null && (<>
                                                    <div className="h-px bg-[#2a475e]" />
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[9px] text-[#546270] uppercase tracking-[0.08em]">Rarity</span>
                                                        <span className="text-[9px] font-medium" style={{ color: rarityBorderColor(g.lastAchGlobalPct) }}>
                                                            {rarityLabel(g.lastAchGlobalPct)} · {g.lastAchGlobalPct}%
                                                        </span>
                                                    </div>
                                                </>)}
                                                {g.completedAt && (<>
                                                    <div className="h-px bg-[#2a475e]" />
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[9px] text-[#546270] uppercase tracking-[0.08em]">Completed</span>
                                                        <span className="text-[9px] text-[#c6d4df]">{formatDate(g.completedAt)}</span>
                                                    </div>
                                                </>)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(completionsExpanded ? beatenOnly : beatenOnly.slice(0, Math.max(0, iconLimit - perfectGames.length))).map(g => (
                                    <div key={g.titleId} className="relative group cursor-help">
                                        <a href={xboxSearchUrl(g.gameName)} target="_blank" rel="noreferrer">
                                            <img
                                                src={xboxImg(g.iconUrl, 128)}
                                                alt={g.gameName}
                                                className="w-full aspect-square object-cover rounded-[2px] border border-[#b8c4ce] group-hover:scale-110 transition-all duration-200 bg-[#101214]"
                                            />
                                        </a>
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[200px] bg-[#1b2838] border border-[#2a475e] rounded-[2px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] shadow-xl pointer-events-none overflow-hidden">
                                            <div className="h-[2px] bg-gradient-to-r from-[#b8c4ce] to-[#b8c4ce]/20" />
                                            <div className="flex items-center gap-2 px-2.5 py-2 border-b border-[#2a475e] bg-[#172333]">
                                                <img src={xboxImg(g.iconUrl, 128)} alt=""
                                                    className="w-8 h-8 rounded-[2px] border border-[#b8c4ce]/30 bg-black shrink-0 object-cover" />
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[11px] text-white font-semibold leading-tight line-clamp-2">{g.gameName}</span>
                                                    {g.winConditionName && <span className="text-[9px] text-[#8f98a0] leading-tight truncate mt-0.5">{g.winConditionName}</span>}
                                                </div>
                                            </div>
                                            <div className="px-2.5 py-2 flex flex-col gap-1.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[9px] text-[#546270] uppercase tracking-[0.08em]">Award</span>
                                                    <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded-[2px]" style={{ background: '#2a3440', color: '#c6d4df', border: '1px solid rgba(184,196,206,0.3)' }}>Beaten</span>
                                                </div>
                                                {g.winCondGlobalPct != null && (<>
                                                    <div className="h-px bg-[#2a475e]" />
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[9px] text-[#546270] uppercase tracking-[0.08em]">Rarity</span>
                                                        <span className="text-[9px] font-medium" style={{ color: rarityBorderColor(g.winCondGlobalPct) }}>
                                                            {rarityLabel(g.winCondGlobalPct)} · {g.winCondGlobalPct}%
                                                        </span>
                                                    </div>
                                                </>)}
                                                {g.beatenAt && (<>
                                                    <div className="h-px bg-[#2a475e]" />
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[9px] text-[#546270] uppercase tracking-[0.08em]">Beaten</span>
                                                        <span className="text-[9px] text-[#c6d4df]">{formatDate(g.beatenAt)}</span>
                                                    </div>
                                                </>)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {perfectGames.length === 0 && beatenOnly.length === 0 && (
                                    <div className="col-span-full text-center text-[#546270] text-[10px] py-2">No completions yet.</div>
                                )}
                            </div>
                            {perfectGames.length + beatenOnly.length > iconLimit && (
                              <button
                                onClick={() => setCompletionsExpanded(v => !v)}
                                className="w-full flex items-center justify-center gap-1 py-1.5 border-t border-[#2a475e] text-[9px] font-semibold uppercase tracking-[0.07em] text-[#546270] hover:text-[#c6d4df] hover:bg-[#202d39] transition-colors rounded-b-[2px] outline-none"
                              >
                                {completionsExpanded ? 'Show less' : `Show all ${perfectGames.length + beatenOnly.length}`}
                                <ChevronDown size={11} className={`transition-transform duration-200 ${completionsExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            )}
                        </div>
                    </div>

                </div>

                {/* ── Tab bar ── */}
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
                    <button onClick={() => setTab('activity')} className={`flex-1 md:flex-none flex flex-col md:flex-row items-center justify-center gap-1 md:gap-0 py-2.5 md:py-0 md:pb-2 px-1 md:px-0 transition-colors relative ${activeTab === 'activity' ? 'text-white' : 'text-[#546270] hover:text-[#c6d4df]'}`}>
                        <Activity size={18} className="block md:hidden shrink-0" />
                        <span className="block md:hidden text-[9px] font-semibold uppercase tracking-[0.06em] leading-none">Activity</span>
                        <span className="hidden md:inline text-[11px] md:text-[14px] uppercase tracking-wide font-medium whitespace-nowrap">Activity</span>
                        {activeTab === 'activity' && <div className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-[#66c0f4]" />}
                    </button>
                </div>
                </div>

                {/* ── Floating tab pill (mobile only) ── */}
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
                            { id: 'recent',   icon: <Clock size={17} />,    label: 'Recent'   },
                            { id: 'progress', icon: <BarChart2 size={17} />, label: 'Progress' },
                            { id: 'activity', icon: <Activity size={17} />,  label: 'Activity' },
                        ].map(({ id, icon, label }) => (
                            <button
                                key={id}
                                onClick={() => setTab(id)}
                                title={label}
                                className="relative w-10 h-10 flex items-center justify-center rounded-full transition-all"
                                style={{
                                    color: activeTab === id ? '#66c0f4' : '#546270',
                                    background: activeTab === id ? '#66c0f422' : 'transparent',
                                }}
                            >
                                {icon}
                                {activeTab === id && (
                                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#66c0f4]" />
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Tab content ── */}
                <div className="flex flex-col gap-3">

                    {activeTab === 'recent' && (
                        gamesData
                            ? <div className="flex flex-col gap-3">
                                {recentlyPlayed.map(game => (
                                    <XboxGameCard key={game.titleId} game={game} achievementData={achProgress[game.titleId]} onViewDetails={handleViewDetails} beatenInfo={beatenMap.get(game.titleId) ?? null} />
                                ))}
                              </div>
                            : <div className="flex items-center justify-center py-12 text-[#546270] text-[11px]">Loading games…</div>
                    )}

                    {activeTab === 'progress' && (
                        gamesData
                            ? <ProgressTab achievementProgress={achProgress} onViewDetails={handleViewDetails} beatenMap={beatenMap} />
                            : <div className="flex items-center justify-center py-12 text-[#546270] text-[11px]">Loading games…</div>
                    )}

                    {activeTab === 'activity' && (
                        <ActivityTab
                            achievements={recentAchs}
                            heatmapData={heatmapData}
                            gameIcons={Object.fromEntries(Object.entries(gamesData?.achievementProgress ?? {}).map(([id, g]) => [id, g.iconUrl]))}
                            loading={loadingChunkIdx !== null || achievementChunks[0] === null}
                            hasMore={achievementChunks.some(c => c === null)}
                            loadingMore={loadingChunkIdx !== null}
                            onLoadMore={loadNextChunk}
                        />
                    )}

                </div>

            </main>

            {/* Footer */}
            <footer className="bg-[#1b2838] border-t-2 border-[#2a475e] px-4 md:px-8 py-2.5 flex items-center gap-3 mt-auto">
                <div className="w-[3px] h-[18px] rounded-[1px] bg-[#66c0f4] opacity-50 shrink-0" />
                <p className="text-[10px] text-[#546270]">
                    Personal gaming hub ·
                    <span className="text-[#8f98a0] ml-1">{profile.gamertag}</span>
                </p>
                <a href={profileUrl} target="_blank" rel="noreferrer"
                    className="ml-auto text-[10px] text-[#546270] hover:text-[#66c0f4] transition-colors">
                    xbox.com ↗
                </a>
            </footer>

            {/* Scroll-to-top button */}
            {showScrollTop && (
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="scroll-top-btn fixed right-4 z-50 w-10 h-10 bg-[#131a22] border border-[#2a475e] hover:border-[#66c0f4] hover:text-[#66c0f4] text-[#8f98a0] rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-90"
                    style={{ bottom: (showFloatingTabs || pillLeaving) ? 'calc(120px + env(safe-area-inset-bottom, 0px))' : '3.5rem' }}
                    title="Scroll to top"
                >
                    <ChevronDown size={16} className="rotate-180" />
                </button>
            )}

            {/* Achievement modal loading overlay */}
            {modalLoading && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    onClick={() => setModalLoading(null)}
                >
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
                    <div className="relative z-10 flex flex-col items-center gap-3 bg-[#1b2838] border border-[#2a475e] rounded-[4px] px-8 py-6 shadow-2xl">
                        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                        <div style={{ width: 28, height: 28, border: '3px solid #2a475e', borderTopColor: '#66c0f4', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                        <span className="text-[12px] text-[#8f98a0]">{modalLoading.name}</span>
                        <span className="text-[10px] text-[#546270] tracking-wide uppercase">Loading achievements…</span>
                    </div>
                </div>
            )}

            {/* Achievement modal */}
            {selectedGame && (
                <AchievementModal
                    game={selectedGame.game}
                    achievementData={selectedGame.achievementData}
                    beatenInfo={selectedGame.beatenInfo}
                    onClose={() => setSelectedGame(null)}
                />
            )}

        </div>
    );
};

createRoot(document.getElementById('root')).render(<App />);
