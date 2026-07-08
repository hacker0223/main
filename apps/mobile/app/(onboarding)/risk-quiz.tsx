import { useState } from "react";
import { router } from "expo-router";
import type { RiskTolerance } from "@summit/shared";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../src/components/Button";
import { OptionCard } from "../../src/components/OptionCard";
import { ProgressDots } from "../../src/components/ProgressDots";
import { Screen } from "../../src/components/Screen";
import { typography } from "../../src/theme/typography";
import { useOnboardingStore } from "../../src/store/onboardingStore";
import { useTheme } from "../../src/theme/useTheme";

interface Question {
  prompt: string;
  choices: { label: string; tolerance: RiskTolerance }[];
}

const questions: Question[] = [
  {
    prompt: "If your portfolio dropped 15% in a month, you'd most likely...",
    choices: [
      { label: "Sell some to limit further losses", tolerance: "conservative" },
      { label: "Hold and wait it out", tolerance: "moderate" },
      { label: "Buy more while it's cheaper", tolerance: "aggressive" },
    ],
  },
  {
    prompt: "How soon might you need this money?",
    choices: [
      { label: "Within 2 years", tolerance: "conservative" },
      { label: "2–10 years", tolerance: "moderate" },
      { label: "10+ years", tolerance: "aggressive" },
    ],
  },
  {
    prompt: "Which trade-off sounds better to you?",
    choices: [
      { label: "Lower returns, smaller ups and downs", tolerance: "conservative" },
      { label: "Balanced growth and stability", tolerance: "moderate" },
      { label: "Higher potential returns, bigger swings", tolerance: "aggressive" },
    ],
  },
];

export default function RiskQuizScreen() {
  const { colors } = useTheme();
  const setRiskTolerance = useOnboardingStore((s) => s.setRiskTolerance);
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<RiskTolerance[]>([]);

  const question = questions[step];

  const finish = (finalPicks: RiskTolerance[]) => {
    const counts: Record<RiskTolerance, number> = { conservative: 0, moderate: 0, aggressive: 0 };
    finalPicks.forEach((p) => counts[p]++);
    const result = (Object.keys(counts) as RiskTolerance[]).reduce((a, b) =>
      counts[b] > counts[a] ? b : a
    );
    setRiskTolerance(result);
    router.push("/(onboarding)/finish");
  };

  const choose = (tolerance: RiskTolerance) => {
    const next = [...picks, tolerance];
    if (step + 1 < questions.length) {
      setPicks(next);
      setStep(step + 1);
    } else {
      finish(next);
    }
  };

  const skip = () => {
    setRiskTolerance("moderate");
    router.push("/(onboarding)/finish");
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[typography.label, styles.eyebrow, { color: colors.textMuted }]}>
          RISK TOLERANCE (OPTIONAL)
        </Text>
        <Text style={[typography.pageTitle, styles.title, { color: colors.text }]}>{question.prompt}</Text>
      </View>

      <ProgressDots total={questions.length} activeIndex={step} />

      <View style={styles.options}>
        {question.choices.map((choice) => (
          <OptionCard
            key={choice.label}
            title={choice.label}
            selected={false}
            onPress={() => choose(choice.tolerance)}
          />
        ))}
      </View>

      <Button label="Skip this step" variant="secondary" onPress={skip} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: 24, marginBottom: 8 },
  eyebrow: { marginBottom: 8 },
  title: {},
  options: { flex: 1, marginTop: 16 },
});
