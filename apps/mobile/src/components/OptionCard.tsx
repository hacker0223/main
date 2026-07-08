import { Pressable, StyleSheet, Text } from "react-native";
import { typography } from "../theme/typography";
import { useTheme } from "../theme/useTheme";

interface OptionCardProps {
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}

export function OptionCard({ title, description, selected, onPress }: OptionCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.base,
        {
          backgroundColor: colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: selected ? 2 : 1,
        },
      ]}
    >
      <Text style={[typography.cardTitle, { color: colors.text }]}>{title}</Text>
      {description ? (
        <Text style={[typography.caption, styles.description, { color: colors.textMuted }]}>
          {description}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  description: {
    marginTop: 4,
  },
});
