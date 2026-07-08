import { StyleSheet, View } from "react-native";
import { useTheme } from "../theme/useTheme";

export function ProgressDots({ total, activeIndex }: { total: number; activeIndex: number }) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: i === activeIndex ? colors.primary : colors.border,
              width: i === activeIndex ? 20 : 8,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "center", gap: 6, marginVertical: 16 },
  dot: { height: 8, borderRadius: 4 },
});
