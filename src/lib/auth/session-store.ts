import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { Database, Member } from '@/types/database';

export interface AuthState {
  session: Session | null;
  member: Member | null;
  status: 'initializing' | 'authenticated' | 'anonymous' | 'error';
  memberStatus: 'idle' | 'loading' | 'ready' | 'missing' | 'error';
  error: string | null;
}
export const initialAuthState: AuthState = {
  session: null, member: null, status: 'initializing', memberStatus: 'idle', error: null,
};

/** The auth event callback only publishes state. SDK work runs after its lock is released. */
export class SessionStore {
  private state = initialAuthState;
  private listeners = new Set<() => void>();
  private active = false;
  private generation = 0;
  private request = 0;
  private controller?: AbortController;
  private timer?: ReturnType<typeof setTimeout>;
  private watchdog?: ReturnType<typeof setTimeout>;
  private subscription?: { unsubscribe(): void };

  constructor(private client: SupabaseClient<Database>) {}
  getSnapshot = () => this.state;
  getServerSnapshot = () => initialAuthState;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private publish(patch: Partial<AuthState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener());
  }
  start = () => {
    this.active = true;
    if (this.state.memberStatus === 'loading') this.publish({ memberStatus: 'idle' });
    this.watchdog = setTimeout(() => {
      if (this.active && this.state.status === 'initializing') {
        this.publish({ status: 'error', error: 'We could not load your session. Check your connection and retry.' });
      }
    }, 15000);
    this.subscription = this.client.auth.onAuthStateChange((_event, session) => {
      this.accept(session);
    }).data.subscription;
    return this.stop;
  };
  stop = () => {
    this.active = false;
    this.generation++;
    this.request++;
    this.controller?.abort();
    clearTimeout(this.timer);
    clearTimeout(this.watchdog);
    this.subscription?.unsubscribe();
  };
  private accept(session: Session | null) {
    if (!this.active) return;
    clearTimeout(this.watchdog);
    const changed = this.state.session?.user.id !== session?.user.id;
    if (changed || !session) {
      this.generation++;
      this.request++;
      this.controller?.abort();
      clearTimeout(this.timer);
      this.publish({ session, member: null, status: session ? 'authenticated' : 'anonymous', memberStatus: session ? 'loading' : 'idle', error: null });
    } else {
      this.publish({ session, status: 'authenticated' });
    }
    if (session && (changed || ['idle', 'error'].includes(this.state.memberStatus))) {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => { void this.refreshMember(); }, 0);
    }
  }
  refreshMember = async () => {
    const userId = this.state.session?.user.id;
    if (!this.active || !userId) return;
    const generation = this.generation;
    const request = ++this.request;
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.publish({ memberStatus: 'loading', error: null });
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const { data, error } = await this.client.from('members').select('*')
        .eq('auth_user_id', userId).abortSignal(controller.signal).maybeSingle();
      if (error) throw error;
      if (!this.active || generation !== this.generation || request !== this.request) return;
      this.publish({ member: data as Member | null, memberStatus: data ? 'ready' : 'missing', error: null });
    } catch {
      if (!this.active || generation !== this.generation || request !== this.request) return;
      // Retain the last known profile only for the same user. Never infer absence from failure.
      this.publish({ memberStatus: 'error', error: 'Your profile could not be loaded. Your session is still available; please retry.' });
    } finally {
      clearTimeout(timeout);
    }
  };
  retry = async () => {
    if (this.state.session) return this.refreshMember();
    const generation = this.generation;
    try {
      const { data, error } = await this.client.auth.getSession();
      if (!this.active || generation !== this.generation) return;
      if (error) throw error;
      this.accept(data.session);
    } catch {
      if (this.active && generation === this.generation) {
        this.publish({ status: 'error', error: 'We could not load your session. Check your connection and retry.' });
      }
    }
  };
}
