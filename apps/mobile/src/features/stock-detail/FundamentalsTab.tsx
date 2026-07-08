import { StyleSheet, Text, View } from "react-native";
import { ErrorState } from "../../components/ErrorState";
import { SectionHeading } from "../../components/SectionHeading";
import { Skeleton } from "../../components/Skeleton";
import { useFundamentals } from "../../hooks/useFundamentals";
import { typography } from "../../theme/typography";
import { useTheme } from "../../theme/useTheme";
import { formatCompactNumber } from "./format";

export function FundamentalsTab({ symbol }: { symbol: string | undefined }) {
  const { colors } = useTheme();
  const fundamentals = useFundamentals(symbol);

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

      <SectionHeading title="Income statement" />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {data.incomeStatement.map((line, i) => (
          <Row
            key={line.label}
            label={line.label}
            value={line.label.includes("EPS") ? `$${line.value.toFixed(2)}` : `$${formatCompactNumber(line.value)}`}
            last={i === data.incomeStatement.length - 1}
            colors={colors}
          />
        ))}
      </View>

      <SectionHeading title="Balance sheet" />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {data.balanceSheet.map((line, i) => (
          <Row
            key={line.label}
            label={line.label}
            value={`$${formatCompactNumber(line.value)}`}
            last={i === data.balanceSheet.length - 1}
            colors={colors}
          />
        ))}
      </View>

      {data.insiderTransactions.length > 0 ? (
        <>
          <SectionHeading title="Recent insider activity" />
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {data.insiderTransactions.slice(0, 6).map((t, i, arr) => (
              <View
                key={`${t.name}-${t.transactionDate}-${i}`}
                style={[styles.insiderRow, i < arr.length - 1 ? styles.rowDivider : null, { borderColor: colors.border }]}
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
              </View>
            ))}
            <Text style={[typography.micro, styles.attribution, { color: colors.textMuted }]}>
              Publicly disclosed SEC filings — not investment advice.
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

function Row({
  label,
  value,
  last,
  colors,
}: {
  label: string;
  value: string;
  last: boolean;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <View style={[styles.row, !last && styles.rowDivider, { borderColor: colors.border }]}>
      <Text style={[typography.caption, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[typography.cardTitle, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sourceNote: { padding: 12, borderRadius: 10, marginBottom: 20 },
  card: { padding: 4, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, paddingHorizontal: 12 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth },
  insiderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, paddingHorizontal: 12 },
  attribution: { paddingHorizontal: 12, paddingBottom: 10 },
});
