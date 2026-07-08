import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { articles } from "../../src/features/learn/articles";
import { typography } from "../../src/theme/typography";
import { useTheme } from "../../src/theme/useTheme";

export default function ArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colors } = useTheme();
  const article = articles.find((a) => a.slug === slug);

  return (
    <Screen style={styles.noPadding}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="chevron-back" size={26} color={colors.primary} />
            </Pressable>
          ),
        }}
      />

      {!article ? (
        <View style={styles.notFound}>
          <Text style={[typography.body, { color: colors.text }]}>Couldn't find that article.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Text style={[typography.pageTitle, styles.title, { color: colors.text }]}>{article.title}</Text>
          <Text style={[typography.caption, styles.meta, { color: colors.textMuted }]}>
            {article.readMinutes} min read
          </Text>
          {article.body.map((paragraph, i) => (
            <Text key={i} style={[typography.body, styles.paragraph, { color: colors.text }]}>
              {paragraph}
            </Text>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  noPadding: { paddingHorizontal: 20 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingBottom: 48, paddingTop: 8 },
  title: { marginBottom: 6 },
  meta: { marginBottom: 20 },
  paragraph: { lineHeight: 23, marginBottom: 16 },
});
