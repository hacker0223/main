import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { typography } from "../theme/typography";
import { useTheme } from "../theme/useTheme";

export function PageTitle({
  subtitle,
  style,
  children,
}: PropsWithChildren<{ subtitle?: string; style?: ViewStyle }>) {
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, style]}>
      <Text style={[typography.pageTitle, { color: colors.text }]}>{children}</Text>
      {subtitle ? (
        <Text style={[typography.body, styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12, marginBottom: 20 },
  subtitle: { marginTop: 4 },
});
