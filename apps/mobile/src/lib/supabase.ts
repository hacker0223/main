import "react-native-url-polyfill/auto";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// A real client is only created when both env vars are present — accounts
// are opt-in infrastructure layered on top of an app that otherwise works
// fully signed-out, so a missing config shouldn't crash the app at import
// time. authStore checks isSupabaseConfigured before touching this.
export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// Supabase's token auto-refresh timer only runs while this is told the app
// is foregrounded — without this, a session silently stops refreshing
// whenever the app is backgrounded and can expire while the user is away.
if (supabase) {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
