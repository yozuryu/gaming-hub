import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ChevronDown, GitCommit, RefreshCw } from 'lucide-react';

// ── Parser ─────────────────────────────────────────────────────────────────────
// Parses the changelog markdown into: [{ date, sections: [{ title, entries[] }] }]

const parseChangelog = (md) => {
    const releases = [];
    let current = null;
    let currentSection = null;

    for (const raw of md.split('\n')) {
        const line = raw.trim();
        if (!line || line === '---') continue;

        if (line.startsWith('## ')) {
            currentSection = null;
            current = { date: line.slice(3).trim(), summary: null, sections: [] };
            releases.push(current);
        } else if (line.startsWith('### ') && current) {
            currentSection = { title: line.slice(4).trim(), entries: [] };
            current.sections.push(currentSection);
        } else if (line.startsWith('- ') && currentSection) {
            currentSection.entries.push(line.slice(2).trim());
        } else if (current && !currentSection && !line.startsWith('#')) {
            current.summary = line;
        }
    }

    return releases;
};

// Inline code: `foo` → <code>
const renderText = (text) => {
    const parts = text.split(/(`[^`]+`)/g);
    return parts.map((part, i) =>
        part.startsWith('`') && part.endsWith('`')
            ? <code key={i} className="text-[#57cbde] bg-[#101214] border border-[#2a475e] px-1 py-px rounded-[2px] text-[10px] font-mono">{part.slice(1, -1)}</code>
            : part
    );
};

// ── Section order + colors ─────────────────────────────────────────────────────

const SECTION_ORDER = [
    'RetroAchievements',
    'Steam',
    'Xbox',
    'Hub',
    'Completions',
    'Activity',
    'Pipelines',
    'Structure',
    'Admin',
];

const sortSections = (sections) => {
    const idx = (title) => {
        const i = SECTION_ORDER.indexOf(title);
        return i === -1 ? SECTION_ORDER.length : i;
    };
    return [...sections].sort((a, b) => idx(a.title) - idx(b.title));
};

const SECTION_COLORS = {
    'RetroAchievements': '#e5b143',
    'Steam':             '#66c0f4',
    'Xbox':              '#52b043',
    'Hub':               '#c6d4df',
    'Completions':       '#c6d4df',
    'Activity':          '#c6d4df',
    'Pipelines':         '#8f98a0',
    'Structure':         '#8f98a0',
    'Admin':             '#ff6b6b',
};

const sectionColor = (title) =>
    SECTION_COLORS[title] ?? '#8f98a0';

// ── Components ────────────────────────────────────────────────────────────────

const Entry = ({ text }) => (
    <li className="flex items-start gap-2 text-[11px] text-[#8f98a0] leading-relaxed py-[3px]">
        <span className="mt-[5px] w-[4px] h-[4px] rounded-full bg-[#2a475e] shrink-0" />
        <span>{renderText(text)}</span>
    </li>
);

const Section = ({ title, entries }) => {
    const color = sectionColor(title);
    return (
        <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
                <span className="w-[3px] h-[12px] rounded-[1px] shrink-0" style={{ background: color }} />
                <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color }}>
                    {title}
                </span>
            </div>
            <ul className="ml-3 border-l border-[#1e2d3a] pl-3 flex flex-col">
                {entries.map((e, i) => <Entry key={i} text={e} />)}
            </ul>
        </div>
    );
};

const Release = ({ date, summary, sections, defaultOpen }) => {
    const [open, setOpen] = useState(defaultOpen);
    const totalEntries = sections.reduce((s, sec) => s + sec.entries.length, 0);

    // Handle "vYYYY.MM.DD — Label" or plain version strings
    const [rawVersion, ...labelParts] = date.split('—');
    const label = labelParts.join('—').trim();
    const formatted = rawVersion.trim();

    return (
        <div className="mb-3">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-3 group outline-none"
            >
                <div className="w-2.5 h-2.5 rounded-full border-2 border-[#66c0f4] bg-[#171a21] shrink-0 group-hover:bg-[#66c0f4] transition-colors" />
                <span className="text-[13px] font-semibold text-[#c6d4df] group-hover:text-white transition-colors">
                    {formatted}
                    {label && <span className="text-[#546270] font-normal ml-2">— {label}</span>}
                </span>
                <div className="flex-1 h-px bg-[#1e2d3a]" />
                <span className="text-[9px] text-[#546270] shrink-0">
                    {totalEntries} change{totalEntries !== 1 ? 's' : ''}
                </span>
                <ChevronDown
                    size={12}
                    className={`text-[#546270] transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open && (
                <div className="ml-[18px] border-l-2 border-[#1e2d3a] pl-4 pt-3 mt-2">
                    {summary && (
                        <p className="text-[11px] text-[#546270] italic mb-4">{renderText(summary)}</p>
                    )}
                    {sortSections(sections).map((sec, i) => <Section key={i} title={sec.title} entries={sec.entries} />)}
                </div>
            )}
        </div>
    );
};

// ── App ───────────────────────────────────────────────────────────────────────

const App = () => {
    const [releases, setReleases] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // Clears the service worker's cached app files (not data) and reloads,
    // so the latest deployed HTML/JS is fetched fresh
    const refreshApp = async () => {
        setRefreshing(true);
        try {
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
            }
            const reg = await navigator.serviceWorker?.getRegistration();
            await reg?.update();
        } catch { /* reload anyway */ }
        location.reload();
    };

    useEffect(() => {
        fetch('../changelog.md')
            .then(r => r.text())
            .then(md => setReleases(parseChangelog(md)))
            .catch(() => setReleases([]));
    }, []);

    return (
        <div className="bg-[#171a21] text-[#c6d4df] min-h-screen flex flex-col font-sans selection:bg-[#66c0f4] selection:text-[#171a21]">

            {/* Topbar */}
            <div className="page-topbar sticky top-0 z-50 bg-[#131a22] border-b border-[#101214] px-4 md:px-8 py-1.5 flex items-center gap-2 text-[10px]">
                <a href="../" className="text-[#546270] font-bold tracking-[0.15em] uppercase hover:text-[#8f98a0] transition-colors">Yozuryu</a>
                <span className="text-[#2a475e]">›</span>
                <a href="../" className="text-[#546270] hover:text-[#8f98a0] transition-colors">Gaming Hub</a>
                <span className="text-[#2a475e]">›</span>
                <span className="text-[#c6d4df]">Changelog</span>
            </div>

            {/* Header */}
            <header className="bg-[#1b2838] border-b border-[#2a475e] px-4 md:px-8 pt-8 pb-5 md:pt-5 shadow-md">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="w-[3px] h-6 bg-[#66c0f4] rounded-[1px] shrink-0" />
                        <h1 className="text-2xl md:text-[26px] text-white font-medium tracking-wide leading-none flex items-center gap-3">
                            <GitCommit size={22} className="text-[#66c0f4]" /> Changelog
                        </h1>
                        {releases && (
                            <span className="ml-2 text-[9px] font-semibold uppercase tracking-[0.07em] px-2 py-[3px] rounded-[2px] border border-[#323f4c] bg-[#101214] text-[#546270]">
                                <span className="text-[#c6d4df]">{releases.length}</span> releases
                            </span>
                        )}
                        <button
                            onClick={refreshApp}
                            disabled={refreshing}
                            title="Fetch the latest app files. Your data is not affected."
                            className="ml-auto flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.07em] px-2 py-[3px] rounded-[2px] border border-[#323f4c] bg-[#101214] text-[#8f98a0] hover:text-[#66c0f4] hover:border-[#66c0f4]/50 active:scale-95 transition-colors disabled:opacity-60"
                        >
                            <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} />
                            {refreshing ? 'Refreshing…' : 'Refresh app'}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 md:px-8 py-6 flex-1 w-full">
                {releases === null ? (
                    <div className="flex flex-col gap-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="shimmer w-2.5 h-2.5 rounded-full shrink-0" />
                                <div className="shimmer h-3 w-28 rounded" />
                                <div className="flex-1 h-px bg-[#1e2d3a]" />
                                <div className="shimmer h-2.5 w-16 rounded" />
                            </div>
                        ))}
                    </div>
                ) : releases.length === 0 ? (
                    <div className="text-center py-16 text-[#546270] text-[11px]">Could not load changelog.</div>
                ) : (
                    <div className="flex flex-col">
                        {releases.map((r, i) => (
                            <Release key={r.date} date={r.date} summary={r.summary} sections={r.sections} defaultOpen={i === 0} />
                        ))}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="bg-[#1b2838] border-t-2 border-[#2a475e] px-4 md:px-8 py-2.5 flex items-center gap-3 mt-auto">
                <div className="w-[3px] h-[18px] rounded-[1px] bg-[#66c0f4] opacity-50 shrink-0" />
                <p className="text-[10px] text-[#546270]">Personal gaming hub · Changelog</p>
                <a href="../" className="ml-auto text-[10px] text-[#546270] hover:text-[#66c0f4] transition-colors">← Back to hub</a>
            </footer>

        </div>
    );
};

createRoot(document.getElementById('root')).render(<App />);
