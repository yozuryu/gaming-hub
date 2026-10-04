// Analytics helpers. Pages keep their own small helpers (no shared bundle), so
// xboxImg / parseTitle / fmtMinutes are copies of the Activity page's.

export const RA_MEDIA = 'https://media.retroachievements.org';

// Fixed series order and colors: a series keeps its color whatever is filtered
export const PLATFORMS = ['ra', 'steam', 'xbox'];
export const PLATFORM_COLOR = { ra: '#e5b143', steam: '#66c0f4', xbox: '#52b043' };
export const PLATFORM_LABEL = { ra: 'RetroAchievements', steam: 'Steam', xbox: 'Xbox' };
export const PLATFORM_SHORT = { ra: 'RA', steam: 'Steam', xbox: 'Xbox' };

// RA tilde tags (~Hack~ Title), same colors as the other pages
export const TILDE_TAG_COLORS = {
    'Homebrew':  { bg: 'rgba(102,192,244,0.08)', border: 'rgba(102,192,244,0.3)',  color: '#66c0f4' },
    'Demo':      { bg: 'rgba(87,203,222,0.08)',  border: 'rgba(87,203,222,0.3)',   color: '#57cbde' },
    'Prototype': { bg: 'rgba(143,152,160,0.08)', border: 'rgba(143,152,160,0.3)',  color: '#8f98a0' },
    'Hack':      { bg: 'rgba(255,107,107,0.08)', border: 'rgba(255,107,107,0.3)',  color: '#ff6b6b' },
};

// Rarity tiers, same colors as the Steam profile page
export const RARITY_TIERS = [
    { id: 'ultra',    label: 'Ultra rare', max: 5,        color: '#e5b143' },
    { id: 'very',     label: 'Very rare',  max: 10,       color: '#c8901a' },
    { id: 'rare',     label: 'Rare',       max: 25,       color: '#66c0f4' },
    { id: 'uncommon', label: 'Uncommon',   max: 50,       color: '#8f98a0' },
    { id: 'common',   label: 'Common',     max: Infinity, color: '#546270' },
];
export const rarityTier = (r) => RARITY_TIERS.find(t => r < t.max) ?? RARITY_TIERS[RARITY_TIERS.length - 1];

// Achievement farms: Steam games built to hand out hundreds of achievements in minutes.
// Real games stay at or under ~6 per hour of lifetime playtime; farms run 20 to 700.
export const FARM_PER_HOUR = 15;
export const FARM_MIN_UNLOCKS = 10;   // so a short game with 3 quick achievements isn't flagged

// Magnitude ramp for the punchcards (one hue, dark → light on the dark surface)
export const HEAT_RAMP = ['#101214', '#0d2a3d', '#1a5275', '#2a7bba', '#66c0f4'];

// Parts of the day, lightest (morning) to darkest (night): one hue, ordered like the clock.
// Hours are local; night wraps past midnight.
export const DAY_PARTS = [
    { id: 'morning',   label: 'Morning',   range: '05–12', hours: [5, 6, 7, 8, 9, 10, 11],       color: '#a9dcf8' },
    { id: 'afternoon', label: 'Afternoon', range: '12–17', hours: [12, 13, 14, 15, 16],          color: '#66c0f4' },
    { id: 'evening',   label: 'Evening',   range: '17–22', hours: [17, 18, 19, 20, 21],          color: '#2a7bba' },
    { id: 'night',     label: 'Night',     range: '22–05', hours: [22, 23, 0, 1, 2, 3, 4],       color: '#1a5275' },
];

// Behaviour thresholds
export const DROPPED_MAX_MINUTES = 60;   // tried and dropped: under an hour played in total…
export const DROPPED_IDLE_DAYS = 30;     // …and not touched for this long

// 45 → "45m", 135 → "2h 15m", 120 → "2h"
export const fmtMinutes = (m) => {
    const min = Math.round(m || 0);
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60), r = min % 60;
    return r ? `${h}h ${r}m` : `${h}h`;
};

// Whole hours for large totals: 9790 → "163h"; under an hour → minutes
export const fmtHours = (m) => (m >= 60 ? `${Math.round(m / 60).toLocaleString()}h` : fmtMinutes(m));

export const fmtNum = (n) => Math.round(n || 0).toLocaleString();

export const parseTitle = (title) => {
    if (!title) return { baseTitle: title, subsetName: null, isSubset: false, tags: [] };
    const tags = [];
    const withoutTags = title.replace(/~([^~]+)~\s*/g, (_, tag) => { tags.push(tag); return ''; }).trim();
    const subsetMatch = withoutTags.match(/^(.+?)\s*\[Subset\s*[-–]\s*(.+?)\]$/);
    if (subsetMatch) return { baseTitle: subsetMatch[1].trim(), subsetName: subsetMatch[2].trim(), isSubset: true, tags };
    return { baseTitle: withoutTags, subsetName: null, isSubset: false, tags };
};

// Xbox images are full-size originals; both image servers resize on request
// (images-eds only accepts certain widths). Ask for ~2× the display width.
const EDS_WIDTHS = [64, 128, 150, 200, 208, 300, 424];
export const xboxImg = (url, width) => {
    if (!url) return url;
    if (url.includes('store-images.s-microsoft.com')) return `${url}${url.includes('?') ? '&' : '?'}w=${width}`;
    if (url.includes('images-eds')) return `${url}&w=${EDS_WIDTHS.find(w => w >= width) ?? 424}`;
    return url;
};

export const gameUrl = (platform, id, name) =>
    platform === 'ra' ? `https://retroachievements.org/game/${id}`
    : platform === 'steam' ? `https://store.steampowered.com/app/${id}`
    : `https://www.xbox.com/en-US/Search/Results?q=${encodeURIComponent(name ?? '')}`;

// Clean axis maximum and ticks: 0 / half / max, rounded to a readable step
export const niceMax = (v) => {
    if (v <= 0) return 1;
    const mag = 10 ** Math.floor(Math.log10(v));
    for (const step of [1, 2, 2.5, 5, 10]) if (step * mag >= v) return step * mag;
    return 10 * mag;
};

export const median = (arr) => {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b), mid = s.length >> 1;
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
