import { useState } from "react";
import { Pressable, StyleSheet, Text, type TextStyle } from "react-native";
import { typography } from "../theme/typography";
import { useTheme } from "../theme/useTheme";

// Long AI narration reads as a wall of text on a phone. This shows the first
// few lines and tucks the rest behind a "Show more" toggle, so the visual
// results (histograms, match lists) stay the star and the prose is opt-in.
export function CollapsibleText({
  text,
  collapsedLines = 3,
  style,
}: {
  text: string;
  collapsedLines?: number;
  style?: TextStyle;
}) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <Text
        style={[typography.body, styles.text, { color: colors.text }, style]}
        numberOfLines={expanded ? undefined : collapsedLines}
      >
        {text}
      </Text>
      <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={8}>
        <Text style={[typography.caption, styles.toggle, { color: colors.primary }]}>
          {expanded ? "Show less" : "Show more"}
        </Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  text: { marginTop: 10, lineHeight: 20 },
  toggle: { marginTop: 6, fontWeight: "600" },
});
