/** Next's dev server may normalize 127.0.0.1 to localhost in request.url. */
export function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get('host');
  if (process.env.NODE_ENV === 'development' && url.protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(url.hostname) &&
      host && /^(localhost|127\.0\.0\.1):\d+$/.test(host) && new URL(`http://${host}`).port === url.port) {
    return `http://${host}`;
  }
  return url.origin;
}
