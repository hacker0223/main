import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "./Button";
import { typography } from "../theme/typography";
import { useTheme } from "../theme/useTheme";

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  ctaLabel?: string;
  onPressCta?: () => void;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, ctaLabel, onPressCta, compact }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={[styles.iconCircle, { backgroundColor: colors.surfaceRaised }]}>
        <Ionicons name={icon} size={compact ? 20 : 26} color={colors.textMuted} />
      </View>
      <Text style={[typography.cardTitle, styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[typography.caption, styles.description, { color: colors.textMuted }]}>{description}</Text>
      {ctaLabel && onPressCta ? (
        <View style={styles.cta}>
          <Button label={ctaLabel} variant="secondary" onPress={onPressCta} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 32, paddingHorizontal: 12 },
  wrapCompact: { paddingVertical: 20 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: { marginBottom: 4 },
  description: { textAlign: "center", marginBottom: 16, maxWidth: 260 },
  cta: { minWidth: 180 },
});
