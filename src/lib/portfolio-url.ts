/** Normalize public web links without changing meaningful paths, queries or anchors. */
export function normalizePortfolioUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "";
  if (/\s/.test(value)) return null;
  const withProtocol = value.startsWith("//") ? `https:${value}` : /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withProtocol);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || !url.hostname.includes(".")) return null;
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(key) || ["fbclid", "gclid", "dclid", "msclkid"].includes(key.toLowerCase())) url.searchParams.delete(key);
    }
    return url.toString();
  } catch { return null; }
}
