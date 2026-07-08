import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { typography } from "../../../theme/typography";
import { useTheme } from "../../../theme/useTheme";
import { mockHistoricalSeries } from "../mockHistoricalData";

export function DataSourceSheet({
  onBlank,
  onRandom,
  onMock,
}: {
  onBlank: () => void;
  onRandom: () => void;
  onMock: (seriesId: string) => void;
}) {
  const { colors } = useTheme();

  return (
    <View>
      <SourceOption
        icon="create-outline"
        title="Start blank"
        description="A flat starting chart — drag candles into whatever shape you want to practice reading."
        onPress={onBlank}
        colors={colors}
      />
      <SourceOption
        icon="shuffle-outline"
        title="Random walk"
        description="An 80-candle procedurally generated series — different every time."
        onPress={onRandom}
        colors={colors}
      />

      <Text style={[typography.label, styles.sectionLabel, { color: colors.textMuted }]}>
        SAMPLE DATA (ILLUSTRATIVE, NOT A REAL STOCK)
      </Text>
      {mockHistoricalSeries.map((series) => (
        <SourceOption
          key={series.id}
          icon="bar-chart-outline"
          title={series.label}
          description={series.description}
          onPress={() => onMock(series.id)}
          colors={colors}
        />
      ))}
    </View>
  );
}

function SourceOption({
  icon,
  title,
  description,
  onPress,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: colors.surfaceRaised }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.cardTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[typography.caption, styles.description, { color: colors.textMuted }]}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  description: { marginTop: 2, lineHeight: 16 },
  sectionLabel: { marginTop: 12, marginBottom: 10 },
});
