import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Trophy, BarChart2, Activity, ChevronDown, Lock, Unlock, Star, Gem, Clock, X } from 'lucide-react';
import { STEAM_STATUS, PROGRESS_SORTS } from './utils/constants.js';
import { formatPlaytime, formatDate, formatTimeAgo, fmtDay, fmtTime, achIconUrl, capsuleUrl, headerUrl, libraryPortraitUrl, rarityLabel, rarityBorderColor } from './utils/helpers.js';

// ── SteamGameCard ─────────────────────────────────────────────────────────────

const SteamGameCard = ({ game, achievementData, onViewDetails }) => {
    const hasAch = achievementData?.hasAchievements && achievementData?.achievements?.length > 0;
    const achs   = hasAch ? achievementData.achievements : [];
    const pct    = hasAch && achievementData.total > 0
        ? (achievementData.unlocked / achievementData.total) * 100
        : null;
    const isPerfect = pct !== null && pct >= 100;

    const stripeColor = isPerfect
        ? 'border-l-[#e5b143]'
        : pct > 0
        ? 'border-l-[#66c0f4]'
        : hasAch
        ? 'border-l-[#323f4c]'
        : 'border-l-[#1e2a35]';

    const lastUnlock = useMemo(() => {
        if (!hasAch) return null;
        const unlocked = achs.filter(a => a.unlocked && a.unlockedAt);
        if (!unlocked.length) return null;
        return unlocked.reduce((latest, a) =>
            new Date(a.unlockedAt) > new Date(latest.unlockedAt) ? a : latest
        );
    }, [achs, hasAch]);

    const previewAchs = useMemo(() => {
        if (!hasAch) return [];
        const unlocked = achs
            .filter(a => a.unlocked)
            .sort((a, b) => new Date(b.unlockedAt || 0) - new Date(a.unlockedAt || 0));
        const locked = achs.filter(a => !a.unlocked);
        return [...unlocked, ...locked].slice(0, 6);
    }, [achs, hasAch]);

    return (
        <div className={`flex flex-col bg-[#202d39] rounded-[3px] transition-transform duration-200 hover:-translate-y-0.5 border-l-[3px] border border-[#323f4c] shadow-md ${stripeColor}`}>

            {/* Main row — background scoped here so it doesn't stretch when expanded */}
            <div className="relative overflow-hidden rounded-t-[3px]">
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <img
                        src={libraryPortraitUrl(game.appId)}
                        alt=""
                        className="absolute right-0 top-0 h-full w-full md:w-1/2 object-cover opacity-[0.45] mix-blend-screen mask-fade"
                        onError={e => { e.target.src = headerUrl(game.appId); }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#202d39] from-50% via-[#202d39]/80 to-transparent" />
                </div>

            <div className="relative z-10 flex items-center gap-3 md:gap-4 p-3">
                <a
                    href={game.storeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 w-[140px] h-[66px] rounded-[2px] border border-[#101214] overflow-hidden bg-[#2a475e] hover:scale-105 transition-transform"
                >
                    <img
                        src={headerUrl(game.appId)}
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
                                <Star size={8} /> Perfect
                            </span>
                        )}
                    </div>

                    {game.playtimeForever > 0 && (
                        <div className="flex items-center leading-none gap-2 text-[10px] md:text-[11px] mb-1.5">
                            <Clock size={9} className="text-[#8f98a0] shrink-0" />
                            <span className="text-[#8f98a0]">{formatPlaytime(game.playtimeForever)} total</span>
                            {game.playtime2Weeks > 0 && (
                                <>
                                    <span className="text-[#546270]">·</span>
                                    <Clock size={9} className="text-[#57cbde] shrink-0" />
                                    <span className="text-[#57cbde]">{formatPlaytime(game.playtime2Weeks)} recent</span>
                                </>
                            )}
                            {game.lastPlayedTs && (
                                <>
                                    <span className="text-[#546270]">·</span>
                                    <span className="text-[#546270]">last played <span className="text-[#8f98a0]">{formatTimeAgo(game.lastPlayedTs)}</span></span>
                                </>
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
                    onClick={() => onViewDetails({ game, achievementData })}
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
                                    {(ach.iconUrl || ach.iconGrayUrl)
                                        ? <img
                                            src={ach.unlocked ? achIconUrl(achievementData.appId, ach.iconUrl) : (achIconUrl(achievementData.appId, ach.iconGrayUrl) || achIconUrl(achievementData.appId, ach.iconUrl))}
                                            alt={ach.displayName}
                                            className={`w-full h-full object-cover ${!ach.unlocked ? 'grayscale' : ''}`}
                                          />
                                        : <div className="w-full h-full bg-[#2a475e]" />
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

const AchievementModal = ({ game, achievementData, onClose }) => {
    const [lockFilter, setLockFilter] = useState('all');

    const achs = achievementData?.achievements ?? [];
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
                        className="shrink-0 w-32 h-16 rounded-[2px] overflow-hidden border border-[#101214] bg-[#2a475e] hover:scale-105 transition-transform"
                    >
                        <img src={headerUrl(game.appId)} alt={game.name} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
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
                        {pct !== null && (
                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 bg-[#101214] h-[3px] rounded-sm overflow-hidden">
                                    <div className="h-full rounded-sm" style={{ width: `${pct}%`, background: isPerfect ? '#e5b143' : '#66c0f4' }} />
                                </div>
                                <span className="text-[10px] shrink-0" style={{ color: isPerfect ? '#e5b143' : '#8f98a0' }}>
                                    <span className="text-[#c6d4df]">{achievementData.unlocked}</span>/{achievementData.total}
                                    <span className="ml-0.5">({Math.floor(pct)}%)</span>
                                </span>
                                {isPerfect && (
                                    <span className="text-[8px] font-bold uppercase tracking-[0.07em] px-1.5 py-[1px] rounded-[2px] bg-[#e5b143] text-[#101214] flex items-center gap-1">
                                        <Star size={7} /> Perfect
                                    </span>
                                )}
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
            </div>
        </div>
    );
};

// ── ActivityTab ───────────────────────────────────────────────────────────────

const ActivityTab = ({ achievements }) => {
    const [selectedDay,   setSelectedDay]   = useState(null);
    const [collapsedDays, setCollapsedDays] = useState(new Set());

    const toggleDay = (day) => setCollapsedDays(prev => {
        const next = new Set(prev);
        next.has(day) ? next.delete(day) : next.add(day);
        return next;
    });

    const heatmapData = useMemo(() => {
        const map = {};
        achievements.forEach(ach => {
            const day = ach.unlockedAt.substring(0, 10);
            if (!map[day]) map[day] = { count: 0 };
            map[day].count++;
        });
        return map;
    }, [achievements]);

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
                    if (!byGame[ach.appId]) byGame[ach.appId] = { appId: ach.appId, gameName: ach.gameName, achievements: [] };
                    byGame[ach.appId].achievements.push(ach);
                });
                const sessions = Object.values(byGame).sort((a, b) => {
                    const aT = Math.min(...a.achievements.map(x => new Date(x.unlockedAt).getTime()));
                    const bT = Math.min(...b.achievements.map(x => new Date(x.unlockedAt).getTime()));
                    return aT - bT;
                });
                return { day, achCount: achs.length, sessions };
            });
    }, [achievements, selectedDay]);

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

                <div className="overflow-x-auto">
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
                                                        src={capsuleUrl(session.appId)}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                        onError={e => { e.target.style.display = 'none'; }}
                                                    />
                                                </div>
                                                <a href={`https://store.steampowered.com/app/${session.appId}`} target="_blank" rel="noreferrer" className="text-[9px] text-[#c6d4df] hover:text-[#66c0f4] uppercase tracking-wider font-medium truncate flex-1 transition-colors">
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
                                                                ? <img src={achIconUrl(ach.appId, ach.iconUrl)} alt={ach.displayName} className="w-full h-full object-cover" />
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
                                                        <span className="text-[9px] text-[#546270] shrink-0">{fmtTime(ach.unlockedAt)}</span>
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
            </div>
        </div>
    );
};

// ── ProgressTab ───────────────────────────────────────────────────────────────

const ProgressTab = ({ achievementProgress, recentlyPlayed, onViewDetails }) => {
    const [sort, setSort] = useState('pct');

    const playtimeMap = useMemo(() => {
        const m = {};
        (recentlyPlayed || []).forEach(g => { m[g.appId] = g; });
        return m;
    }, [recentlyPlayed]);

    const games = useMemo(() => Object.entries(achievementProgress)
        .filter(([, d]) => d.hasAchievements && d.unlocked > 0)
        .map(([appId, d]) => {
            const pt = playtimeMap[Number(appId)];
            const lastUnlockedAt = (d.achievements ?? [])
                .filter(a => a.unlocked && a.unlockedAt)
                .reduce((latest, a) => (!latest || a.unlockedAt > latest ? a.unlockedAt : latest), null);
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
        })
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
        }),
    [achievementProgress, sort]);

    if (games.length === 0) {
        return (
            <div className="text-center py-12 text-[#546270] text-[12px]">
                No achievement progress tracked yet
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center gap-2 mb-4">
                <span className="text-[9px] uppercase tracking-[0.07em] text-[#546270]">Sort</span>
                {PROGRESS_SORTS.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setSort(s.id)}
                        className={`text-[9px] font-semibold uppercase tracking-[0.07em] px-2 py-[3px] rounded-sm border transition-colors ${
                            sort === s.id
                                ? 'bg-[#66c0f4] text-[#101214] border-[#66c0f4]'
                                : 'bg-[#101214] text-[#8f98a0] border-[#323f4c] hover:text-[#c6d4df] hover:border-[#546270]'
                        }`}
                    >
                        {s.label}
                    </button>
                ))}
                <span className="ml-auto text-[9px] text-[#546270]">{games.length} games</span>
            </div>

            <div className="flex flex-col gap-3">
                {games.map(g => (
                    <SteamGameCard
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
        <header className="bg-[#1b2838] border-b border-[#2a475e] px-4 md:px-8 py-5">
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

const App = () => {
    const [profileData,      setProfileData]      = useState(null);
    const [gamesData,        setGamesData]        = useState(null);
    const [achievementsData, setAchievementsData] = useState(null);
    const [loading,          setLoading]          = useState(true);
    const [error,            setError]            = useState(null);
    const [selectedGame,     setSelectedGame]     = useState(null);
    const VALID_TABS = ['recent', 'progress', 'activity'];
    const initialTab = (() => {
        const p = new URLSearchParams(window.location.search).get('tab');
        return VALID_TABS.includes(p) ? p : 'recent';
    })();
    const [activeTab, setActiveTab] = useState(initialTab);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const setTab = (tab) => {
        setActiveTab(tab);
        const url = new URL(window.location);
        url.searchParams.set('tab', tab);
        window.history.replaceState({}, '', url);
    };

    useEffect(() => {
        const onScroll = () => setShowScrollTop(window.scrollY > 400);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Load profile + achievements on mount (both needed for overview)
    useEffect(() => {
        Promise.all([
            fetch('../../data/steam/profile.json')
                .then(r => { if (!r.ok) throw new Error('Steam data not found'); return r.json(); }),
            fetch('../../data/steam/achievements.json')
                .then(r => r.json())
                .catch(() => ({ recentAchievements: [] })),
        ]).then(([p, a]) => {
            setProfileData(p);
            setAchievementsData(a);
            setLoading(false);
        }).catch(e => { setError(e.message); setLoading(false); });
    }, []);

    // Load games.json when Recent or Progress tab opens
    useEffect(() => {
        if (['recent', 'progress'].includes(activeTab) && profileData && !gamesData) {
            fetch('../../data/steam/games.json')
                .then(r => r.json())
                .then(setGamesData)
                .catch(() => setGamesData({ achievementProgress: {} }));
        }
    }, [activeTab, profileData, gamesData]);

    // Derived state — read pre-computed fields from JSON, no client-side iteration needed
    const achProgress    = gamesData?.achievementProgress ?? {};
    const recentAchs     = achievementsData?.recentAchievements ?? [];
    const perfectGames   = [...(profileData?.perfectGames ?? [])].sort((a, b) => {
        if (a.lastAchGlobalPct == null && b.lastAchGlobalPct == null) return 0;
        if (a.lastAchGlobalPct == null) return 1;
        if (b.lastAchGlobalPct == null) return -1;
        return a.lastAchGlobalPct - b.lastAchGlobalPct;
    });

    if (loading) return <ProfileLoadingSkeleton />;

    if (error) return (
        <div className="flex items-center justify-center min-h-screen bg-[#171a21] text-[#546270]">
            <div className="text-center">
                <div className="text-[14px] mb-2">Could not load Steam data</div>
                <div className="text-[11px]">{error}</div>
            </div>
        </div>
    );

    const { profile, stats, recentlyPlayed, metadata, mostRecentGame } = profileData;
    const status = STEAM_STATUS[profile.status] ?? STEAM_STATUS[0];

    const completionPct    = stats.completionPct ?? 0;
    const mostRecentUnlock = achievementsData?.mostRecentUnlock ?? recentAchs[0] ?? null;
    const mostRecentGameAch = mostRecentGame
        ? (recentAchs.find(a => a.appId === mostRecentGame.appId) ?? null)
        : null;
    const avgPlaytime      = stats.avgPlaytimeMin > 0
        ? formatPlaytime(stats.avgPlaytimeMin)
        : '—';

    const statsLeft = [
        { label: 'Total Games',         value: stats.totalGames.toLocaleString() },
        { label: 'Games with Playtime', value: stats.gamesWithPlaytime.toLocaleString() },
        { label: 'Hours Played',        value: `${stats.totalPlaytimeHrs.toLocaleString()}h` },
        { label: 'Avg per Game',        value: avgPlaytime },
    ];
    const statsRight = [
        { label: 'Achievements',           value: `${stats.unlockedAchievements.toLocaleString()} / ${stats.totalAchievements.toLocaleString()}` },
        { label: 'Games w/ Achievements',  value: stats.gamesWithAchievements.toLocaleString() },
        { label: 'Overall Completion',     value: `${completionPct}%` },
        { label: 'Perfect Games',          value: (stats.perfectCount ?? (gamesData ? perfectGames.length : null))?.toString() ?? '—' },
    ];

    const TABS = [
        { id: 'recent',   label: 'Recent Games' },
        { id: 'progress', label: 'Completion Progress' },
        { id: 'activity', label: 'Activity'     },
    ];

    return (
        <div className="bg-[#171a21] text-[#c6d4df] min-h-screen flex flex-col font-sans selection:bg-[#66c0f4] selection:text-[#171a21]">

            {/* Topbar */}
            <div className="sticky top-0 z-50 bg-[#131a22] border-b border-[#101214] px-4 md:px-8 py-1.5 flex items-center gap-2 text-[10px]">
                <a href="../../" className="text-[#546270] font-bold tracking-[0.15em] uppercase hover:text-[#8f98a0] transition-colors">Yozuryu</a>
                <span className="text-[#2a475e]">›</span>
                <a href="../../" className="text-[#546270] hover:text-[#8f98a0] transition-colors">Gaming Hub</a>
                <span className="text-[#2a475e]">›</span>
                <span className="text-[#c6d4df]">Steam</span>
            </div>

            {/* Header */}
            <header className="bg-[#1b2838] border-b border-[#2a475e] px-4 md:px-8 py-5 shadow-md">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center md:items-start gap-5">

                    {/* Avatar */}
                    <div className="relative shrink-0">
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-[2px] border border-[#4c9be8] shadow-[0_2px_12px_rgba(0,0,0,0.5)] overflow-hidden bg-[#101214]">
                            <img src={profile.avatar} alt={profile.displayName} className="w-full h-full object-cover" />
                        </div>
                        <span className="absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-[#1b2838]" style={{ background: status.color }} />
                    </div>

                    {/* Meta */}
                    <div className="flex-1 flex flex-col gap-1.5 text-center md:text-left">

                        <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                            <h1 className="text-2xl md:text-[26px] text-white font-medium tracking-wide leading-none">
                                {profile.displayName}
                            </h1>
                            <a href={profile.profileUrl} target="_blank" rel="noreferrer"
                                title="View on Steam"
                                className="hover:opacity-80 transition-opacity bg-[#101214] p-1 rounded-[2px] border border-[#323f4c] flex items-center justify-center shrink-0">
                                <img src="https://store.steampowered.com/favicon.ico" alt="Steam" className="w-3.5 h-3.5 object-contain" />
                            </a>
                            {profile.lastOnline && profile.status !== 1 && (
                                <span className="text-[10px] text-[#546270]">
                                    Last online <span className="text-[#8f98a0]">{formatTimeAgo(profile.lastOnline)}</span>
                                </span>
                            )}
                        </div>

                        <div className="flex items-center justify-center md:justify-start gap-1.5">
                            <span className="text-[9px] uppercase tracking-[0.07em] font-semibold" style={{ color: status.color }}>
                                {status.label}
                            </span>
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start gap-1.5 mt-0.5">
                            <span className="text-[9px] font-semibold uppercase tracking-[0.07em] px-2 py-[3px] rounded-[2px] border border-[#323f4c] bg-[#101214] text-[#546270]">
                                <span className="text-[#e5b143]">{stats.totalPlaytimeHrs.toLocaleString()}h</span> played
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
                                    <a href={mostRecentGame.storeUrl} target="_blank" rel="noreferrer"
                                        className="w-14 h-14 shrink-0 rounded-[2px] overflow-hidden border border-[#101214] bg-black block hover:scale-105 transition-transform">
                                        {mostRecentGame.iconUrl
                                            ? <img src={mostRecentGame.iconUrl} alt={mostRecentGame.name} className="w-full h-full object-cover" />
                                            : <div className="w-full h-full bg-[#2a475e]" />
                                        }
                                    </a>
                                    <div className="flex-1 min-w-0 flex flex-col">
                                        <a href={mostRecentGame.storeUrl} target="_blank" rel="noreferrer"
                                            className="text-[#c6d4df] hover:text-[#66c0f4] font-medium text-[14px] truncate leading-tight transition-colors">
                                            {mostRecentGame.name}
                                        </a>
                                        <div className="text-[10px] mt-1.5 flex items-center leading-none gap-1.5">
                                            <Clock size={9} className="text-[#8f98a0] shrink-0" />
                                            <span className="text-[#8f98a0]">{formatPlaytime(mostRecentGame.playtimeForever)} total</span>
                                            {mostRecentGame.playtime2Weeks > 0 && (
                                                <>
                                                    <span className="text-[#546270]">•</span>
                                                    <Clock size={9} className="text-[#57cbde] shrink-0" />
                                                    <span className="text-[#57cbde]">{formatPlaytime(mostRecentGame.playtime2Weeks)} recent</span>
                                                </>
                                            )}
                                            {mostRecentGame.lastPlayedTs && (
                                                <>
                                                    <span className="text-[#546270]">•</span>
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
                                                src={capsuleUrl(mostRecentUnlock.appId)}
                                                alt=""
                                                className="w-5 h-2.5 rounded-[1px] border border-[#101214] object-cover"
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

                    {/* Sidebar: Perfect Games */}
                    <div className="flex flex-col gap-5">
                        <div className="bg-[#1b2838] border border-[#2a475e] rounded-[3px] shadow-sm h-fit">
                            <div className="p-2.5 bg-[#172333] border-b border-[#2a475e] rounded-t-[2px] flex items-center gap-2">
                                <span className="w-[2px] h-[12px] bg-[#e5b143] rounded-[1px] shrink-0" />
                                <span className="text-[11px] uppercase tracking-wide font-semibold text-[#c6d4df] flex items-center gap-2">
                                    <Star size={13} className="text-[#e5b143]" /> Perfect Games
                                </span>
                            </div>
                            <div className="p-3 grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-2 min-h-[60px]">
                                {perfectGames.length > 0 ? perfectGames.map(g => (
                                    <div key={g.appId} className="relative group cursor-help">
                                        <a href={`https://store.steampowered.com/app/${g.appId}`} target="_blank" rel="noreferrer">
                                            <img
                                                src={g.lastAchIconUrl || g.iconUrl || capsuleUrl(g.appId)}
                                                alt={g.gameName}
                                                className="w-full aspect-square object-cover rounded-[2px] border border-[#e5b143]/30 group-hover:border-[#e5b143]/80 group-hover:scale-110 transition-all duration-200 bg-[#101214]"
                                                onError={e => { e.target.src = g.iconUrl || capsuleUrl(g.appId); }}
                                            />
                                        </a>
                                        {/* Popup — RA game awards style */}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[200px] bg-[#1b2838] border border-[#2a475e] rounded-[2px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] shadow-xl pointer-events-none overflow-hidden">
                                            <div className="h-[2px] bg-gradient-to-r from-[#e5b143] to-[#e5b143]/20" />
                                            <div className="flex items-center gap-2 px-2.5 py-2 border-b border-[#2a475e] bg-[#172333]">
                                                <img
                                                    src={g.lastAchIconUrl || g.iconUrl || capsuleUrl(g.appId)}
                                                    alt=""
                                                    className="w-8 h-8 rounded-[2px] border border-[#e5b143]/30 bg-black shrink-0 object-cover"
                                                />
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[11px] text-white font-semibold leading-tight line-clamp-2">{g.gameName}</span>
                                                    {g.lastAchName && (
                                                        <span className="text-[9px] text-[#8f98a0] leading-tight truncate mt-0.5">{g.lastAchName}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="px-2.5 py-2 flex flex-col gap-1.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[9px] text-[#546270] uppercase tracking-[0.08em]">Award</span>
                                                    <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded-[2px] bg-[#e5b143] text-[#101214]">★ Perfect</span>
                                                </div>
                                                <div className="h-px bg-[#2a475e]" />
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[9px] text-[#546270] uppercase tracking-[0.08em]">Achievements</span>
                                                    <span className="text-[9px] text-[#e5b143] font-medium">{g.total} / {g.total}</span>
                                                </div>
                                                {g.lastAchGlobalPct != null && (
                                                    <>
                                                        <div className="h-px bg-[#2a475e]" />
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[9px] text-[#546270] uppercase tracking-[0.08em]">Rarity</span>
                                                            <span className="text-[9px] font-medium" style={{ color: rarityBorderColor(g.lastAchGlobalPct) }}>
                                                                {rarityLabel(g.lastAchGlobalPct)} · {g.lastAchGlobalPct}%
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                                {g.playtimeForever > 0 && (
                                                    <>
                                                        <div className="h-px bg-[#2a475e]" />
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[9px] text-[#546270] uppercase tracking-[0.08em]">Playtime</span>
                                                            <span className="text-[9px] text-[#c6d4df]">{formatPlaytime(g.playtimeForever)}</span>
                                                        </div>
                                                    </>
                                                )}
                                                {g.completedAt && (
                                                    <>
                                                        <div className="h-px bg-[#2a475e]" />
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[9px] text-[#546270] uppercase tracking-[0.08em]">Completed</span>
                                                            <span className="text-[9px] text-[#c6d4df]">{formatDate(g.completedAt)}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="col-span-full text-center text-[#546270] text-[10px] py-2">No perfect games yet.</div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>

                {/* ── Tab bar — RA style ── */}
                <div className="sticky top-[26px] z-40 bg-[#171a21] -mx-4 md:-mx-8 px-4 md:px-8 flex items-center gap-6 mb-4 border-b border-[#2a475e]">
                    {TABS.map(({ id, label }) => (
                        <button
                            key={id}
                            onClick={() => setTab(id)}
                            className={`pb-2 text-[14px] uppercase tracking-wide font-medium transition-colors relative ${activeTab === id ? 'text-white' : 'text-[#546270] hover:text-[#c6d4df]'}`}
                        >
                            {label}
                            {activeTab === id && <div className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-[#66c0f4]" />}
                        </button>
                    ))}
                </div>

                {/* ── Tab content ── */}
                <div className="flex flex-col gap-3">

                    {activeTab === 'recent' && (
                        gamesData
                            ? <div className="flex flex-col gap-3">
                                {recentlyPlayed.map(game => (
                                    <SteamGameCard key={game.appId} game={game} achievementData={achProgress[game.appId]} onViewDetails={setSelectedGame} />
                                ))}
                              </div>
                            : <div className="flex items-center justify-center py-12 text-[#546270] text-[11px]">Loading games…</div>
                    )}

                    {activeTab === 'progress' && (
                        gamesData
                            ? <ProgressTab achievementProgress={achProgress} recentlyPlayed={recentlyPlayed} onViewDetails={setSelectedGame} />
                            : <div className="flex items-center justify-center py-12 text-[#546270] text-[11px]">Loading games…</div>
                    )}

                    {activeTab === 'activity' && (
                        <ActivityTab achievements={recentAchs} />
                    )}

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
                    className="fixed bottom-14 right-5 z-50 w-9 h-9 bg-[#1b2838] border border-[#2a475e] hover:border-[#66c0f4] hover:text-[#66c0f4] text-[#8f98a0] rounded-[2px] flex items-center justify-center shadow-lg transition-all duration-200 hover:-translate-y-0.5"
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
                    onClose={() => setSelectedGame(null)}
                />
            )}

        </div>
    );
};

createRoot(document.getElementById('root')).render(<App />);
