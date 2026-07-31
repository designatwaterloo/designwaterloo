"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { isLaurierEmail } from "@/lib/supabase/auth-utils";
import {
  withAbortableTimeout,
  AuthTimeoutError,
} from "@/lib/supabase/with-timeout";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import type { Member } from "@/types/database";

const GET_USER_MS = 8000;
const FETCH_MEMBER_MS = 5000;
const WATCHDOG_MS = 10000;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  member: Member | null;
  loading: boolean;
  signInWithMicrosoft: (redirectTo?: string) => Promise<void>;
  signInWithLaurierOtp: (email: string) => Promise<{ error: string | null }>;
  verifyLaurierOtp: (email: string, token: string) => Promise<{ error: string | null; user: User | null }>;
  signOut: () => void;
  refreshMember: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Sweep any leftover sb-*-auth-token* cookies the Supabase SDK may not have
// cleared on signOut (e.g. cookies with a Domain attribute). Safe to call
// from the browser only; no-op on the server.
function sweepAuthCookies() {
  if (typeof document === "undefined") return;
  document.cookie.split(";").forEach((c) => {
    const name = c.split("=")[0]?.trim();
    if (name && /^sb-.*-auth-token/.test(name)) {
      document.cookie = `${name}=; Max-Age=0; path=/`;
    }
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchMember = useCallback(
    async (userId: string, shouldApply: () => boolean = () => true) => {
      // Two attempts: a transient timeout on the first try shouldn't blank out
      // `member` (that hides the whole edit UI). Only a clean no-row response
      // ever sets member to null; query errors and timeouts keep the last
      // known member so a slow network can't masquerade as "not the owner".
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const { data, error } = await withAbortableTimeout(
            (signal) =>
              supabase
                .from("members")
                .select("*")
                .eq("auth_user_id", userId)
                .abortSignal(signal)
                .maybeSingle(),
            FETCH_MEMBER_MS,
            "fetchMember",
          );
          if (!shouldApply()) return;
          if (error) {
            console.error("[Auth] Error fetching member (keeping previous):", error);
            return;
          }
          setMember(data as Member | null);
          return;
        } catch (err) {
          if (!shouldApply()) return;
          if (err instanceof AuthTimeoutError) {
            console.warn(`[Auth] fetchMember timed out (attempt ${attempt})`);
          } else {
            console.error("[Auth] fetchMember failed:", err);
          }
        }
      }
      console.warn("[Auth] fetchMember gave up; keeping previous member state");
    },
    [supabase]
  );

  useEffect(() => {
    let mounted = true;

    // Last-resort safety: if no code path clears loading within the watchdog
    // window, just unblock the UI. It must NEVER destroy the session — a slow
    // network (getUser up to 8s + fetchMember up to 5s can exceed this window)
    // must not look like a sign-out. If we genuinely never authenticated,
    // `user` is still null and protected pages redirect to sign-in anyway.
    const watchdog = setTimeout(() => {
      if (!mounted) return;
      console.warn("[Auth] Watchdog fired — unblocking UI (session preserved)");
      setLoading(false);
    }, WATCHDOG_MS);

    // Monotonic id per auth event. A newer event supersedes any still-running
    // handler, so a slow handler for an old event can never clobber state set
    // by a newer one.
    let eventSeq = 0;

    // The real work for an auth event. MUST run outside the SDK's
    // onAuthStateChange dispatch: supabase-js holds its auth lock
    // (navigator.locks) while notifying subscribers, and every Supabase call
    // in here — getUser() and the PostgREST query in fetchMember (which reads
    // the access token via getSession) — needs that same lock. Awaiting them
    // inside the callback deadlocks until our timeouts fire, which is what
    // used to blank out `member` (and with it the entire edit UI) whenever a
    // token refresh coincided with a page load.
    const handleAuthEvent = async (
      event: AuthChangeEvent,
      sessionFromEvent: Session,
      seq: number,
    ) => {
      const stale = () => !mounted || seq !== eventSeq;

      // Validate against the auth server for both initial load (localStorage
      // could be stale) and token refreshes (SDK can fire spuriously if the
      // refresh actually failed). Past validation, trust the session.
      //
      // Policy (mirrors the middleware): ONLY a *definite* auth rejection
      // (401/403, or a successful call that returns no user) means the session
      // is dead. Transient failures — timeouts, network blips, 5xx — must NOT
      // sign the user out; we trust the session we just received and move on.
      // A genuinely invalid token surfaces as a definite 401 here, or gets
      // cleared by the middleware's definite-rejection path on the next
      // navigation, so a real sign-out still resolves quickly.
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        try {
          const { data, error } = await withAbortableTimeout(
            () => supabase.auth.getUser(),
            GET_USER_MS,
            "getUser",
          );
          if (stale()) return;
          if (error) {
            if (error.status === 401 || error.status === 403) {
              console.warn("[Auth] getUser definitively rejected session; clearing", error);
              setUser(null);
              setSession(null);
              setMember(null);
              setLoading(false);
              clearTimeout(watchdog);
              return;
            }
            // Transient (5xx / network). Don't sign out — trust the session.
            console.warn("[Auth] getUser transient failure; trusting current session", error);
          } else if (!data.user) {
            // Clean response with no user → genuinely signed out.
            setUser(null);
            setSession(null);
            setMember(null);
            setLoading(false);
            clearTimeout(watchdog);
            return;
          }
        } catch (err) {
          if (stale()) return;
          if (err instanceof DOMException && err.name === "AbortError") {
            // React Strict Mode double-mount aborted the request.
            // This instance is stale — bail out completely and let the
            // re-mounted instance handle auth.
            setLoading(false);
            return;
          }
          // Timeout / network failure — transient. Do NOT clear the session;
          // trust the session from this event. (This is the fix for random
          // sign-outs on a slow network or token-refresh blip.)
          console.warn("[Auth] getUser validation failed transiently; trusting session", err);
        }
      }

      try {
        setSession(sessionFromEvent);
        setUser(sessionFromEvent.user);
        await fetchMember(sessionFromEvent.user.id, () => !stale());
      } finally {
        if (mounted) {
          setLoading(false);
          clearTimeout(watchdog);
        }
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, sessionFromEvent) => {
      if (!mounted) return;

      // Instrumentation: every session clear below logs its trigger so a
      // future "randomly signed out" report names the exact event/branch
      // instead of being silent.
      console.info(
        `[Auth] event=${event} session=${sessionFromEvent ? "yes" : "no"}`,
      );

      const seq = ++eventSeq;

      // No session: clear and exit. This fires on a real sign-out
      // (SIGNED_OUT / USER_DELETED). Pure state updates are safe inside the
      // callback — only Supabase calls must be deferred.
      if (!sessionFromEvent) {
        console.warn(`[Auth] clearing session — no-session event: ${event}`);
        setUser(null);
        setSession(null);
        setMember(null);
        setLoading(false);
        clearTimeout(watchdog);
        return;
      }

      // Defer to a macrotask so the SDK finishes dispatch and releases its
      // auth lock before we make any Supabase calls (see handleAuthEvent).
      setTimeout(() => {
        if (!mounted || seq !== eventSeq) return;
        void handleAuthEvent(event, sessionFromEvent, seq);
      }, 0);
    });

    return () => {
      mounted = false;
      clearTimeout(watchdog);
      subscription.unsubscribe();
    };
  }, [supabase.auth, fetchMember]);

  const signInWithMicrosoft = useCallback(
    async (redirectTo?: string) => {
      const callbackUrl = new URL(`${window.location.origin}/auth/callback`);
      if (redirectTo) callbackUrl.searchParams.set("next", redirectTo);

      await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          scopes: "email profile openid",
          redirectTo: callbackUrl.toString(),
          queryParams: {
            // Bias toward the user's UWaterloo account if multiple Microsoft
            // accounts are signed in. No `prompt` param means Microsoft will
            // silently reuse the active session if there is one — matches
            // Crowdmark / learn.uwaterloo.ca behavior. Users who need to
            // switch accounts can sign out first.
            domain_hint: "uwaterloo.ca",
          },
        },
      });
    },
    [supabase.auth],
  );

  const signInWithLaurierOtp = useCallback(
    async (email: string): Promise<{ error: string | null }> => {
      if (!isLaurierEmail(email)) {
        return { error: "Please use a @mylaurier.ca email address." };
      }
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) {
        return { error: error.message };
      }
      return { error: null };
    },
    [supabase.auth],
  );

  const verifyLaurierOtp = useCallback(
    async (
      email: string,
      token: string,
    ): Promise<{ error: string | null; user: User | null }> => {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (error) {
        return { error: error.message, user: null };
      }
      return { error: null, user: data.user };
    },
    [supabase.auth],
  );

  // Sync, instant sign-out. Clears React state + browser cookies immediately,
  // fires the server-side sign-out as a keepalive POST (continues even after
  // navigation), then hard-navigates. No await, no curtain, no Loading flash.
  // Caller doesn't pass a destination — sign-out always goes to "/".
  const signOut = useCallback(() => {
    setUser(null);
    setSession(null);
    setMember(null);
    sweepAuthCookies();
    try {
      fetch("/auth/sign-out", {
        method: "POST",
        keepalive: true,
        credentials: "include",
      }).catch(() => {
        // Network failure during sign-out is fine — cookies are already gone
        // client-side; the server-side session will expire naturally.
      });
    } catch {
      // ignore — navigation continues regardless
    }
    if (typeof window !== "undefined") {
      window.location.replace("/");
    }
  }, []);

  const refreshMember = useCallback(async () => {
    if (user) {
      await fetchMember(user.id);
    }
  }, [user, fetchMember]);

  const value = useMemo(
    () => ({
      user,
      session,
      member,
      loading,
      signInWithMicrosoft,
      signInWithLaurierOtp,
      verifyLaurierOtp,
      signOut,
      refreshMember,
    }),
    [
      user,
      session,
      member,
      loading,
      signOut,
      refreshMember,
      signInWithMicrosoft,
      signInWithLaurierOtp,
      verifyLaurierOtp,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
