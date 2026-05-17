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
import type { User, Session } from "@supabase/supabase-js";
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
    async (userId: string) => {
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
        if (error) {
          console.error("[Auth] Error fetching member:", error);
          setMember(null);
          return;
        }
        setMember(data as Member | null);
      } catch (err) {
        if (err instanceof AuthTimeoutError) {
          console.warn("[Auth] fetchMember timed out");
        } else {
          console.error("[Auth] fetchMember failed:", err);
        }
        setMember(null);
      }
    },
    [supabase]
  );

  useEffect(() => {
    let mounted = true;

    // Last-resort safety: if no code path clears loading within 10s, force
    // it to false AND clear user/session/member so the page's `!user`
    // redirect activates. Watchdog should never be the primary mechanism;
    // it exists for truly unexpected hangs.
    const watchdog = setTimeout(() => {
      if (!mounted) return;
      console.warn("[Auth] Watchdog fired — clearing auth state");
      setUser(null);
      setSession(null);
      setMember(null);
      setLoading(false);
    }, WATCHDOG_MS);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, sessionFromEvent) => {
      if (!mounted) return;

      // No session: clear and exit.
      if (!sessionFromEvent) {
        setUser(null);
        setSession(null);
        setMember(null);
        setLoading(false);
        clearTimeout(watchdog);
        return;
      }

      // Validate against the auth server for both initial load (localStorage
      // could be stale) and token refreshes (SDK can fire spuriously if the
      // refresh actually failed). Past validation, trust the session.
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        let validatedUser: User | null = null;
        try {
          const { data } = await withAbortableTimeout(
            () => supabase.auth.getUser(),
            GET_USER_MS,
            "getUser",
          );
          validatedUser = data.user;
        } catch (err) {
          if (!mounted) return;
          if (err instanceof DOMException && err.name === "AbortError") {
            // React Strict Mode double-mount aborted the request.
            // This instance is stale — bail out completely and let the
            // re-mounted instance handle auth.
            setLoading(false);
            return;
          }
          // Network failure / timeout / explicit auth error.  We must NOT
          // trust the local session here — doing so leads to the
          // "Loading forever" bug where the page renders with user set but
          // RLS rejects all queries.
          console.warn("[Auth] getUser validation failed; clearing session", err);
          setUser(null);
          setSession(null);
          setMember(null);
          setLoading(false);
          clearTimeout(watchdog);
          return;
        }

        if (!mounted) return;

        if (!validatedUser) {
          setUser(null);
          setSession(null);
          setMember(null);
          setLoading(false);
          clearTimeout(watchdog);
          return;
        }
      }

      try {
        setSession(sessionFromEvent);
        setUser(sessionFromEvent.user);
        await fetchMember(sessionFromEvent.user.id);
      } finally {
        if (mounted) {
          setLoading(false);
          clearTimeout(watchdog);
        }
      }
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
