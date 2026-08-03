import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { typography } from "../../../theme/typography";
import { useTheme } from "../../../theme/useTheme";

const LESSONS: { title: string; body: string }[] = [
  {
    title: "Reading a candle",
    body: "Each candle shows four prices for one period: open, close, high, and low. The thick \"body\" spans open to close; the thin \"wicks\" show the full range. Green (or up-colored) means it closed above where it opened — red means it closed below.",
  },
  {
    title: "Trend",
    body: "A trend is the general direction over many candles, not any single one. A string of candles making higher highs and higher lows is an uptrend; lower highs and lower lows is a downtrend. Chop with no clear direction is a range.",
  },
  {
    title: "Support & resistance",
    body: "Support is a price level a chart has repeatedly stopped falling at; resistance is a level it's repeatedly stopped rising at. They're tendencies from history, not guarantees — price breaks through them often.",
  },
  {
    title: "Volume",
    body: "The bars below the candles show how many shares traded. A move on unusually high volume tends to mean more than the same move on a quiet day — more people agreeing on the price.",
  },
];

// A compact, skippable primer for absolute beginners, shown before they
// start practicing — not required reading, just there for anyone who wants
// their feet wet before dragging a candle around.
export function ChartBasicsPrimer() {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <View style={[styles.card, { backgroundColor: colors.accentSurface, borderColor: colors.accent }]}>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.header}>
        <Ionicons name="school-outline" size={16} color={colors.accent} />
        <Text style={[typography.cardTitle, styles.headerText, { color: colors.text }]}>
          New to charts? Quick basics
        </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
      </Pressable>

      {open ? (
        <View style={styles.lessons}>
          {LESSONS.map((lesson, i) => {
            const expanded = expandedIdx === i;
            return (
              <Pressable key={lesson.title} onPress={() => setExpandedIdx(expanded ? null : i)} style={styles.lessonRow}>
                <View style={styles.lessonHeaderRow}>
                  <Text style={[typography.body, styles.lessonTitle, { color: colors.text }]}>{lesson.title}</Text>
                  <Ionicons
                    name={expanded ? "remove-circle-outline" : "add-circle-outline"}
                    size={17}
                    color={colors.textMuted}
                  />
                </View>
                {expanded ? (
                  <Text style={[typography.caption, styles.lessonBody, { color: colors.textMuted }]}>
                    {lesson.body}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerText: { flex: 1 },
  lessons: { marginTop: 12, gap: 4 },
  lessonRow: { paddingVertical: 8 },
  lessonHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  lessonTitle: { fontWeight: "600" },
  lessonBody: { marginTop: 6, lineHeight: 18 },
});
