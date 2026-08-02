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
  // The pick for the CURRENT question, not yet committed — so a tap just
  // highlights the choice and the user confirms with the button below,
  // rather than a mis-tap instantly jumping ahead with no way back.
  const [selected, setSelected] = useState<RiskTolerance | null>(null);

  const question = questions[step];
  const isLast = step + 1 >= questions.length;

  const finish = (finalPicks: RiskTolerance[]) => {
    const counts: Record<RiskTolerance, number> = { conservative: 0, moderate: 0, aggressive: 0 };
    finalPicks.forEach((p) => counts[p]++);
    const result = (Object.keys(counts) as RiskTolerance[]).reduce((a, b) =>
      counts[b] > counts[a] ? b : a
    );
    setRiskTolerance(result);
    router.push("/(onboarding)/finish");
  };

  const next = () => {
    if (!selected) return;
    const updated = [...picks, selected];
    if (isLast) {
      finish(updated);
    } else {
      setPicks(updated);
      setStep(step + 1);
      setSelected(null);
    }
  };

  const back = () => {
    if (step === 0) {
      router.back();
      return;
    }
    // Drop the previously committed pick for the question we're returning to,
    // and pre-select it so the user sees their earlier answer.
    const prevPick = picks[step - 1] ?? null;
    setPicks(picks.slice(0, step - 1));
    setStep(step - 1);
    setSelected(prevPick);
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
            selected={selected === choice.tolerance}
            onPress={() => setSelected(choice.tolerance)}
          />
        ))}
      </View>

      <View style={styles.actions}>
        <Button label={isLast ? "See my result" : "Next"} onPress={next} disabled={!selected} />
        <View style={styles.secondaryRow}>
          <Text
            onPress={back}
            style={[typography.body, styles.linkBtn, { color: colors.primary }]}
          >
            Back
          </Text>
          <Text
            onPress={skip}
            style={[typography.body, styles.linkBtn, { color: colors.textMuted }]}
          >
            Skip this step
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: 24, marginBottom: 8 },
  eyebrow: { marginBottom: 8 },
  title: {},
  options: { flex: 1, marginTop: 16 },
  actions: { gap: 14 },
  secondaryRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 },
  linkBtn: { fontWeight: "600", paddingVertical: 4 },
});
