// Hard ceiling for any fetch the Supabase SDK makes. Wraps the incoming init
// so any signal the SDK provides is preserved — the request aborts whichever
// fires first. Without this, an unwrapped SDK call (auth handshake, realtime
// connect, etc.) can hang indefinitely on flaky networks.
const FETCH_CEILING_MS = 15000;

// AbortSignal.any was added in Node 20.3 / modern browsers. Fall back to a
// manual relay so the global fetch ceiling works on Node 18+.
function anySignal(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any(signals);
  }
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort(s.reason);
      return controller.signal;
    }
    s.addEventListener("abort", () => controller.abort(s.reason), {
      once: true,
    });
  }
  return controller.signal;
}

export const fetchWithCeiling: typeof fetch = (input, init) => {
  const ceilingSignal = AbortSignal.timeout(FETCH_CEILING_MS);
  const signal = init?.signal
    ? anySignal([init.signal, ceilingSignal])
    : ceilingSignal;
  return fetch(input, { ...init, signal });
};
