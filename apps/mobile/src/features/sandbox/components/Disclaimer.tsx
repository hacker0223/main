import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { typography } from "../../../theme/typography";
import { useTheme } from "../../../theme/useTheme";

// Deliberately has no close/dismiss control — this banner is a permanent
// fixture of the sandbox screen, not a one-time toast. It's the same on
// first view as it is on the hundredth.
export function Disclaimer() {
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
      <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
      <Text style={[typography.micro, styles.text, { color: colors.textMuted }]}>
        Educational pattern recognition only. Not financial advice. Not a prediction.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  text: { flex: 1, lineHeight: 15 },
});
