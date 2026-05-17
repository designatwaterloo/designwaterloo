// Thrown by withTimeout / withAbortableTimeout when the deadline elapses.
// Callers can `instanceof AuthTimeoutError` to distinguish from other errors.
export class AuthTimeoutError extends Error {
  readonly kind = "timeout" as const;
  constructor(
    readonly label: string,
    readonly ms: number,
  ) {
    super(`[${label}] timed out after ${ms}ms`);
    this.name = "AuthTimeoutError";
  }
}

// Race a thenable against a timer. Use when the operation has no native
// abort signal (e.g. a Supabase SDK call that doesn't accept one). The
// underlying work continues; we just stop waiting for it. Accepts
// PromiseLike so Supabase query builders work without wrapping.
export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new AuthTimeoutError(label, ms)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

// Run `fn(signal)` with an AbortController that fires on timeout. The signal
// can be threaded into anything that honors it (fetch, Supabase v2 query
// builders via `.abortSignal()`). Use this whenever possible — it actually
// cancels the in-flight work instead of just abandoning the promise.
export async function withAbortableTimeout<T>(
  fn: (signal: AbortSignal) => PromiseLike<T>,
  ms: number,
  label: string,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } catch (err) {
    if (controller.signal.aborted) {
      throw new AuthTimeoutError(label, ms);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
