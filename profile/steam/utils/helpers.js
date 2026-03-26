export const formatPlaytime = (minutes) => {
    if (!minutes) return '0m';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    return m > 0 ? `${h.toLocaleString()}h ${m}m` : `${h.toLocaleString()}h`;
};

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

export const capsuleUrl = (appId) =>
    `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/capsule_sm_120.jpg`;

export const headerUrl = (appId) =>
    `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;

export const libraryPortraitUrl = (appId) =>
    `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`;

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
