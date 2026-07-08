import { useRef, useState } from "react";
import { router } from "expo-router";
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button } from "../../src/components/Button";
import { ProgressDots } from "../../src/components/ProgressDots";
import { Screen } from "../../src/components/Screen";
import { typography } from "../../src/theme/typography";
import { useTheme } from "../../src/theme/useTheme";

const { width } = Dimensions.get("window");

const slides = [
  {
    emoji: "📈",
    title: "Track any stock",
    body: "Search thousands of stocks and ETFs, and keep the ones you care about close.",
  },
  {
    emoji: "🤖",
    title: "AI-powered insights",
    body: "Plain-English summaries that explain what's moving a stock — not black-box predictions.",
  },
  {
    emoji: "🗂️",
    title: "One dashboard for everything",
    body: "Watchlist, portfolio, and news, all in a single clean view built for casual investors.",
  },
];

export default function Welcome() {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(next);
  };

  const isLast = index === slides.length - 1;

  const goNext = () => {
    if (isLast) {
      router.push("/(onboarding)/investor-type");
      return;
    }
    scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
    setIndex(index + 1);
  };

  return (
    <Screen style={styles.noPadding}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
      >
        {slides.map((slide) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            <Text style={styles.emoji}>{slide.emoji}</Text>
            <Text style={[typography.pageTitle, styles.title, { color: colors.text }]}>{slide.title}</Text>
            <Text style={[typography.body, styles.body, { color: colors.textMuted }]}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <ProgressDots total={slides.length} activeIndex={index} />
        <Button label={isLast ? "Get started" : "Next"} onPress={goNext} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  noPadding: { paddingHorizontal: 0 },
  slide: { alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  emoji: { fontSize: 64, marginBottom: 24 },
  title: { textAlign: "center", marginBottom: 12 },
  body: { textAlign: "center" },
  footer: { paddingHorizontal: 20, paddingBottom: 12 },
});
