import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';
import { fetchWithCeiling } from './fetch-with-ceiling';

/** Route handlers own their response cookies, independent of React's cookie context. */
export function createRouteClient(request: NextRequest) {
  const jar = new Map(request.cookies.getAll().map(cookie => [cookie.name, cookie.value]));
  const pending = new Map<string, { name: string; value: string; options: CookieOptions }>();
  const listeners = new Set<() => void>();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
  const client = createServerClient<Database>(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: cookies => {
        for (const cookie of cookies) {
          pending.set(cookie.name, cookie);
          if (cookie.value) jar.set(cookie.name, cookie.value); else jar.delete(cookie.name);
        }
        listeners.forEach(listener => listener());
      },
    },
    global: { fetch: fetchWithCeiling },
  });
  function hasPersisted(accessToken: string) {
    // Read only the values actually handed to setAll, not the SDK's in-memory session.
    const chunks = [...pending.values()].filter(cookie => cookie.value &&
      (cookie.name === key || cookie.name.startsWith(`${key}.`)))
      .sort((a, b) => Number(a.name.slice(key.length + 1)) - Number(b.name.slice(key.length + 1)));
    const value = chunks.map(cookie => cookie.value).join('');
    if (!value.startsWith('base64-')) return false;
    try { return JSON.parse(Buffer.from(value.slice(7), 'base64url').toString()).access_token === accessToken; }
    catch { return false; }
  }
  function waitForSessionCookies(accessToken: string) {
    if (hasPersisted(accessToken)) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const check = () => { if (hasPersisted(accessToken)) { clearTimeout(timer); listeners.delete(check); resolve(); } };
      const timer = setTimeout(() => {
        listeners.delete(check);
        reject(new Error('Session cookie persistence did not complete'));
      }, 5000);
      listeners.add(check);
      check();
    });
  }
  function applyCookies(response: NextResponse) {
    for (const cookie of pending.values()) response.cookies.set(cookie.name, cookie.value, cookie.options);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
  return { client, waitForSessionCookies, applyCookies };
}
