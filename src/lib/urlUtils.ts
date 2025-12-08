/**
 * Ensures a URL has a proper protocol prefix.
 * If no protocol is present, prepends https://
 */
export function ensureHttps(url: string | undefined): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    return `https://${url}`;
}
