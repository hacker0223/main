import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Screen } from "../src/components/Screen";
import { SummitWordmark } from "../src/components/SummitWordmark";
import { typography } from "../src/theme/typography";
import { useTheme } from "../src/theme/useTheme";

const APP_VERSION = "0.0.1";

export default function AboutScreen() {
  const { colors } = useTheme();

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "About Summit",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="chevron-back" size={26} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.brand}>
          <SummitWordmark />
          <Text style={[typography.micro, { color: colors.textMuted }]}>Version {APP_VERSION}</Text>
        </View>

        <Text style={[typography.body, styles.paragraph, { color: colors.text }]}>
          Summit is a stock research and education app for casual investors: live quotes, fundamentals,
          technicals, news, and SEC filings, plus hands-on learning tools — Chart Sandbox for practicing
          chart reading, and Pattern Lab for exploring how similar historical chart shapes actually played
          out.
        </Text>
        <Text style={[typography.body, styles.paragraph, { color: colors.textMuted }]}>
          Summit explains and contextualizes — it never tells you what to buy or sell, and it doesn't
          execute trades. Statistical estimates always come with their real backtested accuracy attached.
        </Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[typography.cardTitle, styles.cardTitle, { color: colors.text }]}>Data sources</Text>
          <Text style={[typography.caption, styles.sourceRow, { color: colors.textMuted }]}>
            Quotes, fundamentals & news — Finnhub
          </Text>
          <Text style={[typography.caption, styles.sourceRow, { color: colors.textMuted }]}>
            Historical charts — Yahoo Finance
          </Text>
          <Text style={[typography.caption, styles.sourceRow, { color: colors.textMuted }]}>
            Company filings — SEC EDGAR
          </Text>
          <Text style={[typography.caption, styles.sourceRow, { color: colors.textMuted }]}>
            AI explanations — Claude (Anthropic)
          </Text>
        </View>

        <Text style={[typography.micro, styles.footer, { color: colors.textMuted }]}>
          Not financial advice. For informational and educational purposes only.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40, paddingTop: 16 },
  brand: { alignItems: "center", gap: 6, marginBottom: 24, marginTop: 8 },
  paragraph: { lineHeight: 21, marginBottom: 14 },
  card: { padding: 16, borderRadius: 14, borderWidth: 1, marginTop: 8 },
  cardTitle: { marginBottom: 10 },
  sourceRow: { marginBottom: 6, lineHeight: 18 },
  footer: { textAlign: "center", marginTop: 24 },
});
