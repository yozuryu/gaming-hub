import { MEDIA_URL } from './constants.js';

export const formatTimeAgo = (dateStr, refDateStr) => {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date(refDateStr);
  const diffMs = now - date;
  const diffHrs = diffMs / (1000 * 60 * 60);
  const diffDays = diffHrs / 24;

  if (diffHrs < 1) {
    const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    return `${mins} min${mins !== 1 ? 's' : ''} ago`;
  } else if (diffHrs < 24) {
    const hrs = Math.floor(diffHrs);
    return `${hrs} hr${hrs !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    const days = Math.floor(diffDays);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
};

export const formatDate = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const getMediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${MEDIA_URL}${path.startsWith('/') ? path : '/' + path}`;
};

export const parseTitle = (title) => {
  if (!title) return { baseTitle: title, subsetName: null, isSubset: false, tags: [] };

  const tags = [];
  const withoutTags = title.replace(/~([^~]+)~\s*/g, (_, tag) => { tags.push(tag); return ''; }).trim();

  const subsetMatch = withoutTags.match(/^(.+?)\s*\[Subset\s*[-–]\s*(.+?)\]$/);
  if (subsetMatch) {
    return { baseTitle: subsetMatch[1].trim(), subsetName: subsetMatch[2].trim(), isSubset: true, tags };
  }

  return { baseTitle: withoutTags, subsetName: null, isSubset: false, tags };
};
