// Day keys and clock times in the viewer's timezone (see assets/time.js)
export { fmtDayKey as fmtDay, fmtClock as fmtTime } from '../../assets/time.js';

// 45 → "45m", 135 → "2h 15m", 120 → "2h"
export const fmtMinutes = (m) => {
    const min = Math.round(m || 0);
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60), r = min % 60;
    return r ? `${h}h ${r}m` : `${h}h`;
};

// Largest whole unit only, for tight spots: 45 → "45m", 163 → "2h", 1500 → "1d"
export const fmtMinutesShort = (m) => {
    const min = Math.round(m || 0);
    if (min < 60) return `${min}m`;
    if (min < 1440) return `${Math.floor(min / 60)}h`;
    return `${Math.floor(min / 1440)}d`;
};

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
