import { Pressable, StyleSheet, Text, View } from "react-native";
import { typography } from "../theme/typography";
import { useTheme } from "../theme/useTheme";

export function SectionHeading({
  title,
  action,
  onPressAction,
}: {
  title: string;
  action?: string;
  onPressAction?: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <Text style={[typography.sectionTitle, { color: colors.text }]}>{title}</Text>
      {action ? (
        onPressAction ? (
          <Pressable onPress={onPressAction} hitSlop={8}>
            <Text style={[typography.caption, { color: colors.primary }]}>{action}</Text>
          </Pressable>
        ) : (
          <Text style={[typography.caption, { color: colors.primary }]}>{action}</Text>
        )
      ) : null}
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
