import { useServerStatus } from "../store/serverStatusStore";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";
// The pattern-engine's OWN public URL, hit directly from the device. This
// is deliberately NOT proxied through summit-api: Render does not wake a
// sleeping free service from an internal service-to-service call (proven
// the hard way — 150s of summit-api retries never woke a cold engine, but
// a single external request woke it in ~50s). Only an EXTERNAL request to
// the engine's public URL triggers the spin-up, and the phone is external.
const ENGINE_URL = process.env.EXPO_PUBLIC_PATTERN_ENGINE_URL ?? "";

// Render's free tier spins both backends down after ~15 min idle. A cold
// summit-api takes ~20s to wake and the Python pattern-engine ~50-150s.
// This fires the moment the app launches (and on resume from background) so
// the wake-up happens DURING onboarding/idle, not while the user is staring
// at a screen waiting for their first stock or Pattern Lab result.
let lastWarmedAt = 0;
const WARM_COOLDOWN_MS = 10 * 60 * 1000; // if we warmed recently, it's still warm
const BANNER_DELAY_MS = 2500; // only show the banner if the server is genuinely slow
const ENGINE_WARM_TIMEOUT_MS = 150_000; // a cold Python engine can take this long to answer /health

export function warmUpBackend() {
  if (!API_URL) return;
  const now = Date.now();
  if (now - lastWarmedAt < WARM_COOLDOWN_MS) return;
  lastWarmedAt = now;

  const { setWarming } = useServerStatus.getState();

  // Wake the Node API. Drives the banner: a warm server answers in well
  // under a second, so the 2.5s-delayed banner never flashes for it.
  const bannerTimer = setTimeout(() => setWarming(true), BANNER_DELAY_MS);
  fetch(`${API_URL}/health`)
    .catch(() => {})
    .finally(() => {
      clearTimeout(bannerTimer);
      setWarming(false);
    });

  // Wake the pattern-engine directly (external request = the only thing that
  // triggers its spin-up). Fire-and-forget; by the time the user reaches
  // Pattern Lab or a stock's Pattern Signal card, the engine has had the
  // whole onboarding/browse window to finish booting. The abort just keeps
  // a very long cold start from leaking the request forever.
  if (ENGINE_URL) {
    const controller = new AbortController();
    const engineTimer = setTimeout(() => controller.abort(), ENGINE_WARM_TIMEOUT_MS);
    fetch(`${ENGINE_URL}/health`, { signal: controller.signal })
      .catch(() => {})
      .finally(() => clearTimeout(engineTimer));
  }
}
