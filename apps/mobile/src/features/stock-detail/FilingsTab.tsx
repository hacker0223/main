import { Ionicons } from "@expo/vector-icons";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { Skeleton } from "../../components/Skeleton";
import { useFilings } from "../../hooks/useFilings";
import { typography } from "../../theme/typography";
import { useTheme } from "../../theme/useTheme";

const FORM_DESCRIPTIONS: Record<string, string> = {
  "10-K": "Annual report",
  "10-Q": "Quarterly report",
  "8-K": "Material event",
  "DEF 14A": "Proxy statement",
};

export function FilingsTab({ symbol }: { symbol: string | undefined }) {
  const { colors } = useTheme();
  const filings = useFilings(symbol);

  if (filings.loading) {
    return (
      <View>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} style={{ width: "100%", height: 60, borderRadius: 12, marginBottom: 10 }} />
        ))}
      </View>
    );
  }

  if (filings.error) {
    return <ErrorState message={filings.error} onRetry={filings.refetch} />;
  }

  if (!filings.data || filings.data.length === 0) {
    return (
      <EmptyState
        icon="document-text-outline"
        title="No recent filings"
        description="SEC filings for this stock will show up here once available."
      />
    );
  }

  const openFiling = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert("Couldn't open filing", "This SEC document link looks broken.");
    });
  };

  return (
    <View>
      <Text style={[typography.micro, styles.note, { color: colors.textMuted }]}>
        Direct from SEC EDGAR — the same public filings source regulators use.
      </Text>
      {filings.data.map((filing) => (
        <Pressable
          key={filing.url}
          onPress={() => openFiling(filing.url)}
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <View style={[styles.formBadge, { backgroundColor: colors.surfaceRaised }]}>
            <Text style={[typography.label, { color: colors.primary }]}>{filing.form}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.cardTitle, { color: colors.text }]}>
              {FORM_DESCRIPTIONS[filing.form] ?? filing.form}
            </Text>
            <Text style={[typography.micro, { color: colors.textMuted }]}>
              Filed {new Date(filing.filedDate).toLocaleDateString()}
            </Text>
          </View>
          <Ionicons name="open-outline" size={18} color={colors.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  note: { marginBottom: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  formBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
});
