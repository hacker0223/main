import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { typography } from "../../../theme/typography";
import { useTheme } from "../../../theme/useTheme";
import type { ReplayState } from "../useSandboxState";

const SPEEDS: { label: string; ms: number }[] = [
  { label: "0.5x", ms: 1400 },
  { label: "1x", ms: 700 },
  { label: "2x", ms: 350 },
];

export function ReplayControls({
  replay,
  total,
  onStart,
  onExit,
  onStep,
  onTogglePlaying,
  onSetSpeed,
}: {
  replay: ReplayState;
  total: number;
  onStart: () => void;
  onExit: () => void;
  onStep: (delta: number) => void;
  onTogglePlaying: () => void;
  onSetSpeed: (ms: number) => void;
}) {
  const { colors } = useTheme();

  if (!replay.active) {
    return (
      <Pressable
        onPress={onStart}
        style={[styles.startButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Ionicons name="play-skip-forward-outline" size={16} color={colors.primary} />
        <Text style={[typography.caption, { color: colors.primary, fontWeight: "700" }]}>Start Replay</Text>
      </Pressable>
    );
  }

  const atEnd = replay.visibleCount >= total;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.topRow}>
        <Text style={[typography.micro, { color: colors.textMuted }]}>
          {replay.visibleCount} / {total} candles revealed
        </Text>
        <Pressable onPress={onExit} hitSlop={8}>
          <Text style={[typography.micro, { color: colors.primary, fontWeight: "700" }]}>Exit Replay</Text>
        </Pressable>
      </View>

      <View style={styles.controlsRow}>
        <IconButton icon="play-back-outline" onPress={() => onStep(-1)} colors={colors} />
        <Pressable
          onPress={onTogglePlaying}
          disabled={atEnd}
          style={[styles.playButton, { backgroundColor: colors.primary, opacity: atEnd ? 0.4 : 1 }]}
        >
          <Ionicons name={replay.playing ? "pause" : "play"} size={20} color={colors.onPrimary} />
        </Pressable>
        <IconButton icon="play-forward-outline" onPress={() => onStep(1)} colors={colors} disabled={atEnd} />

        <View style={styles.speedRow}>
          {SPEEDS.map((s) => (
            <Pressable
              key={s.label}
              onPress={() => onSetSpeed(s.ms)}
              style={[
                styles.speedPill,
                {
                  backgroundColor: replay.speedMs === s.ms ? colors.primary : "transparent",
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[typography.micro, { color: replay.speedMs === s.ms ? colors.onPrimary : colors.textMuted }]}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

function IconButton({
  icon,
  onPress,
  colors,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>["colors"];
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.iconButton, { borderColor: colors.border, opacity: disabled ? 0.4 : 1 }]}
    >
      <Ionicons name={icon} size={16} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  wrap: { padding: 12, borderRadius: 14, borderWidth: 1 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  controlsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  playButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  speedRow: { flexDirection: "row", gap: 4, marginLeft: "auto" },
  speedPill: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
});
