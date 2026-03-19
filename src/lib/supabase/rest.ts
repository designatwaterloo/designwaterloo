const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const TIMEOUT_MS = 8000;

export async function rest(
  path: string,
  opts: { method?: string; body?: unknown; token?: string } = {}
): Promise<{ data: Record<string, unknown>[]; error: string | null }> {
  const { method = "GET", body, token } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const headers: Record<string, string> = {
    apikey: ANON_KEY,
    Accept: "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";
  if (method === "POST" || method === "PATCH")
    headers.Prefer = "return=representation";

  try {
    console.log(`[REST] ${method} /rest/v1/${path}`);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const text = await res.text();
      console.error(`[REST] ${method} ${path} → ${res.status}:`, text);
      return { data: [], error: text };
    }

    // DELETE returns 204 No Content — no body to parse
    if (res.status === 204 || res.headers.get("content-length") === "0") {
      console.log(`[REST] ${method} ${path} → ${res.status}, no body`);
      return { data: [], error: null };
    }

    const json = await res.json();
    const data = Array.isArray(json) ? json : [json];
    console.log(`[REST] ${method} ${path} → ${res.status}, ${data.length} row(s)`);
    return { data, error: null };
  } catch (err) {
    clearTimeout(timer);
    const msg =
      err instanceof DOMException && err.name === "AbortError"
        ? "Request timed out — please check your connection and try again."
        : `Network error: ${err}`;
    console.error(`[REST] ${method} ${path} error:`, msg);
    return { data: [], error: msg };
  }
}
