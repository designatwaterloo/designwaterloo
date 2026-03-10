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
import type { User, Session } from "@supabase/supabase-js";
import type { Member } from "@/types/database";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  member: Member | null;
  loading: boolean;
  signInWithMicrosoft: () => Promise<void>;
  signInWithLaurierOtp: (email: string) => Promise<{ error: string | null }>;
  verifyLaurierOtp: (email: string, token: string) => Promise<{ error: string | null; user: User | null }>;
  signOut: () => Promise<void>;
  refreshMember: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchMember = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("auth_user_id", userId)
        .maybeSingle(); // Use maybeSingle instead of single to handle no rows

      if (error) {
        console.error("[Auth] Error fetching member:", error);
      }
      setMember(data as Member | null);
    },
    [supabase]
  );

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchMember(session.user.id);
      }

      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchMember(session.user.id);
      } else {
        setMember(null);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth, fetchMember]);

  const signInWithMicrosoft = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        scopes: "email profile openid",
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const signInWithLaurierOtp = async (email: string): Promise<{ error: string | null }> => {
    if (!isLaurierEmail(email)) {
      return { error: "Please use a @mylaurier.ca email address." };
    }
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  };

  const verifyLaurierOtp = async (email: string, token: string): Promise<{ error: string | null; user: User | null }> => {
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error) {
      return { error: error.message, user: null };
    }
    return { error: null, user: data.user };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("[Auth] Client sign-out error:", err);
    }
    setUser(null);
    setSession(null);
    setMember(null);
    // Redirect to server route to clear server-side cookies too
    window.location.href = "/auth/sign-out";
  };

  const refreshMember = async () => {
    if (user) {
      await fetchMember(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        member,
        loading,
        signInWithMicrosoft,
        signInWithLaurierOtp,
        verifyLaurierOtp,
        signOut,
        refreshMember,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
