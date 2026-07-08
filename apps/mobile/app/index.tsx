import { Redirect } from "expo-router";
import { ActivityIndicator } from "react-native";
import { Screen } from "../src/components/Screen";
import { useOnboardingStore } from "../src/store/onboardingStore";
import { useTheme } from "../src/theme/useTheme";

export default function Index() {
  const { colors } = useTheme();
  const isHydrated = useOnboardingStore((s) => s.isHydrated);
  const isComplete = useOnboardingStore((s) => s.isComplete);

  if (!isHydrated) {
    return (
      <Screen style={{ alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  return <Redirect href={isComplete ? "/(tabs)" : "/(onboarding)/welcome"} />;
}
