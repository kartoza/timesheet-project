function toDisplayName(value: string): string {
  return value
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function formatManagerName(name: string): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return '';

  const lower = trimmed.toLowerCase();
  const emailMatch = lower.match(/^([^@\s]+)@([^@\s]+)$/);

  if (emailMatch) {
    const localPart = emailMatch[1];
    const domain = emailMatch[2];

    if (domain.startsWith('kartoza')) {
      return toDisplayName(localPart);
    }

    return `${localPart}@${domain}`;
  }

  return toDisplayName(trimmed);
}

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
