import { normalizeLinkedIn } from './linkedin';

export type SocialPlatform = 'linkedin' | 'instagram' | 'github' | 'twitter';

/** Normalize profile handles and reject URLs pointing outside the named platform. */
export function normalizeSocialUrl(platform: SocialPlatform, raw: string): string | null {
  if (platform === 'linkedin') return normalizeLinkedIn(raw);
  const value = raw.trim();
  if (!value) return '';
  const domains = platform === 'twitter' ? ['x.com', 'twitter.com'] : [`${platform}.com`];
  let handle = value.replace(/^@/, '');
  if (/[:/]/.test(value) || domains.some(domain => value.toLowerCase().includes(domain))) {
    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || !domains.includes(url.hostname.replace(/^www\./, ''))) return null;
      const match = url.pathname.match(/^\/([^/]+)\/?$/);
      if (!match) return null;
      handle = decodeURIComponent(match[1]);
    } catch { return null; }
  }
  const pattern = platform === 'instagram' ? /^[a-z\d_][a-z\d_.]{0,29}$/i : platform === 'twitter' ? /^[a-z\d_]{1,15}$/i : /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i;
  if (!pattern.test(handle)) return null;
  return `https://${domains[0]}/${handle}`;
}
