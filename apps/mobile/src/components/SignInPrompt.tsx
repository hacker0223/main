import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "./Button";
import { typography } from "../theme/typography";
import { useTheme } from "../theme/useTheme";

// Being signed out isn't a failure — showing it with ErrorState's "Couldn't
// load this" + a red-tinted retry button reads as something being broken.
// This is the calm version: "sign in to continue," one button, no drama.
export function SignInPrompt({ message = "Sign in to continue." }: { message?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <Ionicons name="person-circle-outline" size={32} color={colors.textMuted} />
      <Text style={[typography.cardTitle, styles.title, { color: colors.text }]}>Sign in required</Text>
      <Text style={[typography.caption, styles.message, { color: colors.textMuted }]}>{message}</Text>
      <View style={styles.cta}>
        <Button label="Go to Account" onPress={() => router.push("/(tabs)/account")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 },
  title: { marginTop: 12, marginBottom: 4 },
  message: { textAlign: "center", marginBottom: 16 },
  cta: { minWidth: 160 },
});
