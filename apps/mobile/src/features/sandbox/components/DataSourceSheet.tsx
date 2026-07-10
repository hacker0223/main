import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { typography } from "../../../theme/typography";
import { useTheme } from "../../../theme/useTheme";
import { useStockSearch } from "../../../hooks/useStockSearch";
import { mockHistoricalSeries } from "../mockHistoricalData";

export function DataSourceSheet({
  onBlank,
  onRandom,
  onMock,
  onImport,
  importLoading,
  importError,
}: {
  onBlank: () => void;
  onRandom: () => void;
  onMock: (seriesId: string) => void;
  onImport: (symbol: string) => void;
  importLoading: boolean;
  importError: string | null;
}) {
  const { colors } = useTheme();
  const [importOpen, setImportOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { results, loading: searching } = useStockSearch(query);

  const selectTicker = (symbol: string) => {
    setQuery("");
    setImportOpen(false);
    onImport(symbol);
  };

  return (
    <View>
      <SourceOption
        icon="create-outline"
        title="Start blank"
        description="A flat starting chart — drag candles into whatever shape you want to practice reading."
        onPress={onBlank}
        colors={colors}
      />
      <SourceOption
        icon="shuffle-outline"
        title="Random walk"
        description="An 80-candle procedurally generated series — different every time."
        onPress={onRandom}
        colors={colors}
      />
      <SourceOption
        icon="search-outline"
        title="Import a real stock"
        description="Load a real stock's actual last 6 months of daily candles to practice reading and drawing on — still just a practice surface, nothing here is a live position or a trade."
        onPress={() => setImportOpen((v) => !v)}
        colors={colors}
      />

      {importOpen ? (
        <View style={[styles.importPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.searchBar, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
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

          {importLoading ? (
            <View style={styles.importStatus}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[typography.caption, styles.importStatusText, { color: colors.textMuted }]}>
                Loading chart…
              </Text>
            </View>
          ) : importError ? (
            <Text style={[typography.caption, styles.importError, { color: colors.negative }]}>{importError}</Text>
          ) : null}

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
        </View>
      ) : null}

      <Text style={[typography.label, styles.sectionLabel, { color: colors.textMuted }]}>
        SAMPLE DATA (ILLUSTRATIVE, NOT A REAL STOCK)
      </Text>
      {mockHistoricalSeries.map((series) => (
        <SourceOption
          key={series.id}
          icon="bar-chart-outline"
          title={series.label}
          description={series.description}
          onPress={() => onMock(series.id)}
          colors={colors}
        />
      ))}
    </View>
  );
}

function SourceOption({
  icon,
  title,
  description,
  onPress,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: colors.surfaceRaised }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.cardTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[typography.caption, styles.description, { color: colors.textMuted }]}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  description: { marginTop: 2, lineHeight: 16 },
  sectionLabel: { marginTop: 12, marginBottom: 10 },
  importPanel: { padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, height: "100%", minWidth: 0 },
  importStatus: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  importStatusText: {},
  importError: { marginTop: 10 },
  resultRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
});
