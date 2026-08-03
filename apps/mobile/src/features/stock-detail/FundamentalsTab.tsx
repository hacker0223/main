import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ErrorState } from "../../components/ErrorState";
import { InfoDot } from "../../components/InfoDot";
import { Skeleton } from "../../components/Skeleton";
import { useFundamentals } from "../../hooks/useFundamentals";
import { typography } from "../../theme/typography";
import { useTheme } from "../../theme/useTheme";
import { formatCompactNumber } from "./format";
import type { InsiderTransaction } from "@summit/shared";

// Plain-English definitions looked up by line-item label (case-insensitive,
// partial match) so beginners can tap a "(i)" instead of guessing.
const LINE_DEFS: { match: string; def: string }[] = [
  { match: "revenue", def: "The total money a company brought in from sales before any costs — the “top line.” (Cost of Revenue is the direct cost of producing what it sold.)" },
  { match: "operating income", def: "Profit from the company's core business operations, before interest and taxes." },
  { match: "net income", def: "The bottom-line profit left after all costs, expenses, and taxes — what the company actually earned." },
  { match: "eps", def: "Earnings per share: the company's profit divided by its number of shares. The per-share slice of what it earned." },
  { match: "cash", def: "Cash and assets that can be turned into cash almost immediately — the company's most liquid resources." },
  { match: "total current assets", def: "Assets the company expects to convert to cash within a year (cash, inventory, receivables)." },
  { match: "total assets", def: "Everything the company owns that has value — current assets plus long-term ones like property and equipment." },
  { match: "current liabilities", def: "Debts and obligations the company must pay within a year." },
  { match: "liabilities", def: "Everything the company owes — its debts and obligations." },
];

function defForLabel(label: string): string | undefined {
  const lower = label.toLowerCase();
  return LINE_DEFS.find((d) => lower.includes(d.match))?.def;
}

function InfoHeading({ title, definition }: { title: string; definition: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.infoHeading}>
      <Text style={[typography.sectionTitle, { color: colors.text }]}>{title}</Text>
      <InfoDot title={title} definition={definition} size={17} />
    </View>
  );
}

export function FundamentalsTab({ symbol }: { symbol: string | undefined }) {
  const { colors } = useTheme();
  const fundamentals = useFundamentals(symbol);
  const [selectedInsider, setSelectedInsider] = useState<string | null>(null);

  if (fundamentals.loading) {
    return (
      <View>
        <Skeleton style={{ width: 140, height: 18, marginBottom: 12 }} />
        <Skeleton style={{ width: "100%", height: 220, borderRadius: 14, marginBottom: 24 }} />
        <Skeleton style={{ width: 140, height: 18, marginBottom: 12 }} />
        <Skeleton style={{ width: "100%", height: 180, borderRadius: 14 }} />
      </View>
    );
  }

  if (fundamentals.error) {
    return <ErrorState message={fundamentals.error} onRetry={fundamentals.refetch} />;
  }

  const data = fundamentals.data;
  if (!data) return null;

  return (
    <View>
      <View style={[styles.sourceNote, { backgroundColor: colors.surfaceRaised }]}>
        <Text style={[typography.micro, { color: colors.textMuted }]}>
          From {data.form} filed {new Date(data.filedDate).toLocaleDateString()}, fiscal year {data.fiscalYear}
          — pulled directly from SEC-reported figures, not estimates.
        </Text>
      </View>

      <InfoHeading
        title="Income statement"
        definition="A summary of the company's revenue, costs, and profit over a period — it answers “did the company make money, and how much?”"
      />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {data.incomeStatement.map((line, i) => (
          <Row
            key={line.label}
            label={line.label}
            definition={defForLabel(line.label)}
            value={line.label.includes("EPS") ? `$${line.value.toFixed(2)}` : `$${formatCompactNumber(line.value)}`}
            last={i === data.incomeStatement.length - 1}
            colors={colors}
          />
        ))}
      </View>

      <InfoHeading
        title="Balance sheet"
        definition="A snapshot of what the company owns (assets) and owes (liabilities) at a point in time. The difference between them is shareholders' equity."
      />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {data.balanceSheet.map((line, i) => (
          <Row
            key={line.label}
            label={line.label}
            definition={defForLabel(line.label)}
            value={`$${formatCompactNumber(line.value)}`}
            last={i === data.balanceSheet.length - 1}
            colors={colors}
          />
        ))}
      </View>

      {data.insiderTransactions.length > 0 ? (
        <>
          <InfoHeading
            title="Recent insider activity"
            definition="Buys and sells of the company's stock by its own executives, directors, or major shareholders — legally required to be disclosed to the SEC. It doesn't automatically signal anything (insiders sell for many ordinary reasons), but large or clustered activity can be worth a second look."
          />
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {data.insiderTransactions.slice(0, 6).map((t, i, arr) => (
              <Pressable
                key={`${t.name}-${t.transactionDate}-${i}`}
                onPress={() => setSelectedInsider(t.name)}
                style={({ pressed }) => [
                  styles.insiderRow,
                  i < arr.length - 1 ? styles.rowDivider : null,
                  { borderColor: colors.border, opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[typography.cardTitle, { color: colors.text }]}>{t.name}</Text>
                  <Text style={[typography.micro, { color: colors.textMuted }]}>
                    {new Date(t.transactionDate).toLocaleDateString()}
                  </Text>
                </View>
                <Text
                  style={[
                    typography.cardTitle,
                    { color: t.change >= 0 ? colors.positive : colors.negative },
                  ]}
                >
                  {t.change >= 0 ? "+" : ""}
                  {t.change.toLocaleString()} sh
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={styles.insiderChevron} />
              </Pressable>
            ))}
            <Text style={[typography.micro, styles.attribution, { color: colors.textMuted }]}>
              Tap a name to see their other disclosed activity in this stock. Publicly disclosed SEC filings —
              not investment advice.
            </Text>
          </View>
        </>
      ) : null}

      {selectedInsider ? (
        <InsiderProfileModal
          name={selectedInsider}
          allTransactions={data.insiderTransactions}
          onClose={() => setSelectedInsider(null)}
        />
      ) : null}
    </View>
  );
}

function InsiderProfileModal({
  name,
  allTransactions,
  onClose,
}: {
  name: string;
  allTransactions: InsiderTransaction[];
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const theirs = allTransactions.filter((t) => t.name === name);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={[styles.modalCard, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeaderRow}>
            <Text style={[typography.cardTitle, styles.modalTitle, { color: colors.text }]} numberOfLines={2}>
              {name}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          <Text style={[typography.micro, styles.modalNote, { color: colors.textMuted }]}>
            Every disclosed transaction by this person for this stock in the data currently loaded — not a
            full cross-company history, which isn't available from this data source.
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {theirs.map((t, i) => (
              <View
                key={`${t.transactionDate}-${i}`}
                style={[styles.insiderRow, i < theirs.length - 1 ? styles.rowDivider : null, { borderColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    {new Date(t.transactionDate).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={[typography.cardTitle, { color: t.change >= 0 ? colors.positive : colors.negative }]}>
                  {t.change >= 0 ? "+" : ""}
                  {t.change.toLocaleString()} sh
                </Text>
              </View>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Row({
  label,
  value,
  last,
  definition,
  colors,
}: {
  label: string;
  value: string;
  last: boolean;
  definition?: string;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <View style={[styles.row, !last && styles.rowDivider, { borderColor: colors.border }]}>
      <View style={styles.labelWrap}>
        <Text style={[typography.caption, { color: colors.textMuted }]}>{label}</Text>
        {definition ? <InfoDot title={label} definition={definition} /> : null}
      </View>
      <Text style={[typography.cardTitle, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  infoHeading: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 20, marginBottom: 10 },
  labelWrap: { flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 1 },
  sourceNote: { padding: 12, borderRadius: 10, marginBottom: 20 },
  card: { padding: 4, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, paddingHorizontal: 12 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth },
  insiderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, paddingHorizontal: 12 },
  insiderChevron: { marginLeft: 8 },
  attribution: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 10, lineHeight: 15 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modalCard: { borderRadius: 18, padding: 18, maxHeight: "70%" },
  modalHeaderRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 },
  modalTitle: { flex: 1 },
  modalNote: { marginBottom: 12, lineHeight: 15 },
});
