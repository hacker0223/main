import { useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Screen } from "../src/components/Screen";
import { curatedSymbols } from "../src/constants/curatedSymbols";
import { useStockSearch } from "../src/hooks/useStockSearch";
import { typography } from "../src/theme/typography";
import { useTheme } from "../src/theme/useTheme";

export default function SearchScreen() {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const { results, loading, error } = useStockSearch(query);

  const goToStock = (symbol: string) => {
    router.replace(`/stock/${symbol}`);
  };

  const showingSuggestions = query.trim().length === 0;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Search ticker or company"
            placeholderTextColor={colors.textMuted}
            style={[typography.body, styles.input, { color: colors.text }]}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={[typography.body, { color: colors.primary }]}>Cancel</Text>
        </Pressable>
      </View>

      {showingSuggestions ? (
        <>
          <Text style={[typography.label, styles.sectionLabel, { color: colors.textMuted }]}>
            POPULAR
          </Text>
          <FlatList
            data={curatedSymbols}
            keyExtractor={(s) => s}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => goToStock(item)}
                style={[styles.row, { borderColor: colors.border }]}
              >
                <Ionicons name="trending-up-outline" size={16} color={colors.textMuted} />
                <Text style={[typography.body, styles.rowLabel, { color: colors.text }]}>{item}</Text>
              </Pressable>
            )}
          />
        </>
      ) : loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={[typography.body, { color: colors.textMuted }]}>{error}</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="search-outline" size={28} color={colors.textMuted} />
          <Text style={[typography.body, styles.noResultsText, { color: colors.textMuted }]}>
            No matches for "{query}"
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.symbol}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => goToStock(item.symbol)}
              style={[styles.row, { borderColor: colors.border }]}
            >
              <View style={styles.rowText}>
                <Text style={[typography.cardTitle, { color: colors.text }]}>{item.symbol}</Text>
                <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
                  {item.companyName}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, marginBottom: 20 },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  // minWidth: 0 — on web a TextInput's intrinsic min-width otherwise stops
  // flex from shrinking it, overflowing the clear button out of the wrap
  // and on top of the Cancel label.
  input: { flex: 1, height: "100%", minWidth: 0 },
  sectionLabel: { marginBottom: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { fontWeight: "600" },
  rowText: { flex: 1 },
  centerState: { alignItems: "center", paddingTop: 60, gap: 10 },
  noResultsText: { textAlign: "center" },
});
