import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../../src/theme/useTheme";

type IconName = keyof typeof Ionicons.glyphMap;

const tabIcons: Record<string, { active: IconName; inactive: IconName }> = {
  index: { active: "home", inactive: "home-outline" },
  discover: { active: "compass", inactive: "compass-outline" },
  watchlist: { active: "eye", inactive: "eye-outline" },
  learn: { active: "school", inactive: "school-outline" },
  account: { active: "person-circle", inactive: "person-circle-outline" },
};

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = tabIcons[route.name];
          const iconName = focused ? icons.active : icons.inactive;
          // Home sits in the middle of the bar and gets a raised, filled
          // "bubble" so it reads as the anchor tab rather than one of five
          // equal items.
          if (route.name === "index") {
            return (
              <View
                style={[
                  styles.homeBubble,
                  { backgroundColor: colors.primary, borderColor: colors.background, opacity: focused ? 1 : 0.6 },
                ]}
              >
                <Ionicons name={iconName} size={size + 2} color={colors.onPrimary} />
              </View>
            );
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="discover" options={{ title: "Discover" }} />
      <Tabs.Screen name="watchlist" options={{ title: "Watchlist" }} />
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="learn" options={{ title: "Learn" }} />
      <Tabs.Screen name="account" options={{ title: "Account" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  homeBubble: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -18,
    borderWidth: 4,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
