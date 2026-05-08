import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { createProfile, getProfile } from '@/lib/supabase/queries/profiles';
import type { Profile, UserRole } from '@/types/database';

function withTimeout<T>(promise: Promise<T>, ms: number, msg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
  ]);
}

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  loadSession: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role: UserRole, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  session: null,
  profile: null,
  isLoading: true,
  error: null,

  loadSession: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const profile = await getProfile(session.user.id);
        set({ session, profile, isLoading: false });
      } else {
        set({ session: null, profile: null, isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        try {
          const profile = await getProfile(session.user.id);
          set({ session, profile });
        } catch {
          set({ session, profile: null });
        }
      } else {
        set({ session: null, profile: null });
      }
    });
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    console.log('[Auth] signIn started');
    try {
      console.log('[Auth] calling signInWithPassword...');
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        15_000,
        'Connection timed out. Check your internet connection and try again.',
      );
      console.log('[Auth] signInWithPassword returned. error:', error?.message ?? 'none', 'session:', !!data.session);
      if (error) throw error;
      console.log('[Auth] fetching profile...');
      const profile = data.session
        ? await withTimeout(
            getProfile(data.session.user.id),
            10_000,
            'Could not load your account details. Please try again.',
          )
        : null;
      console.log('[Auth] profile:', profile?.role ?? 'null');

      if (data.session && !profile) {
        await supabase.auth.signOut();
        throw new Error(
          'No profile found for this account. Please use the Register screen to create your account.',
        );
      }

      set({ session: data.session, profile, isLoading: false });
    } catch (err) {
      console.error('[Auth] signIn error:', err);
      const message = err instanceof Error ? err.message : 'Sign in failed';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  signUp: async (email, password, role, fullName) => {
    set({ isLoading: true, error: null });
    console.log('[Auth] signUp started for', email);
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signUp({ email, password }),
        15_000,
        'Connection timed out. Check your internet connection and try again.',
      );
      console.log('[Auth] signUp returned. error:', error?.message ?? 'none', 'user:', data.user?.id ?? 'null', 'session:', !!data.session);
      if (error) throw error;
      if (!data.user) throw new Error('Sign up failed — no user returned');

      console.log('[Auth] creating profile...');
      const profile = await createProfile(data.user.id, fullName, role);
      console.log('[Auth] profile created:', profile.role);
      set({ session: data.session, profile, isLoading: false });
    } catch (err) {
      console.error('[Auth] signUp error:', err);
      const message = err instanceof Error ? err.message : 'Sign up failed';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },

  clearError: () => set({ error: null }),
}));
