import type { ResolvedEmailTheme } from "../contracts/Theme.types.js";
export const minimalTheme: ResolvedEmailTheme = {
        preset: "minimal",
        appearance: { containerWidth: 600, contentPadding: 30, cardRadius: 4, buttonRadius: 4, cardPadding: 20, buttonPaddingY: 12, buttonPaddingX: 20 },

        colors: {
            primary: "#111827",
            success: "#166534",
            warning: "#92400e",
            danger: "#991b1b",
            secondary: "#4b5563",
            accent: "#e5e7eb",
            background: "#ffffff",
            surface: "#ffffff",
            section: "#f9fafb",
            text: "#111827",
            muted: "#6b7280",
            border: "#e5e7eb",
        },

        typography: {
            fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif",
            headingFontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif",
            baseSize: 14,
            headingSize: 24,
            lineHeight: 1.5,
        },

        spacing: {
            xs: 4,
            sm: 8,
            md: 14,
            lg: 20,
            xl: 28,
        },
    };
