import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
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
  }, [hydrate, hydrateWatchlist, hydrateAlerts]);

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="search" options={{ presentation: "modal" }} />
        <Stack.Screen name="compare" options={{ presentation: "modal" }} />
      </Stack>
    </>
  );
}
