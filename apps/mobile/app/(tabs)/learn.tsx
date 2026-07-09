import { useMemo, useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { PageTitle } from "../../src/components/PageTitle";
import { Screen } from "../../src/components/Screen";
import { SectionHeading } from "../../src/components/SectionHeading";
import { articles } from "../../src/features/learn/articles";
import { glossaryTerms } from "../../src/features/learn/glossary";
import { typography } from "../../src/theme/typography";
import { useTheme } from "../../src/theme/useTheme";

export default function LearnScreen() {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");

  const filteredTerms = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return glossaryTerms;
    return glossaryTerms.filter(
      (t) => t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <PageTitle subtitle="Plain-English explanations, plus tools to practice with no real money on the line.">
          Learn
        </PageTitle>

        <View style={styles.toolsRow}>
          <Pressable
            onPress={() => router.push("/sandbox")}
            style={({ pressed }) => [
              styles.toolCard,
              { backgroundColor: colors.accentSurface, borderColor: colors.accent, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={[styles.toolIcon, { backgroundColor: colors.accent }]}>
              <Ionicons name="analytics-outline" size={18} color={colors.onAccent} />
            </View>
            <Text style={[typography.cardTitle, { color: colors.text }]}>Chart Sandbox</Text>
            <Text style={[typography.caption, styles.toolSummary, { color: colors.textMuted }]} numberOfLines={2}>
              Draw or generate a chart, then get AI pattern commentary.
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/compare")}
            style={({ pressed }) => [
              styles.toolCard,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={[styles.toolIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="git-compare-outline" size={18} color={colors.onPrimary} />
            </View>
            <Text style={[typography.cardTitle, { color: colors.text }]}>Compare Stocks</Text>
            <Text style={[typography.caption, styles.toolSummary, { color: colors.textMuted }]} numberOfLines={2}>
              Line up to 4 tickers side by side.
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/pattern-lab")}
            style={({ pressed }) => [
              styles.toolCard,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={[styles.toolIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="git-network-outline" size={18} color={colors.onPrimary} />
            </View>
            <Text style={[typography.cardTitle, { color: colors.text }]}>Pattern Lab</Text>
            <Text style={[typography.caption, styles.toolSummary, { color: colors.textMuted }]} numberOfLines={2}>
              Find real historical analogs and a backtested probability estimate.
            </Text>
          </Pressable>
        </View>

        <SectionHeading title="Articles" />
        {articles.map((a) => (
          <Pressable
            key={a.slug}
            onPress={() => router.push(`/learn/${a.slug}`)}
            style={({ pressed }) => [
              styles.articleCard,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[typography.cardTitle, { color: colors.text }]}>{a.title}</Text>
              <Text style={[typography.caption, styles.summary, { color: colors.textMuted }]} numberOfLines={2}>
                {a.summary}
              </Text>
              <Text style={[typography.micro, { color: colors.textMuted }]}>{a.readMinutes} min read</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        ))}

        <SectionHeading title="Glossary" />
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search terms"
            placeholderTextColor={colors.textMuted}
            style={[typography.body, styles.searchInput, { color: colors.text }]}
          />
        </View>

        {filteredTerms.map((t) => (
          <View key={t.term} style={[styles.termCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[typography.cardTitle, { color: colors.text }]}>{t.term}</Text>
            <Text style={[typography.caption, styles.definition, { color: colors.textMuted }]}>{t.definition}</Text>
          </View>
        ))}
        {filteredTerms.length === 0 ? (
          <Text style={[typography.caption, styles.noResults, { color: colors.textMuted }]}>
            No terms match "{query}".
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 32 },
  toolsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  toolCard: { flexGrow: 1, flexBasis: "45%", padding: 14, borderRadius: 14, borderWidth: 1.5 },
  toolIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  toolSummary: { marginTop: 3, lineHeight: 16 },
  articleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  summary: { marginTop: 3, marginBottom: 4, lineHeight: 17 },
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
  searchInput: { flex: 1, height: "100%" },
  termCard: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  definition: { marginTop: 4, lineHeight: 18 },
  noResults: { textAlign: "center", paddingVertical: 20 },
});
