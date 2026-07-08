export const colors = {
  light: {
    background: "#F5F6F8",
    surface: "#FFFFFF",
    surfaceRaised: "#FFFFFF",
    text: "#0B0E14",
    textMuted: "#6B7280",
    border: "#E5E7EB",
    primary: "#2563EB",
    onPrimary: "#FFFFFF",
    accent: "#C8860D",
    onAccent: "#FFFFFF",
    accentSurface: "#FBF1DD",
    positive: "#12A150",
    negative: "#DC2626",
  },
  dark: {
    background: "#08090B",
    surface: "#161820",
    surfaceRaised: "#1E212B",
    text: "#F5F6F8",
    textMuted: "#8B92A0",
    border: "#262A35",
    primary: "#4C8DFF",
    onPrimary: "#08090B",
    accent: "#F2B84B",
    onAccent: "#08090B",
    accentSurface: "#2B2213",
    positive: "#22C55E",
    negative: "#EF4444",
  },
} as const;

export type ThemeColors = { [K in keyof (typeof colors)["light"]]: string };
