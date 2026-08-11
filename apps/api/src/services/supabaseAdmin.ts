import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const isSupabaseAdminConfigured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

// The service-role key bypasses Row Level Security entirely — this client
// must never be imported by anything that could echo it back to a client,
// and every write path using it must independently verify who the caller
// is first (see requireAuth in middleware/auth.ts). It's how the simulator
// stays leaderboard-trustworthy: only this server-side client can write
// simulator_* rows, and it only does so after validating the caller's own
// Supabase-issued session token.
export const supabaseAdmin = isSupabaseAdminConfigured
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;
