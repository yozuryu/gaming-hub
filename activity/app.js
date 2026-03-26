import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ChevronDown } from 'lucide-react';
import { PLATFORM_COLOR } from './utils/constants.js';
import { fmtDay, fmtTime, parseTitle } from './utils/helpers.js';
import { normalizeRA, normalizeSteam } from './utils/normalizers.js';

// ── Heatmap ───────────────────────────────────────────────────────────────────

const Heatmap = ({ achievements, filter, selectedDay, onSelectDay }) => {
    const heatmapData = useMemo(() => {
        const map = {};
        achievements.forEach(a => {
            const day = a.unlockedAt.substring(0, 10);
            map[day] = (map[day] ?? 0) + 1;
        });
        return map;
    }, [achievements]);

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

    const maxCount = useMemo(() => Math.max(1, ...Object.values(heatmapData)), [heatmapData]);

    const getColor = (key) => {
        const count = heatmapData[key];
        if (!count) return '#101214';
        const ratio = count / maxCount;
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
        if (ratio >= 0.8)  return '#e5b143';
        if (ratio >= 0.5)  return '#66c0f4';
        if (ratio >= 0.25) return '#2a6b9e';
        return '#1a4a70';
    };

    const legendColors = filter === 'ra'
        ? ['#101214', '#3d2507', '#7a4a10', '#c8901a', '#e5b143']
        : filter === 'steam'
        ? ['#101214', '#0d2a3d', '#1a5275', '#2a7bba', '#66c0f4']
        : ['#101214', '#1a4a70', '#2a6b9e', '#66c0f4', '#e5b143'];

    return (
        <div className="overflow-x-auto">
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
                                        title={`${key}: ${heatmapData[key] ?? 0} achievement${heatmapData[key] !== 1 ? 's' : ''}`}
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

    const { baseTitle, subsetName, isSubset } = isRA ? parseTitle(session.gameName) : {};
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
                    src={isRA ? '../assets/icon-ra.png' : '../assets/icon-steam.png'}
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
    const [raAchs,      setRaAchs]      = useState([]);
    const [steamAchs,   setSteamAchs]   = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [filter,      setFilter]      = useState('all');
    const [selectedDay, setSelectedDay] = useState(null);
    const [collapsedDays, setCollapsedDays] = useState(new Set());
    const [showScrollTop, setShowScrollTop] = useState(false);

    const toggleDay = (day) => setCollapsedDays(prev => {
        const next = new Set(prev);
        next.has(day) ? next.delete(day) : next.add(day);
        return next;
    });

    useEffect(() => {
        Promise.all([
            Promise.all([1, 2, 3, 4].map(i =>
                fetch(`../data/retroachievements/achievements_${i}.json`)
                    .then(r => r.ok ? r.json() : { recentAchievements: [] })
                    .catch(() => ({ recentAchievements: [] }))
                    .then(d => (d.recentAchievements ?? []).map(normalizeRA))
            )).then(chunks => chunks.flat()),
            fetch('../data/steam/achievements.json')
                .then(r => r.ok ? r.json() : { recentAchievements: [] })
                .catch(() => ({ recentAchievements: [] }))
                .then(d => (d.recentAchievements ?? []).map(normalizeSteam)),
        ]).then(([ra, steam]) => {
            setRaAchs(ra);
            setSteamAchs(steam);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        const onScroll = () => setShowScrollTop(window.scrollY > 300);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const sourceAchs = useMemo(() => {
        const base = filter === 'ra' ? raAchs
            : filter === 'steam' ? steamAchs
            : [...raAchs, ...steamAchs];
        return [...base].sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt));
    }, [raAchs, steamAchs, filter]);

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
        { id: 'all',   label: 'All',              count: raAchs.length + steamAchs.length },
        { id: 'ra',    label: 'RetroAchievements', count: raAchs.length },
        { id: 'steam', label: 'Steam',             count: steamAchs.length },
    ], [raAchs.length, steamAchs.length]);

    return (
        <div className="bg-[#171a21] text-[#c6d4df] min-h-screen flex flex-col font-sans selection:bg-[#66c0f4] selection:text-[#171a21]">

            {/* Topbar */}
            <div className="sticky top-0 z-50 bg-[#131a22] border-b border-[#101214] px-4 md:px-8 py-1.5 flex items-center gap-2 text-[10px]">
                <a href="../" className="text-[#546270] font-bold tracking-[0.15em] uppercase hover:text-[#8f98a0] transition-colors">Yozuryu</a>
                <span className="text-[#2a475e]">›</span>
                <a href="../" className="text-[#546270] hover:text-[#8f98a0] transition-colors">Gaming Hub</a>
                <span className="text-[#2a475e]">›</span>
                <span className="text-[#c6d4df]">Activity</span>
            </div>

            {/* Header */}
            <header className="bg-[#1b2838] border-b border-[#2a475e] px-4 md:px-8 py-5 shadow-md">
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
                                <span className="text-[#c6d4df]">{(raAchs.length + steamAchs.length).toLocaleString()}</span> total
                            </span>
                            <span className="text-[9px] font-semibold uppercase tracking-[0.07em] px-2 py-[3px] rounded-[2px] border border-[#323f4c] bg-[#101214] text-[#546270]">
                                <span className="text-[#e5b143]">{raAchs.length.toLocaleString()}</span> RetroAchievements
                            </span>
                            <span className="text-[9px] font-semibold uppercase tracking-[0.07em] px-2 py-[3px] rounded-[2px] border border-[#323f4c] bg-[#101214] text-[#546270]">
                                <span className="text-[#66c0f4]">{steamAchs.length.toLocaleString()}</span> Steam
                            </span>
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 flex-1 w-full flex flex-col gap-6">

                {loading ? (
                    <div className="flex items-center justify-center py-16 text-[#546270] text-[11px]">Loading…</div>
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
                                achievements={sourceAchs}
                                filter={filter}
                                selectedDay={selectedDay}
                                onSelectDay={setSelectedDay}
                            />
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
                    className="fixed bottom-14 right-5 z-50 w-9 h-9 bg-[#1b2838] border border-[#2a475e] hover:border-[#66c0f4] hover:text-[#66c0f4] text-[#8f98a0] rounded-[2px] flex items-center justify-center shadow-lg transition-all duration-200 hover:-translate-y-0.5"
                    title="Scroll to top"
                >
                    <ChevronDown size={16} className="rotate-180" />
                </button>
            )}

        </div>
    );
};

createRoot(document.getElementById('root')).render(<App />);
