"use client";

import { createContext, useContext, useEffect, useMemo, useCallback, useSyncExternalStore, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isLaurierEmail } from '@/lib/supabase/auth-utils';
import { SessionStore } from '@/lib/auth/session-store';
import { safeRedirect } from '@/lib/auth/redirect';
import type { Session, User } from '@supabase/supabase-js';
import type { Member } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  member: Member | null;
  loading: boolean;
  error: string | null;
  retry: () => Promise<void>;
  signInWithMicrosoft: (redirectTo?: string) => Promise<void>;
  signInWithLaurierOtp: (email: string) => Promise<{ error: string | null }>;
  verifyLaurierOtp: (email: string, token: string) => Promise<{ error: string | null; user: User | null }>;
  signOut: () => Promise<void>;
  refreshMember: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [actionError, setActionError] = useState<string | null>(null);
  const client = useMemo(() => createClient(), []);
  const store = useMemo(() => new SessionStore(client), [client]);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  useEffect(() => store.start(), [store]);
  useEffect(() => {
    const recover = () => {
      if (document.visibilityState === 'visible' && store.getSnapshot().error) void store.retry();
    };
    window.addEventListener('online', recover);
    document.addEventListener('visibilitychange', recover);
    return () => {
      window.removeEventListener('online', recover);
      document.removeEventListener('visibilitychange', recover);
    };
  }, [store]);

  const signInWithMicrosoft = useCallback(async (redirectTo?: string) => {
    const callback = new URL('/auth/callback', window.location.origin);
    callback.searchParams.set('next', safeRedirect(redirectTo, '/dashboard'));
    const { error } = await client.auth.signInWithOAuth({ provider: 'azure', options: {
      scopes: 'email profile openid', redirectTo: callback.toString(), queryParams: { domain_hint: 'uwaterloo.ca' },
    }});
    if (error) throw error;
  }, [client]);
  const signInWithLaurierOtp = useCallback(async (email: string) => {
    email = email.trim().toLowerCase();
    if (!isLaurierEmail(email)) return { error: 'Please use a @mylaurier.ca email address.' };
    try {
      const { error } = await client.auth.signInWithOtp({ email });
      return { error: error?.message ?? null };
    } catch { return { error: 'Could not send your code. Check your connection and retry.' }; }
  }, [client]);
  const verifyLaurierOtp = useCallback(async (email: string, token: string) => {
    try {
      const { data, error } = await client.auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: 'email' });
      return { error: error?.message ?? null, user: data.user };
    } catch { return { error: 'Could not verify your code. Check your connection and retry.', user: null }; }
  }, [client]);
  const signOut = useCallback(async () => {
    // Let the SDK clear storage and broadcast SIGNED_OUT to other tabs before navigating.
    setActionError(null);
    try {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw error;
      window.location.replace('/');
    } catch { setActionError('Could not sign out. Check your connection and try signing out again.'); }
  }, [client]);
  const loading = state.status === 'initializing' || state.status === 'error' ||
    (!!state.session && !state.member && ['loading', 'error', 'idle'].includes(state.memberStatus));
  const value = useMemo(() => ({ user: state.session?.user ?? null, session: state.session,
    member: state.member, loading, error: actionError ?? state.error, retry: store.retry,
    signInWithMicrosoft, signInWithLaurierOtp, verifyLaurierOtp, signOut, refreshMember: store.refreshMember,
  }), [state, actionError, loading, store, signInWithMicrosoft, signInWithLaurierOtp, verifyLaurierOtp, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
