import { StyleSheet, View } from "react-native";
import { Skeleton } from "./Skeleton";
import { useTheme } from "../theme/useTheme";

export function StockRowSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View>
        <Skeleton style={{ width: 50, height: 15, marginBottom: 6 }} />
        <Skeleton style={{ width: 100, height: 11 }} />
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Skeleton style={{ width: 60, height: 15, marginBottom: 6 }} />
        <Skeleton style={{ width: 70, height: 11 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
});
