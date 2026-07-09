import { useState } from "react";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { ChartTimeframe } from "@summit/shared";
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CompanyLogo } from "../../src/components/CompanyLogo";
import { ErrorState } from "../../src/components/ErrorState";
import { PriceChange } from "../../src/components/PriceChange";
import { PriceChart, type ChartMode } from "../../src/components/PriceChart";
import { Screen } from "../../src/components/Screen";
import { SectionHeading } from "../../src/components/SectionHeading";
import { Skeleton } from "../../src/components/Skeleton";
import { StatGrid } from "../../src/components/StatGrid";
import { AIInsightsTab } from "../../src/features/stock-detail/AIInsightsTab";
import { FilingsTab } from "../../src/features/stock-detail/FilingsTab";
import { formatCompactNumber, formatPercent, formatRatio } from "../../src/features/stock-detail/format";
import { FundamentalsTab } from "../../src/features/stock-detail/FundamentalsTab";
import { PatternSignalCard } from "../../src/features/stock-detail/PatternSignalCard";
import { TechnicalsTab } from "../../src/features/stock-detail/TechnicalsTab";
import { useChart } from "../../src/hooks/useChart";
import { useNews } from "../../src/hooks/useNews";
import { useStockDetail } from "../../src/hooks/useStockDetail";
import { useWatchlistStore } from "../../src/store/watchlistStore";
import { typography } from "../../src/theme/typography";
import { useTheme } from "../../src/theme/useTheme";

const timeframes: ChartTimeframe[] = ["1D", "1W", "1M", "6M", "YTD", "1Y", "5Y", "MAX"];

const subTabs = [
  "Overview",
  "Fundamentals",
  "Technicals",
  "AI Insights",
  "News",
  "Filings",
  "Community",
] as const;

export default function StockDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const { colors } = useTheme();
  const [timeframe, setTimeframe] = useState<ChartTimeframe>("1D");
  const [chartMode, setChartMode] = useState<ChartMode>("line");
  const [subTab, setSubTab] = useState<(typeof subTabs)[number]>("Overview");

  const ticker = symbol?.toUpperCase();
  const detail = useStockDetail(ticker);
  const chart = useChart(ticker, timeframe);
  const watchlistSymbols = useWatchlistStore((s) => s.symbols);
  const toggleWatchlist = useWatchlistStore((s) => s.toggle);
  const inWatchlist = !!ticker && watchlistSymbols.includes(ticker);

  const notify = () => Alert.alert("Coming soon", "This isn't wired up yet.");

  return (
    <Screen style={styles.noPadding}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: ticker,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="chevron-back" size={26} color={colors.primary} />
            </Pressable>
          ),
        }}
      />

      {detail.error && !detail.data ? (
        <ErrorState message={detail.error} onRetry={detail.refetch} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            {detail.loading || !detail.data ? (
              <>
                <Skeleton style={{ width: 120, height: 14, marginBottom: 8 }} />
                <Skeleton style={{ width: 160, height: 34, marginBottom: 8 }} />
                <Skeleton style={{ width: 100, height: 16 }} />
              </>
            ) : (
              <>
                <CompanyLogo symbol={detail.data.quote.symbol} logoUrl={detail.data.quote.logoUrl} size={40} />
                <Text style={[typography.caption, styles.companyName, { color: colors.textMuted }]}>
                  {detail.data.quote.companyName}
                </Text>
                <Text style={[typography.display, styles.price, { color: colors.text }]}>
                  ${detail.data.quote.price.toFixed(2)}
                </Text>
                <PriceChange change={detail.data.quote.change} changePercent={detail.data.quote.changePercent} />
              </>
            )}
          </View>

          {chart.loading || !chart.data ? (
            <Skeleton style={{ width: "100%", height: 232, marginHorizontal: 20 }} />
          ) : chart.data.points.length === 0 ? (
            <View style={styles.chartEmpty}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                No chart data available for this range.
              </Text>
            </View>
          ) : (
            <PriceChart
              points={chart.data.points}
              isPositive={chart.data.points[chart.data.points.length - 1].close >= chart.data.points[0].open}
              mode={chartMode}
            />
          )}

          <View style={styles.chartControls}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeframeRow}>
              {timeframes.map((tf) => (
                <Pressable
                  key={tf}
                  onPress={() => setTimeframe(tf)}
                  style={[
                    styles.timeframePill,
                    { backgroundColor: tf === timeframe ? colors.primary : "transparent" },
                  ]}
                >
                  <Text
                    style={[
                      typography.caption,
                      styles.pillLabel,
                      { color: tf === timeframe ? colors.onPrimary : colors.textMuted },
                    ]}
                  >
                    {tf}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => setChartMode(chartMode === "line" ? "candle" : "line")}
              style={({ pressed }) => [
                styles.modeToggle,
                { borderColor: colors.border, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Ionicons
                name={chartMode === "line" ? "stats-chart-outline" : "trending-up-outline"}
                size={16}
                color={colors.text}
              />
            </Pressable>
          </View>

          <View style={styles.actionsRow}>
            <ActionButton
              label={inWatchlist ? "Watchlisted" : "Watchlist"}
              icon={inWatchlist ? "eye" : "eye-outline"}
              active={inWatchlist}
              onPress={() => ticker && toggleWatchlist(ticker)}
              colors={colors}
            />
            <ActionButton label="Set alert" icon="notifications-outline" onPress={notify} colors={colors} />
            <ActionButton label="Portfolio" icon="add-circle-outline" onPress={notify} colors={colors} />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subTabRow}>
            {subTabs.map((tab) => {
              const isAiTab = tab === "AI Insights";
              const isSelected = tab === subTab;
              const selectedColor = isAiTab ? colors.accent : colors.primary;
              const selectedTextColor = isAiTab ? colors.onAccent : colors.onPrimary;
              return (
                <Pressable
                  key={tab}
                  onPress={() => setSubTab(tab)}
                  style={[
                    styles.subTabPill,
                    {
                      borderColor: isSelected ? selectedColor : colors.border,
                      backgroundColor: isSelected ? selectedColor : colors.surface,
                    },
                  ]}
                >
                  {isAiTab ? (
                    <Ionicons
                      name="sparkles"
                      size={12}
                      color={isSelected ? selectedTextColor : colors.accent}
                      style={styles.pillIcon}
                    />
                  ) : null}
                  <Text
                    style={[
                      typography.caption,
                      styles.pillLabel,
                      { color: isSelected ? selectedTextColor : colors.text },
                    ]}
                  >
                    {tab}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.body}>
            {subTab === "Overview" ? (
              detail.loading || !detail.data ? (
                <OverviewSkeleton />
              ) : (
                <OverviewTab detail={detail.data} onOpenInsights={() => setSubTab("AI Insights")} />
              )
            ) : subTab === "News" ? (
              <NewsTab symbol={ticker} />
            ) : subTab === "Fundamentals" ? (
              <FundamentalsTab symbol={ticker} />
            ) : subTab === "Technicals" ? (
              <TechnicalsTab symbol={ticker} />
            ) : subTab === "AI Insights" ? (
              <AIInsightsTab symbol={ticker} keyStats={detail.data?.keyStats} />
            ) : subTab === "Filings" ? (
              <FilingsTab symbol={ticker} />
            ) : (
              <View style={styles.comingSoon}>
                <Ionicons name="people-outline" size={28} color={colors.textMuted} />
                <Text style={[typography.body, styles.comingSoonText, { color: colors.textMuted }]}>
                  Community discussion needs real user accounts first — coming after Auth is wired up.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  colors,
  active,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>["colors"];
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: active ? colors.primary : colors.surface,
          borderColor: active ? colors.primary : colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={18} color={active ? colors.onPrimary : colors.primary} />
      <Text style={[typography.micro, styles.actionLabel, { color: active ? colors.onPrimary : colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function OverviewSkeleton() {
  return (
    <View>
      <Skeleton style={{ width: 100, height: 20, marginBottom: 12 }} />
      <Skeleton style={{ width: "100%", height: 220, borderRadius: 14, marginBottom: 24 }} />
      <Skeleton style={{ width: 100, height: 20, marginBottom: 12 }} />
      <Skeleton style={{ width: "100%", height: 100, borderRadius: 14 }} />
    </View>
  );
}

function OverviewTab({
  detail,
  onOpenInsights,
}: {
  detail: NonNullable<ReturnType<typeof useStockDetail>["data"]>;
  onOpenInsights: () => void;
}) {
  const { colors } = useTheme();
  const { keyStats, analystConsensus } = detail;
  const totalVotes = analystConsensus ? analystConsensus.buy + analystConsensus.hold + analystConsensus.sell : 0;

  return (
    <View>
      <PatternSignalCard symbol={detail.quote.symbol} />

      <SectionHeading title="Key stats" />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 8 }]}>
        <StatGrid
          stats={[
            { label: "Market cap", value: `$${formatCompactNumber(keyStats.marketCap)}` },
            { label: "PE (TTM)", value: formatRatio(keyStats.peTrailing) },
            { label: "PE (Fwd)", value: formatRatio(keyStats.peForward) },
            { label: "EPS", value: keyStats.eps ? `$${keyStats.eps.toFixed(2)}` : "—" },
            { label: "Dividend yield", value: formatPercent(keyStats.dividendYield) },
            { label: "52-wk range", value: `$${keyStats.week52Low.toFixed(0)} – $${keyStats.week52High.toFixed(0)}` },
            { label: "Avg volume", value: formatCompactNumber(keyStats.avgVolume) },
            { label: "Beta", value: keyStats.beta ? keyStats.beta.toFixed(2) : "—" },
          ]}
        />
      </View>

      <SectionHeading title="About" />
      <View style={styles.chipRow}>
        <Chip label={detail.sector} />
      </View>
      <Text style={[typography.caption, styles.description, { color: colors.textMuted }]}>
        {detail.description}
      </Text>

      {analystConsensus ? (
        <>
          <SectionHeading title="Analyst consensus" />
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.consensusBar}>
              <View style={[styles.consensusSegment, { flex: analystConsensus.buy || 0.001, backgroundColor: colors.positive }]} />
              <View style={[styles.consensusSegment, { flex: analystConsensus.hold || 0.001, backgroundColor: colors.textMuted }]} />
              <View style={[styles.consensusSegment, { flex: analystConsensus.sell || 0.001, backgroundColor: colors.negative }]} />
            </View>
            <Text style={[typography.caption, styles.consensusLabel, { color: colors.textMuted }]}>
              {analystConsensus.buy} buy · {analystConsensus.hold} hold · {analystConsensus.sell} sell
              {totalVotes ? ` (${totalVotes} analysts)` : ""}
            </Text>
            <Text style={[typography.micro, styles.attribution, { color: colors.textMuted }]}>
              Third-party analyst data, not Summit's own recommendation.
            </Text>
          </View>
        </>
      ) : null}

      <View style={styles.aiSectionHeadingRow}>
        <Ionicons name="sparkles" size={15} color={colors.accent} />
        <Text style={[typography.sectionTitle, { color: colors.text }]}>Signal vs. Noise</Text>
      </View>
      <Pressable
        onPress={onOpenInsights}
        style={({ pressed }) => [
          styles.card,
          styles.aiCard,
          { backgroundColor: colors.accentSurface, borderColor: colors.accent, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Text style={[typography.body, styles.aiSummary, { color: colors.text }]}>
          Summit doesn't execute trades, so we have no incentive to get you to trade more. See the real risk score
          and probabilistic price range — built from this stock's own volatility and valuation, not a black-box
          prediction.
        </Text>
        <View style={styles.aiCta}>
          <Text style={[typography.caption, { color: colors.accent, fontWeight: "700" }]}>
            View risk score & range
          </Text>
          <Ionicons name="arrow-forward" size={14} color={colors.accent} />
        </View>
      </Pressable>
    </View>
  );
}

function NewsTab({ symbol }: { symbol: string | undefined }) {
  const { colors } = useTheme();
  const news = useNews(symbol);

  if (news.loading) {
    return (
      <View>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} style={{ width: "100%", height: 76, borderRadius: 14, marginBottom: 12 }} />
        ))}
      </View>
    );
  }

  if (news.error) {
    return <ErrorState message={news.error} onRetry={news.refetch} />;
  }

  if (!news.data || news.data.length === 0) {
    return (
      <View style={styles.comingSoon}>
        <Ionicons name="newspaper-outline" size={28} color={colors.textMuted} />
        <Text style={[typography.body, styles.comingSoonText, { color: colors.textMuted }]}>
          No recent news for this stock.
        </Text>
      </View>
    );
  }

  const openArticle = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert("Couldn't open link", "This article's link looks broken.");
    });
  };

  return (
    <View>
      {news.data.map((item) => (
        <Pressable
          key={item.headline + item.datetime}
          onPress={() => openArticle(item.url)}
          style={[styles.newsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <NewsThumbnail uri={item.image} />
          <View style={styles.newsText}>
            <Text style={[typography.cardTitle, { color: colors.text }]} numberOfLines={2}>
              {item.headline}
            </Text>
            <Text style={[typography.micro, styles.newsSource, { color: colors.textMuted }]}>
              {item.source} · {new Date(item.datetime * 1000).toLocaleDateString()}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function NewsThumbnail({ uri }: { uri?: string }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <View style={[styles.newsImage, styles.newsImageFallback, { backgroundColor: colors.surfaceRaised }]}>
        <Ionicons name="newspaper-outline" size={20} color={colors.textMuted} />
      </View>
    );
  }

  return <Image source={{ uri }} style={styles.newsImage} onError={() => setFailed(true)} />;
}

function Chip({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[typography.label, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  noPadding: { paddingHorizontal: 0 },
  scrollContent: { paddingBottom: 40 },
  header: { alignItems: "center", paddingTop: 8, paddingBottom: 16 },
  companyName: { marginTop: 10 },
  price: { marginVertical: 2 },
  chartEmpty: { height: 232, alignItems: "center", justifyContent: "center" },
  chartControls: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 12,
    gap: 8,
  },
  timeframeRow: { flex: 1, height: 36 },
  timeframePill: {
    paddingHorizontal: 12,
    height: 32,
    justifyContent: "center",
    borderRadius: 10,
    marginRight: 6,
  },
  modeToggle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pillLabel: { fontWeight: "600" },
  pillIcon: { marginRight: 5 },
  actionsRow: { flexDirection: "row", paddingHorizontal: 20, marginTop: 20, gap: 10 },
  actionButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  actionLabel: { fontWeight: "600" },
  subTabRow: { height: 40, paddingHorizontal: 20, marginTop: 24, flexGrow: 0 },
  subTabPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 36,
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  body: { paddingHorizontal: 20, marginTop: 20 },
  chipRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  description: { lineHeight: 20 },
  card: { padding: 16, borderRadius: 14, borderWidth: 1 },
  aiCard: { borderWidth: 1.5 },
  aiSectionHeadingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 20, marginBottom: 12 },
  consensusBar: { flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 10 },
  consensusSegment: { height: "100%" },
  consensusLabel: { marginBottom: 6 },
  attribution: { marginTop: 4 },
  aiSummary: { lineHeight: 21 },
  aiCta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  comingSoon: { paddingVertical: 60, alignItems: "center", gap: 10 },
  comingSoonText: { textAlign: "center" },
  newsCard: { flexDirection: "row", borderRadius: 14, borderWidth: 1, marginBottom: 12, overflow: "hidden" },
  newsImage: { width: 88, height: 76 },
  newsImageFallback: { alignItems: "center", justifyContent: "center" },
  newsText: { flex: 1, padding: 12, justifyContent: "center" },
  newsSource: { marginTop: 6 },
});
