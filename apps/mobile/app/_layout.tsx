import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { useOnboardingStore } from "../src/store/onboardingStore";

export default function RootLayout() {
  const scheme = useColorScheme();
  const hydrate = useOnboardingStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

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
