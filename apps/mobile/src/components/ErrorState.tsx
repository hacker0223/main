import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "./Button";
import { typography } from "../theme/typography";
import { useTheme } from "../theme/useTheme";

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <Ionicons name="cloud-offline-outline" size={32} color={colors.textMuted} />
      <Text style={[typography.cardTitle, styles.title, { color: colors.text }]}>
        Couldn't load this
      </Text>
      <Text style={[typography.caption, styles.message, { color: colors.textMuted }]}>{message}</Text>
      <View style={styles.cta}>
        <Button label="Try again" variant="secondary" onPress={onRetry} />
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
