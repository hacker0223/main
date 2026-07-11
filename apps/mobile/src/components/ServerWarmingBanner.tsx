import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useServerStatus } from "../store/serverStatusStore";
import { typography } from "../theme/typography";
import { useTheme } from "../theme/useTheme";

// A small, honest top banner shown only while a cold backend is waking up
// (see warmUpBackend). Turns a confusing 20s wait into reassurance instead
// of letting the user assume the app is broken. pointerEvents="box-none"
// so it never blocks touches on the screen beneath it.
export function ServerWarmingBanner() {
  const warming = useServerStatus((s) => s.warming);
  const { colors } = useTheme();

  if (!warming) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <SafeAreaView edges={["top"]} pointerEvents="box-none">
        <View style={[styles.banner, { backgroundColor: colors.accentSurface, borderColor: colors.accent }]}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[typography.caption, styles.text, { color: colors.text }]} numberOfLines={1}>
            Waking up the market data server — first load can take a moment…
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 12,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  text: { flex: 1 },
});
