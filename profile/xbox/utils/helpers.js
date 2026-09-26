export const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const hrs  = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (hrs < 1)    return 'Just now';
    if (hrs < 24)   return `${hrs}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7)   return `${days}d ago`;
    if (days < 30)  return `${Math.floor(days / 7)}w ago`;
    if (days < 90)  return `${Math.floor(days / 30)}mo ago`;
    return formatDate(dateStr);
};

export const fmtDay = (dateStr) => {
    const d         = new Date(dateStr + 'T00:00:00');
    const today     = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString())     return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

export const fmtTime = (str) =>
    str ? new Date(str).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';

// OpenXBL doesn't give store product IDs, so game links go to xbox.com search
export const xboxSearchUrl = (name) =>
    `https://www.xbox.com/en-US/Search/Results?q=${encodeURIComponent(name ?? '')}`;

export const xboxProfileUrl = (gamertag) =>
    `https://www.xbox.com/en-US/play/user/${encodeURIComponent(gamertag ?? '')}`;

export const rarityLabel = (globalPct) => {
    if (globalPct != null && globalPct < 10) return 'Very Rare';
    if (globalPct != null && globalPct < 30) return 'Rare';
    return 'Common';
};

export const rarityBorderColor = (globalPct) => {
    if (globalPct != null && globalPct < 10) return '#e5b143'; // Very Rare — gold
    if (globalPct != null && globalPct < 30) return '#66c0f4'; // Rare      — blue
    return '#8f98a0';                                           // Common    — gray
};

// Xbox images come as full-size originals (box art up to 2160², achievement art
// 1920×1080, avatar 1080²). Both image servers resize on request and keep the
// aspect ratio, so every caller asks for roughly 2× its display width.
// images-eds only accepts certain widths (64/128/150/200/208/300/424).
const EDS_WIDTHS = [64, 128, 150, 200, 208, 300, 424];
export const xboxImg = (url, width) => {
    if (!url) return url;
    if (url.includes('store-images.s-microsoft.com')) return `${url}${url.includes('?') ? '&' : '?'}w=${width}`;
    if (url.includes('images-eds')) return `${url}&w=${EDS_WIDTHS.find(w => w >= width) ?? 424}`;
    return url;   // e.g. Xbox 360 achievement icons (already small)
};
