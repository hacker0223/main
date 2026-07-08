import type { TextStyle } from "react-native";

type TypeToken = Pick<TextStyle, "fontSize" | "fontWeight" | "lineHeight" | "letterSpacing">;

export const typography: Record<
  "display" | "pageTitle" | "sectionTitle" | "cardTitle" | "body" | "caption" | "label" | "micro",
  TypeToken
> = {
  display: { fontSize: 32, fontWeight: "700", lineHeight: 38 },
  pageTitle: { fontSize: 28, fontWeight: "700", lineHeight: 34 },
  sectionTitle: { fontSize: 17, fontWeight: "700", lineHeight: 22 },
  cardTitle: { fontSize: 15, fontWeight: "600", lineHeight: 20 },
  body: { fontSize: 14, fontWeight: "400", lineHeight: 20 },
  caption: { fontSize: 13, fontWeight: "400", lineHeight: 18 },
  label: { fontSize: 12, fontWeight: "600", lineHeight: 16, letterSpacing: 0.2 },
  micro: { fontSize: 11, fontWeight: "500", lineHeight: 15 },
};
