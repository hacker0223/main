import { router } from "expo-router";
import { View } from "react-native";
import { EmptyState } from "../../src/components/EmptyState";
import { PageTitle } from "../../src/components/PageTitle";
import { Screen } from "../../src/components/Screen";

export default function WatchlistScreen() {
  return (
    <Screen>
      <PageTitle>Watchlist</PageTitle>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <EmptyState
          icon="eye-outline"
          title="Your watchlist is empty"
          description="Search for a stock and add it to your watchlist to track it here. Multiple named watchlists are coming soon."
          ctaLabel="Explore stocks"
          onPressCta={() => router.push("/(tabs)/discover")}
        />
      </View>
    </Screen>
  );
}
