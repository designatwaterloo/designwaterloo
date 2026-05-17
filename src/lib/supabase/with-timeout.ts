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
// builders via `.abortSignal()`). The race against `timeoutPromise` is the
// belt-and-suspenders — if `fn` ignores the signal (e.g. supabase.auth.getUser,
// which has no signal parameter), the race still rejects on schedule so the
// caller is never left hanging.
export async function withAbortableTimeout<T>(
  fn: (signal: AbortSignal) => PromiseLike<T>,
  ms: number,
  label: string,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new AuthTimeoutError(label, ms));
    }, ms);
  });
  try {
    return await Promise.race([fn(controller.signal), timeoutPromise]);
  } catch (err) {
    if (controller.signal.aborted && !(err instanceof AuthTimeoutError)) {
      // Operation honored the signal and rejected on abort — surface as a
      // timeout so callers can treat both paths uniformly.
      throw new AuthTimeoutError(label, ms);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
