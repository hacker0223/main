import { router } from "expo-router";
import { View } from "react-native";
import { EmptyState } from "../../src/components/EmptyState";
import { PageTitle } from "../../src/components/PageTitle";
import { Screen } from "../../src/components/Screen";

export default function PortfolioScreen() {
  return (
    <Screen>
      <PageTitle>Portfolio</PageTitle>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <EmptyState
          icon="briefcase-outline"
          title="No holdings yet"
          description="Manual portfolio tracking (shares, cost basis, purchase date) is coming soon. For now, use Watchlist to keep an eye on stocks you're interested in."
          ctaLabel="Explore stocks"
          onPressCta={() => router.push("/(tabs)/discover")}
        />
      </View>
    </Screen>
  );
}
