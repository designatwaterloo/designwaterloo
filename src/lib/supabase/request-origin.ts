// Resolve the public-facing origin of an incoming request.
//
// In a Next.js Route Handler running on Vercel (or behind any reverse proxy),
// `new URL(request.url).origin` can report an *internal* origin, and apex↔www
// drift means the host the browser actually used may differ from what
// `request.url` sees. This matters for auth: @supabase/ssr writes the session
// cookies host-only for the request host, so a post-login redirect MUST stay on
// that exact host — otherwise the just-set session cookie isn't sent on the next
// request and the user appears signed out (the classic "Supabase won't persist"
// symptom, usually surfacing as a redirect loop back to /sign-in).
//
// We honor the proxy's forwarded headers (set by Vercel's edge, not the client)
// and fall back to the Host header, then to the parsed request URL.
export function getRequestOrigin(request: Request): string {
  const url = new URL(request.url);

  // `x-forwarded-host` may carry a comma-separated list when chained through
  // multiple proxies; the first entry is the original client-facing host.
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();

  const host = forwardedHost || request.headers.get("host") || url.host;
  const proto = forwardedProto || url.protocol.replace(":", "");

  return `${proto}://${host}`;
}
