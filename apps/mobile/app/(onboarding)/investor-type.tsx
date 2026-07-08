import { router } from "expo-router";
import type { InvestorType } from "@summit/shared";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../src/components/Button";
import { OptionCard } from "../../src/components/OptionCard";
import { Screen } from "../../src/components/Screen";
import { typography } from "../../src/theme/typography";
import { useOnboardingStore } from "../../src/store/onboardingStore";
import { useTheme } from "../../src/theme/useTheme";

const options: { value: InvestorType; title: string; description: string }[] = [
  {
    value: "casual",
    title: "Casual investor",
    description: "Keep it simple — plain-English summaries, no jargon, not overwhelming.",
  },
  {
    value: "active_trader",
    title: "Active / swing trader",
    description: "Speed, technicals, real-time data. (Coming in a future update.)",
  },
  {
    value: "long_term",
    title: "Long-term / fundamentals investor",
    description: "Ratios, filings, dividend history. (Coming in a future update.)",
  },
];

export default function InvestorTypeScreen() {
  const { colors } = useTheme();
  const investorType = useOnboardingStore((s) => s.answers.investorType);
  const setInvestorType = useOnboardingStore((s) => s.setInvestorType);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[typography.pageTitle, styles.title, { color: colors.text }]}>
          What kind of investor are you?
        </Text>
        <Text style={[typography.body, { color: colors.textMuted }]}>
          This sets how much detail we show you by default. You can change it later.
        </Text>
      </View>

      <View style={styles.options}>
        {options.map((opt) => (
          <OptionCard
            key={opt.value}
            title={opt.title}
            description={opt.description}
            selected={investorType === opt.value}
            onPress={() => setInvestorType(opt.value)}
          />
        ))}
      </View>

      <Button label="Continue" onPress={() => router.push("/(onboarding)/interests")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: 24, marginBottom: 24 },
  title: { marginBottom: 8 },
  options: { flex: 1 },
});
