import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../src/components/Button";
import { Screen } from "../../src/components/Screen";
import { typography } from "../../src/theme/typography";
import { useOnboardingStore } from "../../src/store/onboardingStore";
import { useTheme } from "../../src/theme/useTheme";

export default function FinishScreen() {
  const { colors } = useTheme();
  const acknowledged = useOnboardingStore((s) => s.answers.disclaimerAcknowledged);
  const acknowledgeDisclaimer = useOnboardingStore((s) => s.acknowledgeDisclaimer);
  const complete = useOnboardingStore((s) => s.complete);

  const getStarted = async () => {
    await complete();
    router.replace("/(tabs)");
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.emoji}>✅</Text>
        <Text style={[typography.pageTitle, styles.title, { color: colors.text }]}>You're all set</Text>
        <Text style={[typography.body, { color: colors.textMuted }]}>
          One last thing before we let you in.
        </Text>
      </View>

      <Pressable
        style={[styles.disclaimer, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => acknowledgeDisclaimer(!acknowledged)}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: colors.primary,
              backgroundColor: acknowledged ? colors.primary : "transparent",
            },
          ]}
        >
          {acknowledged ? <Ionicons name="checkmark" size={16} color={colors.onPrimary} /> : null}
        </View>
        <Text style={[typography.caption, styles.disclaimerText, { color: colors.text }]}>
          I understand Summit provides general market data and analytics for informational
          purposes only — not personalized financial advice.
        </Text>
      </Pressable>

      <View style={{ flex: 1 }} />

      <Button label="Get started" onPress={getStarted} disabled={!acknowledged} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: 32, marginBottom: 32, alignItems: "center" },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { marginBottom: 8 },
  disclaimer: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  disclaimerText: { flex: 1, fontSize: 13, lineHeight: 19 },
});
