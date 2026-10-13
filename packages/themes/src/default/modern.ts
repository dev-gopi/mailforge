import type { ResolvedEmailTheme } from "../contracts/Theme.types.js";
export const modernTheme: ResolvedEmailTheme = {
        preset: "modern",

        colors: {
            primary: "#2563eb",
            success: "#15803d",
            warning: "#a16207",
            danger: "#b91c1c",
            secondary: "#475569",
            accent: "#dbeafe",
            background: "#f5f6f8",
            surface: "#ffffff",
            section: "#eff6ff",
            text: "#0f172a",
            muted: "#64748b",
            border: "#e5e7eb",
        },

        typography: {
            fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif",
            headingFontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif",
            baseSize: 14,
            headingSize: 28,
            lineHeight: 1.5,
        },

        appearance: { containerWidth: 600, contentPadding: 32, cardRadius: 12, buttonRadius: 8, cardPadding: 24, buttonPaddingY: 14, buttonPaddingX: 24 },

        spacing: {
            xs: 4,
            sm: 8,
            md: 16,
            lg: 24,
            xl: 32,
        },
    };
