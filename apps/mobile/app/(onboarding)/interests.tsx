import { router } from "expo-router";
import type { InterestTag } from "@summit/shared";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../src/components/Button";
import { OptionCard } from "../../src/components/OptionCard";
import { Screen } from "../../src/components/Screen";
import { typography } from "../../src/theme/typography";
import { useOnboardingStore } from "../../src/store/onboardingStore";
import { useTheme } from "../../src/theme/useTheme";

const options: { value: InterestTag; title: string }[] = [
  { value: "tech", title: "Tech" },
  { value: "healthcare", title: "Healthcare" },
  { value: "dividends", title: "Dividends" },
  { value: "growth", title: "Growth" },
  { value: "crypto_adjacent", title: "Crypto-adjacent" },
  { value: "etfs", title: "ETFs" },
];

export default function InterestsScreen() {
  const { colors } = useTheme();
  const interests = useOnboardingStore((s) => s.answers.interests);
  const toggleInterest = useOnboardingStore((s) => s.toggleInterest);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[typography.pageTitle, styles.title, { color: colors.text }]}>
          What are you interested in?
        </Text>
        <Text style={[typography.body, { color: colors.textMuted }]}>
          Pick as many as you like — we'll use these to suggest stocks for your watchlist.
        </Text>
      </View>

      <View style={styles.options}>
        {options.map((opt) => (
          <OptionCard
            key={opt.value}
            title={opt.title}
            selected={interests.includes(opt.value)}
            onPress={() => toggleInterest(opt.value)}
          />
        ))}
      </View>

      <Button label="Continue" onPress={() => router.push("/(onboarding)/risk-quiz")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: 24, marginBottom: 24 },
  title: { marginBottom: 8 },
  options: { flex: 1 },
});
