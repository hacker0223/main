import { useState } from "react";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
  const mode = modeParam === "portfolio" ? "portfolio" : modeParam === "generated" ? "generated" : "single";
  const isGenerated = mode === "generated";

  const [startDate, setStartDate] = useState(defaultStartDate());
  const [cashText, setCashText] = useState("10000");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cash = parseFloat(cashText);
  const canSubmit = isGenerated ? !loading : Number.isFinite(cash) && cash > 0 && !loading;

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      // Generated runs are fixed-terms by design (same cash, same 7 days for
      // everyone) so their Hall of Fame stays comparable — the server sets
      // all of it, the client just asks for a world.
      const run = isGenerated
        ? await createSimulatorRun({ mode: "generated" })
        : await createSimulatorRun({ mode, startDate, initialCash: cash });
      router.replace(`/simulator/run/${run.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  };

  if (isGenerated) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: "New generated market" }} />
        <PageTitle subtitle="A fresh fictional market is generated the moment you start — 20 invented companies with their own news cycle, and seven days to trade it.">
          Enter the market
        </PageTitle>

        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <InfoRow icon="cash-outline" label="Starting cash" value="$10,000" colors={colors} />
          <InfoRow icon="calendar-outline" label="Length" value="7 trading days" colors={colors} />
          <InfoRow icon="business-outline" label="Companies" value="20 generated" colors={colors} />
          <Text style={[typography.micro, styles.fixedNote, { color: colors.textMuted }]}>
            Everyone gets the same cash and the same seven days, so Hall of Fame runs in this mode compare directly.
            Only the market itself changes.
          </Text>
        </View>

        <View style={[styles.fictionCard, { backgroundColor: colors.accentSurface, borderColor: colors.accent }]}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.accent} />
          <Text style={[typography.caption, styles.fictionText, { color: colors.text }]}>
            Every company, price, and headline in this mode is invented. None of it refers to a real security, and
            nothing here is market information.
          </Text>
        </View>

        {error ? <Text style={[typography.caption, styles.error, { color: colors.negative }]}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : (
          <Button label="Generate market & start" onPress={submit} disabled={!canSubmit} />
        )}
      </Screen>
    );
  }

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

function InfoRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <Text style={[typography.caption, { color: colors.textMuted, flex: 1 }]}>{label}</Text>
      <Text style={[typography.cardTitle, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  infoCard: { padding: 16, borderRadius: 14, borderWidth: 1, marginTop: 20, marginBottom: 14 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7 },
  fixedNote: { marginTop: 10, lineHeight: 16 },
  fictionCard: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 22 },
  fictionText: { flex: 1, lineHeight: 18 },
  label: { marginTop: 24, marginBottom: 10 },
  cashRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cashInput: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12 },
  error: { marginTop: 16 },
  loading: { marginTop: 28 },
});
