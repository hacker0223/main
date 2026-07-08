import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/useTheme";

export function CompanyLogo({ symbol, logoUrl, size = 36 }: { symbol: string; logoUrl?: string; size?: number }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);

  const showImage = logoUrl && !failed;
  const dimensionStyle = { width: size, height: size, borderRadius: size / 4 };

  if (showImage) {
    return (
      <Image
        source={{ uri: logoUrl }}
        style={[styles.image, dimensionStyle, { backgroundColor: colors.surfaceRaised }]}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View style={[styles.fallback, dimensionStyle, { backgroundColor: colors.surfaceRaised }]}>
      <Text style={[styles.initials, { color: colors.textMuted, fontSize: size * 0.38 }]}>
        {symbol.slice(0, 2)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {},
  fallback: { alignItems: "center", justifyContent: "center" },
  initials: { fontWeight: "700" },
});
