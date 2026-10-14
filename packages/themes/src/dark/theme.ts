import type { ResolvedEmailTheme } from "../contracts/Theme.types.js";

/**
 * Production-ready Dark Theme for MailForge.
 * Designed specifically for email clients supporting dark mode and high-contrast accessibility.
 */
export const darkTheme: ResolvedEmailTheme = {
  preset: "dark",

  colors: {
    primary: "#818cf8",
    secondary: "#a5b4fc",
    accent: "#6366f1",
    success: "#34d399",
    warning: "#fbbf24",
    danger: "#f87171",
    background: "#0f172a",
    surface: "#1e293b",
    section: "#334155",
    text: "#f8fafc",
    muted: "#94a3b8",
    border: "#475569",
  },

  typography: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    headingFontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    baseSize: 15,
    headingSize: 28,
    lineHeight: 1.6,
  },

  appearance: {
    containerWidth: 600,
    contentPadding: 32,
    cardRadius: 12,
    buttonRadius: 8,
    cardPadding: 24,
    buttonPaddingY: 14,
    buttonPaddingX: 24,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
};

/**
 * Returns a cloned copy of the dark theme.
 */
export function getDarkTheme(): ResolvedEmailTheme {
  return structuredClone(darkTheme);
}
