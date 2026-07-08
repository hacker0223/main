import { StyleSheet, Text, View } from "react-native";
import { typography } from "../theme/typography";
import { useTheme } from "../theme/useTheme";

export function SectionHeading({ title, action }: { title: string; action?: string }) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <Text style={[typography.sectionTitle, { color: colors.text }]}>{title}</Text>
      {action ? <Text style={[typography.caption, { color: colors.primary }]}>{action}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 8,
  },
});
