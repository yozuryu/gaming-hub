import React, { useState, useMemo, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Star, Medal, Gem, Clock, Gamepad2, ChevronDown } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

const RA_MEDIA = 'https://media.retroachievements.org';
const RA_SITE  = 'https://retroachievements.org';

const formatPlaytime = mins => {
    if (!mins) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m > 0 ? ` ${m}m` : ''}`.trim() : `${m}m`;
};

const fmtDate = iso => new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
});

const fmtMonthYear = key => {
    const [year, month] = key.split('-');
    return new Date(Date.UTC(+year, +month - 1, 1))
        .toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};

const rarityLabel = pct => pct < 1 ? 'Ultra Rare' : pct < 10 ? 'Very Rare' : pct < 25 ? 'Rare' : pct < 50 ? 'Uncommon' : 'Common';
const rarityColor = pct => pct < 1 ? '#ff6b6b' : pct < 10 ? '#e5b143' : pct < 25 ? '#66c0f4' : '#8f98a0';

const parseTitle = title => {
    if (!title) return { baseTitle: title, subsetName: null, isSubset: false, tags: [] };
    const tags = [];
    const withoutTags = title.replace(/~([^~]+)~\s*/g, (_, tag) => { tags.push(tag); return ''; }).trim();
    const subsetMatch = withoutTags.match(/^(.+?)\s*\[Subset\s*[-–]\s*(.+?)\]$/);
    if (subsetMatch) return { baseTitle: subsetMatch[1].trim(), subsetName: subsetMatch[2].trim(), isSubset: true, tags };
    return { baseTitle: withoutTags, subsetName: null, isSubset: false, tags };
};

const TILDE_TAG_COLORS = {
    'Homebrew':  { bg: 'rgba(102,192,244,0.08)', border: 'rgba(102,192,244,0.3)',  color: '#66c0f4' },
    'Demo':      { bg: 'rgba(87,203,222,0.08)',  border: 'rgba(87,203,222,0.3)',   color: '#57cbde' },
    'Prototype': { bg: 'rgba(143,152,160,0.08)', border: 'rgba(143,152,160,0.3)',  color: '#8f98a0' },
    'Hack':      { bg: 'rgba(255,107,107,0.08)', border: 'rgba(255,107,107,0.3)',  color: '#ff6b6b' },
};

const TildeTags = ({ tags }) => tags.map(tag => {
    const s = TILDE_TAG_COLORS[tag] || TILDE_TAG_COLORS['Prototype'];
    return (
        <span key={tag} className="text-[7px] font-bold uppercase tracking-[0.07em] px-1 py-[1px] rounded-[2px] shrink-0"
            style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
            {tag}
        </span>
    );
});

// ── Normalizers ───────────────────────────────────────────────────────────────

const normalizeRA = (awards, showBeaten) =>
    awards
        .filter(a => {
            if (a.awardType === 'Mastery/Completion') return true;
            if (showBeaten && a.awardType === 'Game Beaten' && a.awardDataExtra === 1) return true;
            return false;
        })
        .map(a => ({
            platform: 'ra',
            type: a.awardType === 'Mastery/Completion' ? 'mastered' : 'beaten',
            completedAt: a.awardedAt,
            gameId: a.awardData,
            gameName: a.title,
            ...parseTitle(a.title),
            iconUrl: `${RA_MEDIA}${a.imageIcon}`,
            console: a.consoleName,
            gameUrl: `${RA_SITE}/game/${a.awardData}`,
        }));

const normalizeSteam = perfectGames =>
    perfectGames.map(g => ({
        platform: 'steam',
        type: 'perfect',
        completedAt: g.completedAt,
        gameId: g.appId,
        gameName: g.gameName,
        iconUrl: g.lastAchIconUrl || g.iconUrl,
        total: g.total,
        lastAchName: g.lastAchName,
        lastAchGlobalPct: g.lastAchGlobalPct,
        playtime: g.playtimeForever,
        gameUrl: `https://store.steampowered.com/app/${g.appId}`,
    }));

// ── Group by month ────────────────────────────────────────────────────────────

const groupByMonth = completions => {
    const map = {};
    completions.forEach(c => {
        const d = new Date(c.completedAt);
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        if (!map[key]) map[key] = [];
        map[key].push(c);
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
};

// ── Type config ───────────────────────────────────────────────────────────────

const TYPE_CFG = {
    mastered:  { label: 'Mastered', stripe: '#e5b143', badgeBg: '#e5b143', badgeText: '#101214', icon: <Star  size={7} /> },
    beaten:    { label: 'Beaten',   stripe: '#66c0f4', badgeBg: '#1b4f72', badgeText: '#66c0f4', icon: <Medal size={7} /> },
    perfect:   { label: 'Perfect',    stripe: '#e5b143', badgeBg: '#e5b143', badgeText: '#101214', icon: <Star  size={7} /> },
};

// ── CompletionCard ────────────────────────────────────────────────────────────

const CompletionCard = ({ item }) => {
    const cfg = TYPE_CFG[item.type] ?? TYPE_CFG.beaten;

    return (
        <div
            className="flex items-center gap-3 bg-[#1b2838] border border-[#2a475e] border-l-[3px] rounded-[3px] p-3 hover:-translate-y-0.5 transition-transform"
            style={{ borderLeftColor: cfg.stripe }}
        >
            {/* Icon */}
            <a href={item.gameUrl} target="_blank" rel="noreferrer"
                className="shrink-0 w-12 h-12 rounded-[2px] border border-[#101214] overflow-hidden bg-[#101214] hover:scale-105 transition-transform">
                <img src={item.iconUrl} alt={item.gameName} className="w-full h-full object-cover"
                    onError={e => { e.target.style.display = 'none'; }} />
            </a>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <a href={item.gameUrl} target="_blank" rel="noreferrer"
                        className="text-[13px] font-medium text-white hover:text-[#66c0f4] transition-colors leading-tight">
                        {item.baseTitle || item.gameName}
                    </a>
                    {item.isSubset && (
                        <span className="text-[7px] font-bold uppercase tracking-[0.07em] px-1 py-[1px] rounded-[2px] shrink-0"
                            style={{ border: '1px solid rgba(229,177,67,0.3)', background: 'rgba(229,177,67,0.08)', color: '#c8a84b' }}>
                            Subset
                        </span>
                    )}
                    {!item.isSubset && item.tags?.length > 0 && <TildeTags tags={item.tags} />}
                    <span
                        className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded-[2px] shrink-0 flex items-center gap-1"
                        style={{ background: cfg.badgeBg, color: cfg.badgeText }}
                    >
                        {cfg.icon}{cfg.label}
                    </span>
                    {/* Platform icon */}
                    <img
                        src={item.platform === 'ra' ? '../assets/icon-ra.png' : '../assets/icon-steam.png'}
                        alt={item.platform}
                        className="w-3 h-3 object-contain opacity-60 shrink-0"
                    />
                </div>
                {item.isSubset && item.subsetName && (
                    <div className="text-[10px] mb-0.5" style={{ color: '#c8a84b' }}>{item.subsetName}</div>
                )}

                <div className="flex items-center gap-2 text-[10px] text-[#8f98a0] flex-wrap">
                    {item.console && (
                        <span className="flex items-center gap-1">
                            <Gamepad2 size={9} className="text-[#546270]" />{item.console}
                        </span>
                    )}
                    {item.lastAchName && (
                        <span className="truncate max-w-[220px] italic">{item.lastAchName}</span>
                    )}
                    {item.lastAchGlobalPct != null && (
                        <span className="flex items-center gap-1 shrink-0 font-medium"
                            style={{ color: rarityColor(item.lastAchGlobalPct) }}>
                            <Gem size={8} />{rarityLabel(item.lastAchGlobalPct)} · {item.lastAchGlobalPct}%
                        </span>
                    )}
                </div>
            </div>

            {/* Right: stats + date */}
            <div className="flex flex-col items-end gap-0.5 shrink-0 text-right">
                {item.total != null && (
                    <span className="text-[9px] font-medium" style={{ color: cfg.stripe }}>
                        {item.total}/{item.total}
                    </span>
                )}
                {item.playtime > 0 && (
                    <span className="text-[9px] text-[#546270] flex items-center gap-1">
                        <Clock size={8} />{formatPlaytime(item.playtime)}
                    </span>
                )}
                <span className="text-[9px] text-[#546270]">{fmtDate(item.completedAt)}</span>
            </div>
        </div>
    );
};

// ── App ───────────────────────────────────────────────────────────────────────

const App = () => {
    const currentYear = String(new Date().getFullYear());

    const [raProfile,     setRaProfile]     = useState(null);
    const [steamProfile,  setSteamProfile]  = useState(null);
    const [platform,      setPlatform]      = useState('all');
    const [showBeaten,    setShowBeaten]    = useState(false);
    const [expandedYears, setExpandedYears] = useState(new Set([currentYear]));

    const toggleYear = year =>
        setExpandedYears(prev => {
            const next = new Set(prev);
            next.has(year) ? next.delete(year) : next.add(year);
            return next;
        });

    useEffect(() => {
        fetch('../data/ra/profile.json')
            .then(r => r.json()).then(setRaProfile).catch(() => setRaProfile({}));
        fetch('../data/steam/profile.json')
            .then(r => r.json()).then(setSteamProfile).catch(() => setSteamProfile({}));
    }, []);

    const completions = useMemo(() => {
        const ra    = normalizeRA(raProfile?.pageAwards?.visibleUserAwards ?? [], showBeaten);
        const steam = normalizeSteam(steamProfile?.perfectGames ?? []);
        let all = [...ra, ...steam];
        if (platform === 'ra')    all = all.filter(c => c.platform === 'ra');
        if (platform === 'steam') all = all.filter(c => c.platform === 'steam');
        return all.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    }, [raProfile, steamProfile, platform, showBeaten]);

    const groups  = useMemo(() => groupByMonth(completions), [completions]);
    const loading = raProfile === null || steamProfile === null;

    // Group months under years for rendering
    const byYear = useMemo(() => {
        const map = {};
        groups.forEach(([key, items]) => {
            const year = key.split('-')[0];
            if (!map[year]) map[year] = [];
            map[year].push([key, items]);
        });
        return Object.entries(map).sort(([a], [b]) => +b - +a);
    }, [groups]);

    return (
        <div className="bg-[#171a21] text-[#c6d4df] min-h-screen flex flex-col font-sans selection:bg-[#66c0f4] selection:text-[#171a21]">

            {/* Topbar */}
            <div className="sticky top-0 z-50 bg-[#131a22] border-b border-[#101214] px-4 md:px-8 py-1.5 flex items-center gap-2 text-[10px]">
                <a href="../" className="text-[#546270] font-bold tracking-[0.15em] uppercase hover:text-[#8f98a0] transition-colors">Yozuryu</a>
                <span className="text-[#2a475e]">›</span>
                <a href="../" className="text-[#546270] hover:text-[#8f98a0] transition-colors">Gaming Hub</a>
                <span className="text-[#2a475e]">›</span>
                <span className="text-[#c6d4df]">Completions</span>
            </div>

            {/* Header */}
            <header className="bg-[#1b2838] border-b border-[#2a475e] px-4 md:px-8 py-5 shadow-md">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center gap-3">
                        <span className="w-[3px] h-6 bg-[#e5b143] rounded-[1px] shrink-0" />
                        <h1 className="text-2xl md:text-[26px] text-white font-medium tracking-wide leading-none flex items-center gap-3">
                            <Star size={22} className="text-[#e5b143]" /> Completions
                        </h1>
                        {!loading && (
                            <span className="ml-2 text-[9px] font-semibold uppercase tracking-[0.07em] px-2 py-[3px] rounded-[2px] border border-[#323f4c] bg-[#101214] text-[#546270]">
                                <span className="text-[#c6d4df]">{completions.length}</span> total
                            </span>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 md:px-8 py-6 flex-1 w-full">

                {/* Filter bar */}
                <div className="flex items-center gap-3 mb-6 flex-wrap">
                    <div className="flex items-center gap-1.5">
                        {[
                            { value: 'all',   label: 'All'   },
                            { value: 'ra',    label: 'RA'    },
                            { value: 'steam', label: 'Steam' },
                        ].map(opt => (
                            <button key={opt.value} onClick={() => setPlatform(opt.value)}
                                className={`text-[9px] font-semibold uppercase tracking-wider px-2.5 py-[3px] rounded-sm border transition-colors ${
                                    platform === opt.value
                                        ? 'bg-[#66c0f4] text-[#101214] border-[#66c0f4]'
                                        : 'bg-[#101214] text-[#8f98a0] border-[#323f4c] hover:text-[#c6d4df] hover:border-[#546270]'
                                }`}>{opt.label}</button>
                        ))}
                    </div>

                    <div className="w-px h-4 bg-[#2a475e]" />

                    <label className="flex items-center gap-1.5 cursor-pointer select-none group">
                        <input
                            type="checkbox"
                            checked={showBeaten}
                            onChange={e => setShowBeaten(e.target.checked)}
                            className="w-3 h-3 cursor-pointer accent-[#66c0f4]"
                        />
                        <span className="text-[9px] text-[#8f98a0] group-hover:text-[#c6d4df] transition-colors uppercase tracking-wider">
                            Also show beaten games
                        </span>
                    </label>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col gap-5">
                        {[...Array(2)].map((_, i) => (
                            <div key={i}>
                                {/* Year header skeleton */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="shimmer h-3 w-10 rounded" />
                                    <div className="flex-1 h-px bg-[#1e2d3a]" />
                                    <div className="shimmer h-2.5 w-20 rounded" />
                                </div>
                                {/* Month + cards */}
                                <div className="ml-3 border-l border-[#1e2d3a] pl-4 flex flex-col gap-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="shimmer h-2.5 w-28 rounded" />
                                            <div className="flex-1 h-px bg-[#1e2d3a]" />
                                            <div className="shimmer h-2 w-16 rounded" />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {[...Array(3)].map((_, j) => (
                                                <div key={j} className="flex items-center gap-3 bg-[#1b2838] border border-[#1e2d3a] rounded-[3px] p-3">
                                                    <div className="shimmer w-12 h-12 rounded-[2px] shrink-0" />
                                                    <div className="flex-1 flex flex-col gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="shimmer h-3 rounded" style={{ width: `${45 + j * 12}%` }} />
                                                            <div className="shimmer h-3 w-14 rounded" />
                                                        </div>
                                                        <div className="shimmer h-2 w-32 rounded" />
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                        <div className="shimmer h-2.5 w-12 rounded" />
                                                        <div className="shimmer h-2 w-16 rounded" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : completions.length === 0 ? (
                    <div className="text-center py-16 text-[#546270] text-[11px]">No completions found.</div>
                ) : (
                    <div className="flex flex-col gap-5">
                        {byYear.map(([year, monthGroups]) => {
                            const open = expandedYears.has(year);
                            const yearTotal = monthGroups.reduce((s, [, items]) => s + items.length, 0);
                            return (
                                <div key={year}>
                                    {/* Year header */}
                                    <button
                                        onClick={() => toggleYear(year)}
                                        className="w-full flex items-center gap-3 group outline-none mb-3"
                                    >
                                        <span className="text-[13px] font-bold tracking-[0.1em] text-[#c6d4df] group-hover:text-white transition-colors shrink-0 flex items-center gap-1.5">
                                            {year}
                                            <ChevronDown size={11} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                                        </span>
                                        <div className="flex-1 h-px bg-[#1e2d3a]" />
                                        <span className="text-[9px] text-[#2a475e] shrink-0">
                                            {yearTotal} completion{yearTotal !== 1 ? 's' : ''}
                                        </span>
                                    </button>

                                    {open && (
                                        <div className="ml-3 border-l border-[#1e2d3a] pl-4 flex flex-col gap-4">
                                            {monthGroups.map(([monthKey, items]) => (
                                                <div key={monthKey}>
                                                    {/* Month header */}
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="text-[11px] font-semibold text-[#8f98a0] tracking-wide shrink-0">
                                                            {fmtMonthYear(monthKey)}
                                                        </span>
                                                        <div className="flex-1 h-px bg-[#1e2d3a]" />
                                                        <span className="text-[9px] text-[#546270] shrink-0">
                                                            {items.length} completion{items.length !== 1 ? 's' : ''}
                                                        </span>
                                                    </div>

                                                    {/* Cards */}
                                                    <div className="flex flex-col gap-2">
                                                        {items.map((item, i) => (
                                                            <CompletionCard key={`${item.platform}-${item.gameId}-${i}`} item={item} />
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="bg-[#1b2838] border-t-2 border-[#2a475e] px-4 md:px-8 py-2.5 flex items-center gap-3 mt-auto">
                <div className="w-[3px] h-[18px] rounded-[1px] bg-[#e5b143] opacity-50 shrink-0" />
                <p className="text-[10px] text-[#546270]">Personal gaming hub · Completions</p>
                <a href="../" className="ml-auto text-[10px] text-[#546270] hover:text-[#66c0f4] transition-colors">← Back to hub</a>
            </footer>

        </div>
    );
};

createRoot(document.getElementById('root')).render(<App />);
