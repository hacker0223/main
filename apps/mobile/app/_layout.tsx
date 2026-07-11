import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppState, useColorScheme } from "react-native";
import { warmUpBackend } from "../src/api/warmup";
import { ServerWarmingBanner } from "../src/components/ServerWarmingBanner";
import { useAlertStore } from "../src/store/alertStore";
import { useOnboardingStore } from "../src/store/onboardingStore";
import { useWatchlistStore } from "../src/store/watchlistStore";

export default function RootLayout() {
  const scheme = useColorScheme();
  const hydrate = useOnboardingStore((s) => s.hydrate);
  const hydrateWatchlist = useWatchlistStore((s) => s.hydrate);
  const hydrateAlerts = useAlertStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
    hydrateWatchlist();
    hydrateAlerts();

    // Wake the sleeping free-tier backend the instant the app opens, so the
    // ~20s cold start happens during onboarding/idle rather than while the
    // user waits on their first stock. Also re-warm when the app returns
    // from the background (it may have slept while away).
    warmUpBackend();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") warmUpBackend();
    });
    return () => sub.remove();
  }, [hydrate, hydrateWatchlist, hydrateAlerts]);

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="search" options={{ presentation: "modal" }} />
        <Stack.Screen name="compare" options={{ presentation: "modal" }} />
      </Stack>
      <ServerWarmingBanner />
    </>
  );
}
