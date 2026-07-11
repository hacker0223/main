import { useServerStatus } from "../store/serverStatusStore";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

// Render's free tier spins both backends down after ~15 min idle. A cold
// summit-api takes ~20s to wake and the Python pattern-engine ~70s. The
// GET/POST paths used to time out at 10s, so a first-time user opening the
// app to a sleeping backend saw "took too long" on everything — the worst
// possible first impression. This fires the moment the app launches (and on
// resume from background) so the wake-up happens DURING onboarding/idle,
// not while the user is staring at a screen waiting for their first stock.
let lastWarmedAt = 0;
const WARM_COOLDOWN_MS = 10 * 60 * 1000; // if we warmed recently, it's still warm
const BANNER_DELAY_MS = 2500; // only show the banner if the server is genuinely slow
const ENGINE_WARM_TIMEOUT_MS = 120_000;

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

  // Wake the pattern-engine through the proxy with a throwaway request
  // (narrate:false → no Anthropic call) so the first Pattern Signal card
  // and Pattern Lab visit hit a warm engine instead of a 70s cold start.
  // Fire-and-forget with its own abort so a long cold start can't leak.
  const controller = new AbortController();
  const engineTimer = setTimeout(() => controller.abort(), ENGINE_WARM_TIMEOUT_MS);
  const dummyCloses = Array.from({ length: 25 }, (_, i) => 100 + i);
  fetch(`${API_URL}/api/pattern-lab/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ closes: dummyCloses, narrate: false }),
    signal: controller.signal,
  })
    .catch(() => {})
    .finally(() => clearTimeout(engineTimer));
}
