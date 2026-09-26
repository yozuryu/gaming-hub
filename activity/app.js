import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ChevronDown, Flame } from 'lucide-react';
import { PLATFORM_COLOR, TILDE_TAG_COLORS } from './utils/constants.js';
import { fmtDay, fmtTime, parseTitle, xboxImg } from './utils/helpers.js';
import { normalizeRA, normalizeSteam, normalizeXbox } from './utils/normalizers.js';

const renderTildeTags = (tags) => {
    if (!tags?.length) return null;
    return tags.map(tag => {
        const s = TILDE_TAG_COLORS[tag] || TILDE_TAG_COLORS['Prototype'];
        return (
            <span key={tag} style={{ fontSize: '7px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', padding: '1px 4px', borderRadius: '2px', flexShrink: 0, background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
                {tag}
            </span>
        );
    });
};

// ── Heatmap ───────────────────────────────────────────────────────────────────

const Heatmap = ({ heatmapData, filter, selectedDay, onSelectDay }) => {
    const scrollRef = useRef(null);
    const heatmapKeys = Object.keys(heatmapData).length;

    useEffect(() => {
        if (!scrollRef.current || heatmapKeys === 0) return;
        requestAnimationFrame(() => { scrollRef.current.scrollLeft = scrollRef.current.scrollWidth; });
    }, [heatmapKeys]);

    const days = useMemo(() => {
        const arr = [];
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

    const maxCount = useMemo(() => Math.max(1, ...Object.values(heatmapData).map(d => d.count ?? d)), [heatmapData]);

    const getColor = (key) => {
        const d = heatmapData[key];
        if (!d) return '#101214';
        const ratio = (d.count ?? d) / maxCount;
        if (filter === 'ra') {
            if (ratio >= 0.8)  return '#e5b143';
            if (ratio >= 0.5)  return '#c8901a';
            if (ratio >= 0.25) return '#7a4a10';
            return '#3d2507';
        }
        if (filter === 'steam') {
            if (ratio >= 0.8)  return '#66c0f4';
            if (ratio >= 0.5)  return '#2a7bba';
            if (ratio >= 0.25) return '#1a5275';
            return '#0d2a3d';
        }
        if (filter === 'xbox') {
            if (ratio >= 0.8)  return '#52b043';
            if (ratio >= 0.5)  return '#3a8a30';
            if (ratio >= 0.25) return '#2f6b30';
            return '#1d3d1f';
        }
        if (ratio >= 0.8)  return '#e5b143';
        if (ratio >= 0.5)  return '#66c0f4';
        if (ratio >= 0.25) return '#2a6b9e';
        return '#1a4a70';
    };

    const legendColors = filter === 'ra'
        ? ['#101214', '#3d2507', '#7a4a10', '#c8901a', '#e5b143']
        : filter === 'steam'
        ? ['#101214', '#0d2a3d', '#1a5275', '#2a7bba', '#66c0f4']
        : filter === 'xbox'
        ? ['#101214', '#1d3d1f', '#2f6b30', '#3a8a30', '#52b043']
        : ['#101214', '#1a4a70', '#2a6b9e', '#66c0f4', '#e5b143'];

    return (
        <div className="overflow-x-auto" ref={scrollRef}>
            <div style={{ minWidth: `${53 * 14}px` }}>
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
                    <div className="flex flex-col gap-[2px] mr-1" style={{ paddingTop: '1px' }}>
                        {['M', '', 'W', '', 'F', '', 'S'].map((l, i) => (
                            <div key={i} style={{ height: '12px', width: '20px', fontSize: '7px', lineHeight: '12px', textAlign: 'right', color: '#546270', flexShrink: 0 }}>{l}</div>
                        ))}
                    </div>
                    <div className="flex flex-1 gap-[2px]">
                        {weeks.map((week, wi) => (
                            <div key={wi} className="flex flex-col gap-[2px] flex-1" style={{ minWidth: '10px' }}>
                                {week.map(({ key }) => (
                                    <div
                                        key={key}
                                        onClick={() => onSelectDay(selectedDay === key ? null : key)}
                                        title={`${key}${heatmapData[key] ? ` · ${heatmapData[key].count ?? heatmapData[key]} achievement${(heatmapData[key].count ?? heatmapData[key]) !== 1 ? 's' : ''}` : ''}`}
                                        style={{
                                            height: '12px',
                                            borderRadius: '2px',
                                            background: getColor(key),
                                            cursor: heatmapData[key] ? 'pointer' : 'default',
                                            outline: selectedDay === key ? '1.5px solid #c6d4df' : 'none',
                                            outlineOffset: '1px',
                                        }}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex items-center justify-end gap-1 mt-1.5" style={{ paddingLeft: '28px' }}>
                    <span style={{ fontSize: '8px', color: '#546270' }}>Less</span>
                    {legendColors.map((c, i) => (
                        <div key={i} style={{ width: '10px', height: '10px', borderRadius: '2px', background: c }} />
                    ))}
                    <span style={{ fontSize: '8px', color: '#546270' }}>More</span>
                </div>
            </div>
        </div>
    );
};

// ── Achievement row ───────────────────────────────────────────────────────────

const AchievementRow = ({ ach }) => {
    const color = PLATFORM_COLOR[ach.platform];
    return (
        <div className="flex items-center gap-2 p-2 rounded-[2px] border border-[#2a475e] border-l-[2px] bg-[#1b2838] hover:bg-[#2a475e] transition-colors"
            style={{ borderLeftColor: color }}>
            <div className="shrink-0 w-8 h-8 rounded-[2px] overflow-hidden border border-[#101214] bg-black">
                {ach.achievementIcon
                    ? <img src={ach.achievementIcon} alt={ach.achievementName} className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-[#2a475e]" />
                }
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-[#c6d4df] truncate">{ach.achievementName}</div>
                <p className="text-[9px] text-[#8f98a0] truncate">{ach.description}</p>
            </div>
            <span className="text-[9px] text-[#546270] shrink-0">{fmtTime(ach.unlockedAt)}</span>
        </div>
    );
};

// ── Game session ──────────────────────────────────────────────────────────────

const GameSession = ({ session }) => {
    const isRA   = session.platform === 'ra';
    const sorted = [...session.achs].sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt));

    const times  = session.achs.map(a => new Date(a.unlockedAt).getTime());
    const startT = fmtTime(new Date(Math.min(...times)).toISOString());
    const endT   = fmtTime(new Date(Math.max(...times)).toISOString());
    const timeStr = startT === endT ? startT : `${startT}–${endT}`;

    const { baseTitle, subsetName, isSubset, tags } = isRA ? parseTitle(session.gameName) : {};
    const gameNameNode = isRA ? (
        <>
            <a href={session.gameUrl} target="_blank" rel="noreferrer"
                className="text-[9px] text-[#c6d4df] hover:text-[#66c0f4] uppercase tracking-wider font-medium truncate transition-colors">
                {baseTitle}
            </a>
            {isSubset && (
                <>
                    <span className="text-[7px] font-bold uppercase tracking-[0.07em] px-1 py-[1px] rounded-[2px] border border-[rgba(229,177,67,0.3)] bg-[rgba(229,177,67,0.1)] text-[#c8a84b] shrink-0">Subset</span>
                    <span className="text-[8px] text-[#c8a84b] truncate">{subsetName}</span>
                </>
            )}
            {!isSubset && renderTildeTags(tags)}
        </>
    ) : (
        <a href={session.gameUrl} target="_blank" rel="noreferrer"
            className="text-[9px] text-[#c6d4df] hover:text-[#66c0f4] uppercase tracking-wider font-medium truncate transition-colors">
            {session.gameName}
        </a>
    );

    return (
        <div className="ml-4 border-l border-[#2a475e] pl-3 mb-3">
            <div className="flex items-center gap-2 mb-1.5">
                <img
                    src={isRA ? '../assets/icon-ra.png' : session.platform === 'xbox' ? '../assets/icon-xbox.png' : '../assets/icon-steam.png'}
                    alt=""
                    className="w-3 h-3 shrink-0 object-contain opacity-60"
                    onError={e => { e.target.style.display = 'none'; }}
                />
                <a href={session.gameUrl} target="_blank" rel="noreferrer"
                    className="w-4 h-4 rounded-[1px] overflow-hidden border border-[#101214] bg-black block hover:scale-110 transition-transform shrink-0">
                    <img src={session.gameIcon} alt="" className="w-full h-full object-cover" />
                </a>
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {gameNameNode}
                    {isRA && session.consoleName && (
                        <span className="text-[8px] text-[#546270] shrink-0">· {session.consoleName}</span>
                    )}
                </div>
                <span className="text-[8px] text-[#546270] shrink-0 ml-auto">{timeStr}</span>
            </div>
            <div className="flex flex-col gap-1">
                {sorted.map(ach => <AchievementRow key={ach.id} ach={ach} />)}
            </div>
        </div>
    );
};

// ── App ───────────────────────────────────────────────────────────────────────

const App = () => {
    const [raAchs,        setRaAchs]        = useState([]);
    const [steamAchs,     setSteamAchs]     = useState([]);
    const [raHeatmap,     setRaHeatmap]     = useState({});
    const [steamHeatmap,  setSteamHeatmap]  = useState({});
    const [steamGameIcons, setSteamGameIcons] = useState({});
    const [xboxAchs,      setXboxAchs]      = useState([]);
    const [xboxHeatmap,   setXboxHeatmap]   = useState({});
    const [xboxGameIcons, setXboxGameIcons] = useState({});
    const [loading,       setLoading]       = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextChunk,   setNextChunk]   = useState(2);
    const [filter,      setFilter]      = useState('all');
    const [selectedDay, setSelectedDay] = useState(null);
    const [collapsedDays, setCollapsedDays] = useState(new Set());
    const [showScrollTop, setShowScrollTop] = useState(false);
    const sentinelRef = useRef(null);

    const toggleDay = (day) => setCollapsedDays(prev => {
        const next = new Set(prev);
        next.has(day) ? next.delete(day) : next.add(day);
        return next;
    });

    const fetchChunk = useCallback(async (platform, i) => {
        const path = `../data/${platform}/achievements/${i}.json`;
        const d = await fetch(path)
            .then(r => r.ok ? r.json() : { recentAchievements: [] })
            .catch(() => ({ recentAchievements: [] }));
        const normalized = (d.recentAchievements ?? []).map(
            platform === 'ra' ? normalizeRA : platform === 'xbox' ? normalizeXbox : normalizeSteam
        );
        const icons = platform === 'steam' ? steamGameIcons : platform === 'xbox' ? xboxGameIcons : null;
        if (icons) {
            normalized.forEach(a => {
                const icon = icons[a.gameId];
                if (icon) a.gameIcon = icon;
            });
        }
        return normalized;
    }, [steamGameIcons, xboxGameIcons]);

    useEffect(() => {
        // Fetch both heatmaps separately
        Promise.all([
            fetch('../data/ra/achievements/heatmap.json').then(r => r.json()).catch(() => ({})),
            fetch('../data/steam/achievements/heatmap.json').then(r => r.json()).catch(() => ({})),
            fetch('../data/xbox/achievements/heatmap.json').then(r => r.json()).catch(() => ({})),
        ]).then(([raH, stH, xbH]) => {
            setRaHeatmap(raH.activityHeatmap || {});
            setSteamHeatmap(stH.activityHeatmap || {});
            setXboxHeatmap(xbH.activityHeatmap || {});
        });

        fetch('../data/xbox/games/index.json')
            .then(r => r.json())
            .then(d => {
                const icons = Object.fromEntries(
                    Object.entries(d.achievementProgress ?? {}).map(([id, g]) => [id, xboxImg(g.iconUrl, 64)])
                );
                setXboxGameIcons(icons);
                setXboxAchs(prev => prev.map(a => icons[a.gameId] ? { ...a, gameIcon: icons[a.gameId] } : a));
            })
            .catch(() => {});

        fetch('../data/steam/games/index.json')
            .then(r => r.json())
            .then(d => {
                const icons = Object.fromEntries(
                    Object.entries(d.achievementProgress ?? {}).map(([id, g]) => [id, g.iconUrl])
                );
                setSteamGameIcons(icons);
                setSteamAchs(prev => prev.map(a => icons[a.gameId] ? { ...a, gameIcon: icons[a.gameId] } : a));
            })
            .catch(() => {});

        Promise.all([fetchChunk('ra', 1), fetchChunk('steam', 1), fetchChunk('xbox', 1)]).then(([ra, steam, xbox]) => {
            setRaAchs(ra);
            setSteamAchs(steam);
            setXboxAchs(xbox);
            setLoading(false);
        });
    }, []);

    const loadMore = useCallback(() => {
        if (nextChunk > 4 || loadingMore) return;
        setLoadingMore(true);
        Promise.all([fetchChunk('ra', nextChunk), fetchChunk('steam', nextChunk), fetchChunk('xbox', nextChunk)]).then(([ra, steam, xbox]) => {
            setRaAchs(prev => [...prev, ...ra]);
            setSteamAchs(prev => [...prev, ...steam]);
            setXboxAchs(prev => [...prev, ...xbox]);
            setNextChunk(prev => prev + 1);
            setLoadingMore(false);
        });
    }, [nextChunk, loadingMore, fetchChunk]);

    // Scroll sentinel — auto-load next chunk when bottom is near
    const loadMoreRef = useRef(loadMore);
    useEffect(() => { loadMoreRef.current = loadMore; }, [loadMore]);
    useEffect(() => {
        if (!sentinelRef.current || nextChunk > 4 || loadingMore) return;
        const observer = new IntersectionObserver(
            (entries) => { if (entries[0].isIntersecting) loadMoreRef.current(); },
            { rootMargin: '300px' }
        );
        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [nextChunk, loadingMore, loading]);

    useEffect(() => {
        const onScroll = () => setShowScrollTop(window.scrollY > 300);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const heatmapData = useMemo(() => {
        if (filter === 'ra') return raHeatmap;
        if (filter === 'steam') return steamHeatmap;
        if (filter === 'xbox') return xboxHeatmap;
        const merged = { ...raHeatmap };
        [steamHeatmap, xboxHeatmap].forEach(h => Object.entries(h).forEach(([day, d]) => {
            merged[day] = { count: (merged[day]?.count ?? 0) + (d.count ?? 0) };
        }));
        return merged;
    }, [filter, raHeatmap, steamHeatmap, xboxHeatmap]);

    const streakInfo = useMemo(() => {
        const activeDays = new Set(
            Object.entries(heatmapData)
                .filter(([, d]) => (d.count ?? d) >= 1)
                .map(([day]) => day)
        );
        const toKey = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };
        const today = new Date();
        const todayKey = toKey(today);
        // Count streak from yesterday backwards; add today only if it has achievements
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        let current = 0;
        const cursor = new Date(yesterday);
        while (activeDays.has(toKey(cursor))) {
            current++;
            cursor.setDate(cursor.getDate() - 1);
        }
        if (activeDays.has(todayKey)) current++;
        const sortedDays = [...activeDays].sort();
        let longest = 0, longestStart = null, longestEnd = null;
        let runStart = null, runLen = 0, prev = null;
        for (const day of sortedDays) {
            if (prev === null) {
                runStart = day; runLen = 1;
            } else {
                const expected = new Date(prev);
                expected.setDate(expected.getDate() + 1);
                if (day === toKey(expected)) {
                    runLen++;
                } else {
                    if (runLen > longest) { longest = runLen; longestStart = runStart; longestEnd = prev; }
                    runStart = day; runLen = 1;
                }
            }
            prev = day;
        }
        if (runLen > longest) { longest = runLen; longestStart = runStart; longestEnd = prev; }
        const last14 = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = toKey(d);
            const isToday = i === 0;
            last14.push({
                key,
                label: d.toLocaleDateString('en-GB', { weekday: 'short' }),
                active: activeDays.has(key),
                isToday,
                isPending: isToday && !activeDays.has(key),
            });
        }
        return { current, longest, longestStart, longestEnd, last14 };
    }, [heatmapData]);

    const sourceAchs = useMemo(() => {
        const base = filter === 'ra' ? raAchs
            : filter === 'steam' ? steamAchs
            : filter === 'xbox' ? xboxAchs
            : [...raAchs, ...steamAchs, ...xboxAchs];
        return [...base].sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt));
    }, [raAchs, steamAchs, xboxAchs, filter]);

    const loadedDays = useMemo(() => new Set(sourceAchs.map(a => a.unlockedAt.substring(0, 10))), [sourceAchs]);

    // Auto-load next chunk when selected day has heatmap data but isn't loaded yet
    useEffect(() => {
        if (!selectedDay || !heatmapData[selectedDay] || loadedDays.has(selectedDay) || nextChunk > 4 || loadingMore) return;
        loadMoreRef.current();
    }, [selectedDay, loadedDays, nextChunk, loadingMore]);

    const displayAchs = useMemo(() => {
        if (!selectedDay) return sourceAchs;
        return sourceAchs.filter(a => a.unlockedAt.substring(0, 10) === selectedDay);
    }, [sourceAchs, selectedDay]);

    const groups = useMemo(() => {
        const byDay = {};
        displayAchs.forEach(a => {
            const day = a.unlockedAt.substring(0, 10);
            if (!byDay[day]) byDay[day] = {};
            const key = `${a.platform}-${a.gameId}`;
            if (!byDay[day][key]) byDay[day][key] = {
                platform: a.platform,
                gameId: a.gameId,
                gameName: a.gameName,
                gameIcon: a.gameIcon,
                gameUrl: a.gameUrl,
                consoleName: a.consoleName,
                achs: [],
            };
            byDay[day][key].achs.push(a);
        });
        return Object.entries(byDay)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([day, games]) => {
                const sessions = Object.values(games).sort((a, b) => {
                    const aT = Math.max(...a.achs.map(x => new Date(x.unlockedAt).getTime()));
                    const bT = Math.max(...b.achs.map(x => new Date(x.unlockedAt).getTime()));
                    return bT - aT;
                });
                const achCount = sessions.reduce((s, g) => s + g.achs.length, 0);
                return { day, achCount, sessions };
            });
    }, [displayAchs]);

    const filters = useMemo(() => [
        { id: 'all',   label: 'All',              count: raAchs.length + steamAchs.length + xboxAchs.length },
        { id: 'ra',    label: 'RA',                count: raAchs.length },
        { id: 'steam', label: 'Steam',             count: steamAchs.length },
        { id: 'xbox',  label: 'Xbox',              count: xboxAchs.length },
    ], [raAchs.length, steamAchs.length, xboxAchs.length]);

    return (
        <div className="bg-[#171a21] text-[#c6d4df] min-h-screen flex flex-col font-sans selection:bg-[#66c0f4] selection:text-[#171a21]">
        <style>{`
            @keyframes flameFlicker {
                0%   { transform: scale(1)    rotate(0deg);  opacity: 1;    }
                25%  { transform: scale(1.12) rotate(4deg);  opacity: 0.85; }
                50%  { transform: scale(1.06) rotate(-3deg); opacity: 0.95; }
                75%  { transform: scale(1.10) rotate(2deg);  opacity: 0.88; }
                100% { transform: scale(1)    rotate(0deg);  opacity: 1;    }
            }
            @keyframes pendingPulse {
                0%,100% { border-color: #253545; box-shadow: none; }
                50%     { border-color: #4a7fa0; box-shadow: 0 0 8px rgba(102,192,244,0.18); }
            }
            @keyframes streakGlow {
                0%,100% { text-shadow: none; }
                50%     { text-shadow: 0 0 12px rgba(229,177,67,0.5); }
            }
        `}</style>

            {/* Topbar */}
            <div className="page-topbar sticky top-0 z-50 bg-[#131a22] border-b border-[#101214] px-4 md:px-8 py-1.5 flex items-center gap-2 text-[10px]">
                <a href="../" className="text-[#546270] font-bold tracking-[0.15em] uppercase hover:text-[#8f98a0] transition-colors">Yozuryu</a>
                <span className="text-[#2a475e]">›</span>
                <a href="../" className="text-[#546270] hover:text-[#8f98a0] transition-colors">Gaming Hub</a>
                <span className="text-[#2a475e]">›</span>
                <span className="text-[#c6d4df]">Activity</span>
            </div>

            {/* Header */}
            <header className="bg-[#1b2838] border-b border-[#2a475e] px-4 md:px-8 pt-8 pb-5 md:pt-5 shadow-md">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="w-[3px] h-6 bg-[#66c0f4] rounded-[1px] shrink-0" />
                        <h1 className="text-2xl md:text-[26px] text-white font-medium tracking-wide leading-none flex items-center gap-3">
                            <Activity size={22} className="text-[#66c0f4]" /> Activity
                        </h1>
                    </div>
                    {!loading && (
                        <div className="flex flex-wrap gap-2">
                            <span className="text-[9px] font-semibold uppercase tracking-[0.07em] px-2 py-[3px] rounded-[2px] border border-[#323f4c] bg-[#101214] text-[#546270]">
                                <span className="text-[#c6d4df]">{(raAchs.length + steamAchs.length + xboxAchs.length).toLocaleString()}</span> total
                            </span>
                            <span className="text-[9px] font-semibold uppercase tracking-[0.07em] px-2 py-[3px] rounded-[2px] border border-[#323f4c] bg-[#101214] text-[#546270]">
                                <span className="text-[#e5b143]">{raAchs.length.toLocaleString()}</span> RetroAchievements
                            </span>
                            <span className="text-[9px] font-semibold uppercase tracking-[0.07em] px-2 py-[3px] rounded-[2px] border border-[#323f4c] bg-[#101214] text-[#546270]">
                                <span className="text-[#66c0f4]">{steamAchs.length.toLocaleString()}</span> Steam
                            </span>
                            <span className="text-[9px] font-semibold uppercase tracking-[0.07em] px-2 py-[3px] rounded-[2px] border border-[#323f4c] bg-[#101214] text-[#546270]">
                                <span className="text-[#52b043]">{xboxAchs.length.toLocaleString()}</span> Xbox
                            </span>
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 flex-1 w-full flex flex-col gap-6">

                {loading ? (
                    <div className="flex flex-col gap-6">
                        {/* Heatmap skeleton */}
                        <div>
                            <div className="flex items-center gap-2 border-b border-[#2a475e] pb-1.5 mb-3">
                                <div className="shimmer w-[3px] h-[14px] rounded-[1px]" />
                                <div className="shimmer h-3 w-24 rounded" />
                            </div>
                            <div className="flex gap-[3px] flex-wrap">
                                {[...Array(53)].map((_, i) => (
                                    <div key={i} className="flex flex-col gap-[3px]">
                                        {[...Array(7)].map((_, j) => (
                                            <div key={j} className="shimmer w-[11px] h-[11px] rounded-[2px]" />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Filter bar skeleton */}
                        <div className="flex items-center gap-2">
                            {[...Array(3)].map((_, i) => <div key={i} className="shimmer h-5 w-12 rounded-sm" />)}
                        </div>
                        {/* Timeline skeleton */}
                        <div className="flex flex-col gap-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i}>
                                    {/* Day header */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="shimmer h-3 w-24 rounded" />
                                        <div className="flex-1 h-px bg-[#1e2d3a]" />
                                        <div className="shimmer h-2.5 w-16 rounded" />
                                    </div>
                                    {/* Sessions */}
                                    <div className="ml-4 border-l border-[#2a475e] pl-3 flex flex-col gap-3">
                                        {[...Array(2)].map((_, j) => (
                                            <div key={j}>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <div className="shimmer w-3 h-3 rounded-[1px]" />
                                                    <div className="shimmer w-4 h-4 rounded-[1px]" />
                                                    <div className="shimmer h-2.5 w-32 rounded" />
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    {[...Array(2)].map((_, k) => (
                                                        <div key={k} className="flex items-center gap-2 py-1">
                                                            <div className="shimmer w-6 h-6 rounded-[2px]" />
                                                            <div className="flex flex-col gap-1 flex-1">
                                                                <div className="shimmer h-2.5 rounded" style={{ width: `${55 + k * 15}%` }} />
                                                                <div className="shimmer h-2 rounded" style={{ width: `${35 + k * 10}%` }} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Heatmap */}
                        <div>
                            <div className="flex items-center gap-2 border-b border-[#2a475e] pb-1.5 mb-3">
                                <span className="w-[3px] h-[14px] bg-[#66c0f4] rounded-[1px] shrink-0" />
                                <span className="text-[13px] text-white tracking-wide uppercase font-medium flex items-center gap-2">
                                    <Activity size={15} className="text-[#66c0f4]" /> Heatmap
                                </span>
                                <span className="text-[10px] text-[#546270] ml-auto hidden sm:block">click a day to filter</span>
                                {selectedDay && (
                                    <button
                                        onClick={() => setSelectedDay(null)}
                                        className="text-[9px] text-[#546270] hover:text-[#c6d4df] border border-[#2a475e] px-2 py-0.5 rounded-[2px] transition-colors sm:ml-2"
                                    >
                                        Clear ×
                                    </button>
                                )}
                            </div>
                            <Heatmap
                                heatmapData={heatmapData}
                                filter={filter}
                                selectedDay={selectedDay}
                                onSelectDay={setSelectedDay}
                            />
                            {/* Streak panel */}
                            <div style={{ marginTop: 14, background: 'linear-gradient(160deg, #1c2130 0%, #1b2838 100%)', border: '1px solid #263545', borderRadius: 5, padding: '12px 16px 11px' }}>
                                {/* Header */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                        <span style={{ width: 3, height: 14, background: '#e5b143', borderRadius: 1, flexShrink: 0, display: 'block' }} />
                                        <Flame size={13} color="#e5b143" style={{ animation: 'flameFlicker 1.8s ease-in-out infinite' }} />
                                        <span style={{ fontSize: 11, color: '#8f98a0', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Streak</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                                        <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: streakInfo.current > 0 ? '#e5b143' : '#3d5060', animation: streakInfo.current > 0 ? 'streakGlow 3s ease-in-out infinite' : 'none' }}>
                                            {streakInfo.current}
                                        </span>
                                        <span style={{ fontSize: 9, color: '#546270', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                                            day{streakInfo.current !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>
                                {/* 14-day circles (7 on mobile, 14 on desktop) */}
                                <div style={{ overflowX: 'auto' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                                        {(window.innerWidth < 768 ? streakInfo.last14.slice(-5) : streakInfo.last14).map((d, i, arr) => (
                                            <React.Fragment key={d.key}>
                                                {i > 0 && (
                                                    <div style={{ flex: 1, minWidth: 6, paddingTop: 24, display: 'flex', alignItems: 'flex-start' }}>
                                                        <div style={{ width: '100%', height: 1.5, background: arr[i - 1].active && d.active ? 'rgba(229,177,67,0.35)' : 'transparent' }} />
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                                                    <div
                                                        title={`${d.key}${heatmapData[d.key] ? ` · ${heatmapData[d.key].count ?? heatmapData[d.key]} achievement${(heatmapData[d.key].count ?? heatmapData[d.key]) !== 1 ? 's' : ''}` : ''}`}
                                                        style={{
                                                            width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                            background: d.active
                                                                ? 'linear-gradient(145deg, #2e1f02, #1c1200)'
                                                                : d.isPending
                                                                ? 'linear-gradient(145deg, #0d1825, #0a1018)'
                                                                : '#0e0c10',
                                                            border: `1.5px solid ${d.active ? '#9a7020' : d.isPending ? '#253545' : '#1c1520'}`,
                                                            boxShadow: d.active ? '0 0 10px rgba(229,177,67,0.2), inset 0 1px 0 rgba(229,177,67,0.08)' : 'none',
                                                            animation: d.isPending ? 'pendingPulse 2.5s ease-in-out infinite' : 'none',
                                                        }}
                                                    >
                                                        {d.active ? (
                                                            <>
                                                                <Flame size={16} color="#e5b143" style={{ animation: 'flameFlicker 1.8s ease-in-out infinite', animationDelay: `${i * 0.18}s`, flexShrink: 0 }} />
                                                                <span style={{ fontSize: 9, lineHeight: 1, color: '#c8880a', fontWeight: 700 }}>
                                                                    {heatmapData[d.key]?.count ?? heatmapData[d.key] ?? ''}
                                                                </span>
                                                            </>
                                                        ) : d.isPending ? (
                                                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2a475e', display: 'block', opacity: 0.7 }} />
                                                        ) : (
                                                            <span style={{ fontSize: 12, color: '#3a1e28', lineHeight: 1, fontWeight: 700 }}>✕</span>
                                                        )}
                                                    </div>
                                                    <span style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: d.isToday ? 700 : 500, color: d.active ? '#8a6520' : d.isPending ? '#4a6070' : '#2a1e24' }}>
                                                        {d.isToday ? 'Today' : d.label}
                                                    </span>
                                                </div>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                                {/* Longest streak */}
                                {streakInfo.longestStart && (
                                    <div style={{ marginTop: 10, paddingTop: 9, borderTop: '1px solid #1e2a38', display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <Flame size={10} color="#5a7a40" />
                                        <span style={{ fontSize: 10, color: '#3d5060', letterSpacing: '0.04em' }}>
                                            Best streak: <span style={{ color: '#546270' }}>{streakInfo.longest} day{streakInfo.longest !== 1 ? 's' : ''}</span>
                                            <span style={{ color: '#2a3a48', margin: '0 4px' }}>·</span>
                                            {fmtDay(streakInfo.longestStart)} – {fmtDay(streakInfo.longestEnd)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Filter + count */}
                        <div className="flex items-center gap-2 flex-wrap border-b border-[#2a475e] pb-1.5">
                            <span className="w-[3px] h-[14px] bg-[#66c0f4] rounded-[1px] shrink-0" />
                            <span className="text-[13px] text-white tracking-wide uppercase font-medium">Recent Unlocks</span>
                            <div className="flex items-center gap-1.5 ml-2">
                                {filters.map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => { setFilter(f.id); setSelectedDay(null); }}
                                        className={`text-[9px] font-semibold uppercase tracking-[0.07em] px-2 py-[2px] rounded-[2px] border transition-colors ${
                                            filter === f.id
                                                ? 'bg-[#66c0f4] text-[#101214] border-[#66c0f4]'
                                                : 'text-[#546270] border-[#2a475e] hover:border-[#66c0f4] hover:text-[#c6d4df]'
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                            <span className="text-[10px] text-[#546270] ml-auto">
                                {selectedDay
                                    ? `${fmtDay(selectedDay)} · ${displayAchs.length} achievements`
                                    : `${displayAchs.length} total`}
                            </span>
                        </div>

                        {/* Timeline */}
                        {groups.length === 0 ? (
                            <div className="text-[#8f98a0] text-[11px] py-4 italic text-center">No achievements found.</div>
                        ) : (
                            <div className="flex flex-col gap-0">
                                {groups.map(({ day, achCount, sessions }) => {
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
                                            {!isCollapsed && sessions.map((session) => (
                                                <GameSession key={`${session.platform}-${session.gameId}`} session={session} />
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Scroll sentinel */}
                        {nextChunk <= 4 && (
                            <div ref={sentinelRef} className="py-4 flex justify-center">
                                {loadingMore && <span className="text-[9px] text-[#546270] uppercase tracking-wider">Loading…</span>}
                            </div>
                        )}
                    </>
                )}

            </main>

            {/* Footer */}
            <footer className="bg-[#1b2838] border-t-2 border-[#2a475e] px-4 md:px-8 py-2.5 flex items-center gap-3 mt-auto">
                <div className="w-[3px] h-[18px] rounded-[1px] bg-[#66c0f4] opacity-50 shrink-0" />
                <p className="text-[10px] text-[#546270]">Personal gaming hub · Combined activity</p>
                <a href="../" className="ml-auto text-[10px] text-[#546270] hover:text-[#66c0f4] transition-colors">← Back to hub</a>
            </footer>

            {/* Scroll-to-top */}
            {showScrollTop && (
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="scroll-top-btn fixed bottom-14 right-4 z-50 w-10 h-10 bg-[#131a22] border border-[#2a475e] hover:border-[#66c0f4] hover:text-[#66c0f4] text-[#8f98a0] rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-90"
                    title="Scroll to top"
                >
                    <ChevronDown size={16} className="rotate-180" />
                </button>
            )}

        </div>
    );
};

createRoot(document.getElementById('root')).render(<App />);
