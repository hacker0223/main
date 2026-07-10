import { useEffect, useRef, useState } from "react";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Disclaimer } from "../src/features/sandbox/components/Disclaimer";
import { AnalogMatchesPanel } from "../src/features/pattern-lab/components/AnalogMatchesPanel";
import { ClassifierPanel } from "../src/features/pattern-lab/components/ClassifierPanel";
import { DevilsAdvocatePanel } from "../src/features/pattern-lab/components/DevilsAdvocatePanel";
import { usePatternLab } from "../src/features/pattern-lab/usePatternLab";
import { PageTitle } from "../src/components/PageTitle";
import { Screen } from "../src/components/Screen";
import { useStockSearch } from "../src/hooks/useStockSearch";
import { typography } from "../src/theme/typography";
import { useTheme } from "../src/theme/useTheme";

export default function PatternLabScreen() {
  const { colors } = useTheme();
  const lab = usePatternLab();
  const [query, setQuery] = useState("");
  const { results, loading: searching } = useStockSearch(query);
  const { symbol: deepLinkSymbol } = useLocalSearchParams<{ symbol?: string }>();

  // Arriving here from a stock's Pattern Signal card ("Full breakdown in
  // Pattern Lab") should land already loaded for that same stock, not force
  // the user to search for it again. Only auto-load once per deep-link
  // value — lab.symbol changing afterward (e.g. the user picks a different
  // ticker) shouldn't keep snapping back to this one.
  const autoLoadedRef = useRef<string | null>(null);
  useEffect(() => {
    if (deepLinkSymbol && autoLoadedRef.current !== deepLinkSymbol) {
      autoLoadedRef.current = deepLinkSymbol;
      lab.loadTicker(deepLinkSymbol.toUpperCase());
    }
  }, [deepLinkSymbol, lab]);

  const selectTicker = (symbol: string) => {
    setQuery("");
    lab.loadTicker(symbol);
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Pattern Lab",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="chevron-back" size={26} color={colors.primary} />
            </Pressable>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
        <Disclaimer message="Historical pattern frequency and a backtested statistical estimate — not a prediction, not financial advice." />

        {!lab.symbol ? (
          <>
            <PageTitle subtitle="Pick a stock to find real historical analogs for its current chart shape.">
              Pattern Lab
            </PageTitle>

            <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search ticker or company"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                style={[typography.body, styles.searchInput, { color: colors.text }]}
              />
              {searching ? <ActivityIndicator size="small" color={colors.textMuted} /> : null}
            </View>

            {results.length > 0 ? (
              <FlatList
                data={results}
                keyExtractor={(r) => r.symbol}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => selectTicker(item.symbol)}
                    style={[styles.resultRow, { borderColor: colors.border }]}
                  >
                    <Text style={[typography.body, { color: colors.text, fontWeight: "600" }]}>{item.symbol}</Text>
                    <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
                      {item.companyName}
                    </Text>
                  </Pressable>
                )}
              />
            ) : null}
          </>
        ) : (
          <>
            <View style={styles.symbolHeader}>
              <Text style={[typography.pageTitle, { color: colors.text }]}>{lab.symbol}</Text>
              <Pressable onPress={lab.reset} hitSlop={8}>
                <Text style={[typography.body, { color: colors.primary }]}>Change</Text>
              </Pressable>
            </View>

            {lab.chartState.loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
            ) : lab.chartState.error ? (
              <Text style={[typography.caption, { color: colors.negative }]}>{lab.chartState.error}</Text>
            ) : (
              <>
                <AnalogMatchesPanel
                  data={lab.analogs.data}
                  loading={lab.analogs.loading}
                  error={lab.analogs.error}
                  onRun={lab.runAnalogs}
                />
                <ClassifierPanel
                  data={lab.classification.data}
                  loading={lab.classification.loading}
                  error={lab.classification.error}
                  onRun={lab.runClassification}
                />
                <DevilsAdvocatePanel
                  data={lab.devilsAdvocate.data}
                  loading={lab.devilsAdvocate.loading}
                  error={lab.devilsAdvocate.error}
                  onSubmit={lab.runDevilsAdvocate}
                />
              </>
            )}
          </>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboardAvoider: { flex: 1 },
  scroll: { paddingBottom: 40 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: { flex: 1, height: "100%", minWidth: 0 },
  resultRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  symbolHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
});
