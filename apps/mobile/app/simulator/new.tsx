import { useState } from "react";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { createSimulatorRun } from "../../src/api/client";
import { Button } from "../../src/components/Button";
import { DateField } from "../../src/components/DateField";
import { PageTitle } from "../../src/components/PageTitle";
import { Screen } from "../../src/components/Screen";
import { typography } from "../../src/theme/typography";
import { useTheme } from "../../src/theme/useTheme";

function defaultStartDate(): string {
  // A round, memorable default rather than "today minus N years" — anchors
  // the whole feature's pitch ("what if you'd invested since 2000").
  return "2000-01-01";
}

export default function NewSimulatorRunScreen() {
  const { colors } = useTheme();
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string }>();
  const mode = modeParam === "portfolio" ? "portfolio" : "single";

  const [startDate, setStartDate] = useState(defaultStartDate());
  const [cashText, setCashText] = useState("10000");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cash = parseFloat(cashText);
  const canSubmit = Number.isFinite(cash) && cash > 0 && !loading;

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const run = await createSimulatorRun({ mode, startDate, initialCash: cash });
      router.replace(`/simulator/run/${run.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: mode === "single" ? "New single-stock run" : "New portfolio run" }} />
      <PageTitle
        subtitle={
          mode === "single"
            ? "Pick a starting date and a starting balance — you'll choose your stock on the next screen."
            : "Pick a starting date and a starting balance — you'll build your basket of stocks on the next screen."
        }
      >
        Set up your run
      </PageTitle>

      <Text style={[typography.cardTitle, styles.label, { color: colors.text }]}>Starting date</Text>
      <DateField value={startDate} onChange={setStartDate} />

      <Text style={[typography.cardTitle, styles.label, { color: colors.text }]}>Starting cash</Text>
      <View style={styles.cashRow}>
        <Text style={[typography.body, { color: colors.textMuted }]}>$</Text>
        <TextInput
          value={cashText}
          onChangeText={(t) => setCashText(t.replace(/[^0-9.]/g, ""))}
          keyboardType="decimal-pad"
          style={[typography.body, styles.cashInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceRaised }]}
        />
      </View>

      {error ? <Text style={[typography.caption, styles.error, { color: colors.negative }]}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      ) : (
        <Button label="Start run" onPress={submit} disabled={!canSubmit} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { marginTop: 24, marginBottom: 10 },
  cashRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cashInput: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12 },
  error: { marginTop: 16 },
  loading: { marginTop: 28 },
});
