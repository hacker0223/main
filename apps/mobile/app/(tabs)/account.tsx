import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../src/components/Button";
import { PageTitle } from "../../src/components/PageTitle";
import { Screen } from "../../src/components/Screen";
import { SectionHeading } from "../../src/components/SectionHeading";
import { typography } from "../../src/theme/typography";
import type { ThemeColors } from "../../src/theme/colors";
import { useOnboardingStore } from "../../src/store/onboardingStore";
import { useTheme } from "../../src/theme/useTheme";

const investorTypeLabels: Record<string, string> = {
  casual: "Casual investor",
  active_trader: "Active / swing trader",
  long_term: "Long-term / fundamentals investor",
};

const SUPPORT_EMAIL = "summitsupport@gmail.com"; // same contact as docs/terms.html & docs/privacy.html

const supportRows: { icon: keyof typeof Ionicons.glyphMap; label: string; route?: string; email?: boolean }[] = [
  { icon: "school-outline", label: "Learn", route: "/learn" },
  { icon: "help-circle-outline", label: "Help & Support", email: true },
  { icon: "document-text-outline", label: "Terms, Privacy & Disclaimers", route: "/legal" },
  { icon: "information-circle-outline", label: "About Summit", route: "/about" },
];

export default function AccountScreen() {
  const { colors } = useTheme();
  const answers = useOnboardingStore((s) => s.answers);
  const reset = useOnboardingStore((s) => s.reset);

  const restartOnboarding = async () => {
    await reset();
    router.replace("/(onboarding)/welcome");
  };

  const contactSupport = () =>
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Summit%20support`).catch(() =>
      // No mail app configured (common on simulators/desktops) — still
      // give the user the address instead of failing silently.
      Alert.alert("Contact support", `Email us at ${SUPPORT_EMAIL}`)
    );

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <PageTitle>Account</PageTitle>

        <SectionHeading title="Your profile" />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Row label="Investor type" value={investorTypeLabels[answers.investorType]} colors={colors} />
          <Row
            label="Interests"
            value={answers.interests.length ? answers.interests.join(", ") : "None selected"}
            colors={colors}
          />
          <Row label="Risk tolerance" value={answers.riskTolerance ?? "Not set"} colors={colors} last />
        </View>

        <SectionHeading title="Support" />
        <View style={[styles.card, styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {supportRows.map((row, i) => (
            <ListRow
              key={row.label}
              icon={row.icon}
              label={row.label}
              onPress={() => (row.route ? router.push(row.route) : contactSupport())}
              colors={colors}
              last={i === supportRows.length - 1}
            />
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[typography.micro, styles.disclaimer, { color: colors.textMuted }]}>
            Not financial advice. For informational and educational purposes only. Summit is
            not a registered investment adviser or broker-dealer and does not execute trades.
            Summit is not responsible for any trading or investment outcome — every investment
            decision is yours alone, and you should do your own research or consult a licensed
            professional before acting on anything in this app.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button label="Restart onboarding" variant="secondary" onPress={restartOnboarding} />
        </View>

        <Text style={[typography.micro, styles.version, { color: colors.textMuted }]}>Summit v0.0.1</Text>
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value, colors, last }: { label: string; value: string; colors: ThemeColors; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowDivider, { borderColor: colors.border }]}>
      <Text style={[typography.caption, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[typography.cardTitle, styles.rowValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function ListRow({
  icon,
  label,
  value,
  onPress,
  colors,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
  colors: ThemeColors;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.listRow,
        !last && styles.rowDivider,
        { borderColor: colors.border, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Ionicons name={icon} size={19} color={colors.textMuted} style={styles.listIcon} />
      <Text style={[typography.body, styles.listLabel, { color: colors.text }]}>{label}</Text>
      {value ? <Text style={[typography.caption, { color: colors.textMuted }]}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 32 },
  card: { padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 20 },
  listCard: { padding: 0, overflow: "hidden" },
  row: { paddingVertical: 10 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth },
  rowValue: { marginTop: 3 },
  listRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  listIcon: { width: 20 },
  listLabel: { flex: 1 },
  disclaimer: { lineHeight: 17 },
  actions: { marginTop: 4, marginBottom: 16 },
  version: { textAlign: "center" },
});
