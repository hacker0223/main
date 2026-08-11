import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

// Accounts exist for one reason right now: a stable identity to attach a
// future subscription to. Nothing else in the app reads from this store —
// watchlist, alerts, and disclosures all stay local-only (AsyncStorage),
// unaffected by whether someone is signed in.
interface AuthState {
  isHydrated: boolean;
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signInWithApple: (identityToken: string, nonce: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isHydrated: false,
  session: null,
  user: null,
  loading: false,
  error: null,

  hydrate: async () => {
    if (!isSupabaseConfigured || !supabase) {
      set({ isHydrated: true });
      return;
    }
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, user: data.session?.user ?? null, isHydrated: true });

    // Keeps this store (and anything reading from it) in sync with sign-in,
    // sign-out, and token refresh events that happen outside a direct call
    // to signUp/signIn/signOut below — e.g. a refreshed or expired token.
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
    });
  },

  signUp: async (email, password) => {
    if (!isSupabaseConfigured || !supabase) {
      set({ error: "Accounts aren't set up yet." });
      return false;
    }
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      set({ loading: false, error: error.message });
      return false;
    }
    set({ loading: false, session: data.session, user: data.user });
    return true;
  },

  signIn: async (email, password) => {
    if (!isSupabaseConfigured || !supabase) {
      set({ error: "Accounts aren't set up yet." });
      return false;
    }
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ loading: false, error: error.message });
      return false;
    }
    set({ loading: false, session: data.session, user: data.user });
    return true;
  },

  signInWithApple: async (identityToken, nonce) => {
    if (!isSupabaseConfigured || !supabase) {
      set({ error: "Accounts aren't set up yet." });
      return false;
    }
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: identityToken,
      nonce,
    });
    if (error) {
      set({ loading: false, error: error.message });
      return false;
    }
    set({ loading: false, session: data.session, user: data.user });
    return true;
  },

  signOut: async () => {
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },

  clearError: () => set({ error: null }),
}));
