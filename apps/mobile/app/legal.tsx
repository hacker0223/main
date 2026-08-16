import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Screen } from "../src/components/Screen";
import { typography } from "../src/theme/typography";
import { useTheme } from "../src/theme/useTheme";

// In-app mirror of docs/terms.html + docs/privacy.html — the app can't
// depend on those being hosted somewhere, and App Review expects legal
// content to actually be reachable. Keep the three sources in sync when
// terms change.
const LAST_UPDATED = "August 15, 2026";

const sections: { heading: string; paragraphs: string[] }[] = [
  {
    heading: "The short version",
    paragraphs: [
      "Summit is an educational and informational tool, not a licensed financial adviser or broker. It does not execute trades, hold funds, or manage investments. Every decision you make with information from this app is your own.",
    ],
  },
  {
    heading: "Not financial advice",
    paragraphs: [
      "Nothing in Summit — including risk scores, probabilistic price ranges, historical pattern matches, classifier probability estimates, or any AI-generated commentary — is a recommendation to buy, sell, or hold any security. These are statistical descriptions of historical data, computed transparently, and explicitly not predictions of future performance. Past patterns do not guarantee future results.",
    ],
  },
  {
    heading: "AI features",
    paragraphs: [
      "Pattern Lab's narration and Devil's Advocate, and the optional Summarize buttons on the AI Insights and News tabs, use Claude (Anthropic's AI model) to explain numbers and articles that come from our own code or from published sources — the AI is never asked to invent a prediction or a buy/sell signal, and is instructed not to. Even so, AI-generated text can be wrong or imprecise. Treat it as a starting point for your own thinking, not a source of truth.",
      "The Summarize buttons only run when you tap them; nothing is sent to Anthropic just by opening a tab.",
      "If you type your own thesis into Devil's Advocate, that text is sent to Anthropic's API to generate a counter-argument. It is not stored by us, and is subject to Anthropic's own privacy policy for API usage.",
    ],
  },
  {
    heading: "The Time Machine simulator",
    paragraphs: [
      "The simulator is a game. It uses no real money, places no real orders, and is not connected to any brokerage — you cannot deposit, withdraw, or realise anything of value in it, and results there confer no financial benefit.",
      "Real-market runs replay historical prices from past dates. They exclude real-world costs such as commissions, spreads, slippage, taxes, and dividends, and benefit from hindsight in choosing a start date, so returns shown are not a realistic estimate of what any real portfolio would have earned.",
      "Generated-market runs are entirely fictional: the companies, prices, and news headlines are invented by our software and refer to no real security, company, or event.",
    ],
  },
  {
    heading: "Market data accuracy",
    paragraphs: [
      "Quotes, fundamentals, and other market data are sourced from third parties (Finnhub, Yahoo Finance, SEC EDGAR) and may be delayed, incomplete, or occasionally inaccurate. Summit makes no guarantee of real-time accuracy. Verify anything material with your broker or an official source before acting on it.",
    ],
  },
  {
    heading: "Privacy: accounts are optional",
    paragraphs: [
      "Almost all of Summit works without an account — stocks, watchlist, alerts, Pattern Lab, Chart Sandbox, and the glossary. An account is only needed for the Time Machine simulator, whose saved runs and Hall of Fame have to live somewhere that survives a reinstall.",
      "If you create one, we store your email address. Passwords are handled by our authentication provider and stored hashed — we never see your plaintext password.",
      "Your onboarding preferences, watchlist, price alerts, and any charts you create in Chart Sandbox are stored locally on your device only, whether or not you have an account. Uninstalling the app removes them.",
      "Simulator runs are stored on our servers and tied to your account. Completed runs can appear on the Hall of Fame, which shows only the mode, start date, and percentage return — never your email or any identifying information.",
      "When you look up a stock, the app requests market data from our backend using the ticker symbol you're viewing — no personal identifiers attached to the lookup itself.",
      "You can ask us to delete your account and everything tied to it at any time via the support email on the Account tab.",
    ],
  },
  {
    heading: "What we don't do",
    paragraphs: [
      "No advertising or ad-tracking SDKs. No sale of data to third parties. No location tracking. No access to contacts, camera, or microphone.",
    ],
  },
  {
    heading: "No warranty & limitation of liability",
    paragraphs: [
      'Summit is provided "as is," without warranty of any kind. We don\'t guarantee the app will be uninterrupted, error-free, or available at all times.',
      "To the fullest extent permitted by law, Summit and its developer are not liable for any trading or investment losses, or any other damages, arising from your use of the app or reliance on information it presents.",
    ],
  },
  {
    heading: "Contact",
    paragraphs: ["Questions about these terms or privacy: summitaisupport@gmail.com"],
  },
];

export default function LegalScreen() {
  const { colors } = useTheme();

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Terms, Privacy & Disclaimers",
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
        <Text style={[typography.micro, styles.updated, { color: colors.textMuted }]}>
          Last updated: {LAST_UPDATED}
        </Text>
        {sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={[typography.sectionTitle, styles.heading, { color: colors.text }]}>
              {section.heading}
            </Text>
            {section.paragraphs.map((p, i) => (
              <Text key={i} style={[typography.body, styles.paragraph, { color: colors.textMuted }]}>
                {p}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40, paddingTop: 16 },
  updated: { marginBottom: 8 },
  section: { marginTop: 18 },
  heading: { marginBottom: 8 },
  paragraph: { lineHeight: 21, marginBottom: 10 },
});
