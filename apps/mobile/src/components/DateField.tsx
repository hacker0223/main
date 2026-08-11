import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { typography } from "../theme/typography";
import { useTheme } from "../theme/useTheme";

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function toISODate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// A plain three-field date entry rather than a native date-picker library —
// avoids pulling in another native module that would need a full rebuild
// before it's even testable (same tradeoff already made for Apple Sign In).
export function DateField({
  value,
  onChange,
  minYear = 1970,
}: {
  value: string; // YYYY-MM-DD
  onChange: (isoDate: string) => void;
  minYear?: number;
}) {
  const { colors } = useTheme();
  const [y, m, d] = value.split("-");
  const [yearText, setYearText] = useState(y ?? "");
  const [monthText, setMonthText] = useState(m ?? "");
  const [dayText, setDayText] = useState(d ?? "");

  useEffect(() => {
    const [vy, vm, vd] = value.split("-");
    setYearText(vy ?? "");
    setMonthText(vm ?? "");
    setDayText(vd ?? "");
  }, [value]);

  const commit = (nextYear: string, nextMonth: string, nextDay: string) => {
    const year = parseInt(nextYear, 10);
    const month = parseInt(nextMonth, 10);
    const day = parseInt(nextDay, 10);
    const maxYear = new Date().getFullYear();
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return;
    if (year < minYear || year > maxYear) return;
    if (month < 1 || month > 12) return;
    const clampedDay = Math.min(Math.max(1, day), daysInMonth(year, month));
    onChange(toISODate(year, month, clampedDay));
  };

  return (
    <View style={styles.row}>
      <Field
        label="Year"
        value={yearText}
        maxLength={4}
        onChangeText={(t) => {
          setYearText(t);
          commit(t, monthText, dayText);
        }}
        colors={colors}
      />
      <Field
        label="Month"
        value={monthText}
        maxLength={2}
        onChangeText={(t) => {
          setMonthText(t);
          commit(yearText, t, dayText);
        }}
        colors={colors}
      />
      <Field
        label="Day"
        value={dayText}
        maxLength={2}
        onChangeText={(t) => {
          setDayText(t);
          commit(yearText, monthText, t);
        }}
        colors={colors}
      />
    </View>
  );
}

function Field({
  label,
  value,
  maxLength,
  onChangeText,
  colors,
}: {
  label: string;
  value: string;
  maxLength: number;
  onChangeText: (t: string) => void;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <View style={styles.field}>
      <Text style={[typography.micro, styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(t) => onChangeText(t.replace(/[^0-9]/g, ""))}
        keyboardType="number-pad"
        maxLength={maxLength}
        style={[
          typography.body,
          styles.input,
          { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceRaised },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
  field: { flex: 1 },
  fieldLabel: { marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, textAlign: "center" },
});
