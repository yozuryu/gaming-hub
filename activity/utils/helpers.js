export const fmtDay = (isoDay) =>
    new Date(isoDay + 'T00:00:00Z').toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
    });

export const fmtTime = (iso) =>
    new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });

export const parseTitle = (title) => {
    if (!title) return { baseTitle: title, subsetName: null, isSubset: false };
    const withoutTags = title.replace(/~([^~]+)~\s*/g, '').trim();
    const subsetMatch = withoutTags.match(/^(.+?)\s*\[Subset\s*[-–]\s*(.+?)\]$/);
    if (subsetMatch) return { baseTitle: subsetMatch[1].trim(), subsetName: subsetMatch[2].trim(), isSubset: true };
    return { baseTitle: withoutTags, subsetName: null, isSubset: false };
};
