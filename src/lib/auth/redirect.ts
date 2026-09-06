/** Only same-origin application paths, never auth recovery loops. */
export function safeRedirect(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return fallback;
  try {
    const url = new URL(value, 'https://app.invalid');
    if (url.origin !== 'https://app.invalid' || /^\/(auth|sign-in|api)(\/|$)/.test(url.pathname)) return fallback;
    return url.pathname + url.search + url.hash;
  } catch { return fallback; }
}

/** Keep the allowlisted callback fixed; carry only a validated destination in a short-lived cookie. */
export function oauthRedirect(origin: string, destination?: string) {
  const callback = new URL('/auth/callback', origin);
  return {
    redirectTo: callback.toString(),
    cookie: `dw-auth-next=${encodeURIComponent(safeRedirect(destination))}; Path=/; Max-Age=600; SameSite=Lax${callback.protocol === 'https:' ? '; Secure' : ''}`,
  };
}
