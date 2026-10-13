import type { ResolvedEmailTheme } from "../contracts/Theme.types.js";
export const corporateTheme: ResolvedEmailTheme = {
        preset: "corporate",
        appearance: { containerWidth: 600, contentPadding: 36, cardRadius: 10, buttonRadius: 6, cardPadding: 28, buttonPaddingY: 14, buttonPaddingX: 28 },

        colors: {
            primary: "#0f4c81",
            success: "#166534",
            warning: "#92400e",
            danger: "#b91c1c",
            secondary: "#334155",
            accent: "#dbeafe",
            background: "#f8fafc",
            surface: "#ffffff",
            section: "#f1f5f9",
            text: "#0f172a",
            muted: "#64748b",
            border: "#cbd5e1",
        },

        typography: {
            fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif",
            headingFontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif",
            baseSize: 15,
            headingSize: 28,
            lineHeight: 1.5,
        },

        spacing: {
            xs: 4,
            sm: 10,
            md: 18,
            lg: 28,
            xl: 40,
        },
    };
