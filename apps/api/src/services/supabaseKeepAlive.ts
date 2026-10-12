import { supabaseAdmin } from "./supabaseAdmin";

// Supabase pauses free-tier projects after about a week of inactivity, and a
// paused project stops resolving in DNS entirely — every auth request from
// the app then fails with "Network request failed".
//
// This isn't hypothetical: it happened during App Review. The project went
// quiet while we waited, Supabase paused it, and the reviewer hit a sign-in
// error that got the app rejected under Guideline 2.1(a) for a bug that
// didn't exist in the binary.
//
// This runs on the API, which is on a Render plan that never spins down, so
// it keeps ticking regardless of app traffic. It is a mitigation, not a
// guarantee — Supabase owns the pause policy and could change what counts as
// activity. A paid Supabase plan is the only thing that removes the risk
// outright.
const PING_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h — threshold is ~7 days, so this is deliberate margin

async function ping(): Promise<void> {
  if (!supabaseAdmin) return;
  try {
    // head: true asks for the count only, so no rows cross the wire. The
    // point is that a real database request happened, not the result.
    const { error } = await supabaseAdmin
      .from("simulator_runs")
      .select("id", { count: "exact", head: true });

    if (error) {
      console.error(`[keepalive] supabase ping failed: ${error.message}`);
      return;
    }
    console.log(`[keepalive] supabase ping ok at ${new Date().toISOString()}`);
  } catch (err) {
    // Never let this take the server down — it's a background nicety, and a
    // transient network blip here matters far less than the API staying up.
    console.error(`[keepalive] supabase ping threw: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function startSupabaseKeepAlive(): void {
  if (!supabaseAdmin) {
    console.log("[keepalive] supabase not configured — keep-alive disabled");
    return;
  }

  // Ping once shortly after boot so the logs show immediately whether this
  // works, rather than leaving it unverifiable for six hours.
  setTimeout(ping, 10_000);

  // unref so a pending timer can't hold the process open during shutdown.
  setInterval(ping, PING_INTERVAL_MS).unref();

  console.log(`[keepalive] supabase keep-alive started (every ${PING_INTERVAL_MS / 3_600_000}h)`);
}
