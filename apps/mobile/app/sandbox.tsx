import { useState } from "react";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { PageTitle } from "../src/components/PageTitle";
import { Screen } from "../src/components/Screen";
import { AnalysisPanel } from "../src/features/sandbox/components/AnalysisPanel";
import { DataSourceSheet } from "../src/features/sandbox/components/DataSourceSheet";
import { Disclaimer } from "../src/features/sandbox/components/Disclaimer";
import { IndicatorPanel } from "../src/features/sandbox/components/IndicatorPanel";
import { ReplayControls } from "../src/features/sandbox/components/ReplayControls";
import { SandboxChart } from "../src/features/sandbox/components/SandboxChart";
import { useSandboxState } from "../src/features/sandbox/useSandboxState";
import { typography } from "../src/theme/typography";
import { useTheme } from "../src/theme/useTheme";

export default function SandboxScreen() {
  const { colors } = useTheme();
  const [showAnnotations, setShowAnnotations] = useState(true);
  // While the user is actively drawing a trendline or dragging an OHLC
  // handle, the outer ScrollView must not be allowed to scroll — on a real
  // device its native scroll gesture recognizer can still win a touch away
  // from the chart mid-drag (the line freezes after a tiny movement, or the
  // whole screen swipes instead), even with the chart's own
  // onPanResponderTerminationRequest refusing to yield. Locking scrollEnabled
  // for the duration of the touch removes the competing gesture entirely.
  const [chartInteractionActive, setChartInteractionActive] = useState(false);
  const s = useSandboxState();

  const hasEnoughData = s.effectiveCandles.length >= 15;

  const editable = !s.replay.active || !s.replay.playing;

  return (
    <Screen>
      <Stack.Screen
          options={{
            headerShown: true,
            title: "Chart Sandbox",
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerLeft: () => (
              <Pressable onPress={() => router.back()} hitSlop={12}>
                <Ionicons name="chevron-back" size={26} color={colors.primary} />
              </Pressable>
            ),
          }}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          scrollEnabled={!chartInteractionActive}
        >
          <Disclaimer />

          {!s.dataSource ? (
            <>
              <PageTitle subtitle="Practice reading price action with no live money or real symbols involved.">
                Chart Sandbox
              </PageTitle>
              <DataSourceSheet onBlank={s.loadBlank} onRandom={s.loadRandom} onMock={s.loadMock} />
            </>
          ) : (
            <>
              <View style={styles.toolbar}>
                <ToolButton
                  icon="pencil-outline"
                  label="Draw"
                  active={s.drawMode}
                  disabled={!editable}
                  onPress={s.toggleDrawMode}
                  colors={colors}
                />
                <ToolButton
                  icon="add-circle-outline"
                  label="Add candle"
                  active={false}
                  disabled={!editable}
                  onPress={() => s.addCandleAfter(s.selectedCandleIndex ?? s.candles.length - 1)}
                  colors={colors}
                />
                <ToolButton
                  icon="trash-outline"
                  label="Clear lines"
                  active={false}
                  disabled={s.drawings.length === 0}
                  onPress={() =>
                    Alert.alert("Clear all trendlines?", undefined, [
                      { text: "Cancel", style: "cancel" },
                      { text: "Clear", style: "destructive", onPress: s.clearDrawings },
                    ])
                  }
                  colors={colors}
                />
                <ToolButton
                  icon="refresh-outline"
                  label="New chart"
                  active={false}
                  onPress={() =>
                    Alert.alert("Start a new chart?", "This clears the current candles and drawings.", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Start new", style: "destructive", onPress: s.reset },
                    ])
                  }
                  colors={colors}
                />
              </View>

              {s.drawMode ? (
                <Text style={[typography.micro, styles.hint, { color: colors.primary }]}>
                  Drag across the chart to place a trendline.
                </Text>
              ) : s.selectedCandleIndex !== null ? (
                <Text style={[typography.micro, styles.hint, { color: colors.primary }]}>
                  Drag the dots to set high, open, close, and low. Tap the candle again to deselect.
                </Text>
              ) : (
                <Text style={[typography.micro, styles.hint, { color: colors.textMuted }]}>
                  Tap a candle to edit it · drag the background to pan
                </Text>
              )}

              <View style={styles.zoomRow}>
                <Pressable
                  onPress={() => s.zoom(1.3)}
                  style={[styles.zoomButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Ionicons name="remove" size={16} color={colors.text} />
                </Pressable>
                <Pressable
                  onPress={() => s.zoom(1 / 1.3)}
                  style={[styles.zoomButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Ionicons name="add" size={16} color={colors.text} />
                </Pressable>
              </View>

              <SandboxChart
                candles={s.candles}
                viewRange={s.viewRange}
                selectedIndicators={s.selectedIndicators}
                selectedCandleIndex={s.selectedCandleIndex}
                drawings={s.drawings}
                drawMode={s.drawMode}
                analysis={s.analysis.data}
                showAnnotations={showAnnotations}
                onSelectCandle={s.selectCandle}
                onUpdateCandle={s.updateCandle}
                onAddTrendline={s.addTrendline}
                onPan={s.pan}
                editable={editable}
                onInteractionStateChange={setChartInteractionActive}
              />

              <View style={styles.section}>
                <IndicatorPanel selected={s.selectedIndicators} onToggle={s.toggleIndicator} />
              </View>

              <View style={styles.section}>
                <ReplayControls
                  replay={s.replay}
                  total={s.candles.length}
                  onStart={s.startReplay}
                  onExit={s.exitReplay}
                  onStep={s.stepReplay}
                  onTogglePlaying={s.togglePlaying}
                  onSetSpeed={s.setReplaySpeed}
                />
              </View>

              <View style={styles.section}>
                <AnalysisPanel
                  analysis={s.analysis.data}
                  loading={s.analysis.loading}
                  error={s.analysis.error}
                  hasEnoughData={hasEnoughData}
                  onAnalyze={s.runAnalysis}
                  showAnnotations={showAnnotations}
                  onToggleAnnotations={() => setShowAnnotations((v) => !v)}
                />
              </View>
            </>
          )}
      </ScrollView>
    </Screen>
  );
}

function ToolButton({
  icon,
  label,
  active,
  disabled,
  onPress,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.toolButton,
        {
          backgroundColor: active ? colors.primary : colors.surface,
          borderColor: active ? colors.primary : colors.border,
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={16} color={active ? colors.onPrimary : colors.text} />
      <Text style={[typography.caption, { color: active ? colors.onPrimary : colors.text, fontWeight: "600" }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  toolbar: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  toolButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  hint: { marginBottom: 8 },
  zoomRow: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginBottom: 6 },
  zoomButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { marginTop: 16 },
});
