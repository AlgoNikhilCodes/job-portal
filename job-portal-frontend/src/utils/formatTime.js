// Lightweight relative-time formatter ("2 minutes ago", "3 hours ago", "5 days ago")
// used across notifications so we don't need a full date-fns dependency for
// this one thing. Falls back to a short date once it's more than a week old.
export const formatRelativeTime = (dateInput) => {
  const date = new Date(dateInput);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (Number.isNaN(seconds)) return '';
  if (seconds < 60) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default formatRelativeTime;
