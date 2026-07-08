import { StyleSheet, Text, View } from "react-native";
import { SummitMark } from "./SummitMark";
import { useTheme } from "../theme/useTheme";

export function SummitWordmark({ size = 22 }: { size?: number }) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <SummitMark size={size} />
      <Text style={[styles.text, { color: colors.text, fontSize: size * 0.82 }]}>Summit</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  text: { fontWeight: "800", letterSpacing: 0.2 },
});
