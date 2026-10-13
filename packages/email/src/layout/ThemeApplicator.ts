import type { EmailDocument, EmailNode } from "@mailforge/core";
import type { ResolvedEmailTheme } from "../theme/Theme.types.js";

type Styles = NonNullable<EmailNode["styles"]>;
const STRUCTURAL = new Set(["section", "row", "container", "header", "footer"]);

/** Semantic defaults are deliberately MJML-safe: no margins, flexbox or CSS grid. */
function roleStyles(role: string | undefined, theme: ResolvedEmailTheme): Styles {
  const { colors, typography, spacing, appearance } = theme;
  const inset = appearance.contentPadding;
  const text = { fontFamily: typography.fontFamily, color: colors.text };
  switch (role) {
    case "title": return {
      ...text, fontFamily: typography.headingFontFamily,
      fontWeight: "bold", fontSize: typography.headingSize,
      lineHeight: `${Math.round(typography.headingSize * 1.26)}px`,
      padding: `${spacing.lg}px ${inset}px ${spacing.sm}px`,
    };
    case "body": return {
      ...text, fontSize: Math.max(15, typography.baseSize),
      lineHeight: `${Math.round(Math.max(15, typography.baseSize) * typography.lineHeight)}px`,
      padding: `0 ${inset}px ${spacing.md}px`,
    };
    case "muted": return {
      ...text, color: colors.muted,
      fontSize: Math.max(12, typography.baseSize - 1),
      lineHeight: `${Math.round(Math.max(12, typography.baseSize - 1) * 1.6)}px`,
      padding: `0 ${inset}px ${spacing.md}px`,
    };
    case "eyebrow": return {
      ...text, color: colors.primary, fontSize: 12,
      fontWeight: "bold", letterSpacing: "1px", lineHeight: "18px",
      padding: `${spacing.lg}px ${inset}px 0`,
    };
    case "primary-action": return {
      backgroundColor: colors.primary, color: buttonTextColor(colors.primary), fontFamily: typography.fontFamily,
      fontSize: Math.max(14, typography.baseSize), fontWeight: "bold",
      borderRadius: `${appearance.buttonRadius}px`, textAlign: "center",
      innerPadding: `${appearance.buttonPaddingY}px ${appearance.buttonPaddingX}px`, padding: `${spacing.md}px ${inset}px ${spacing.xl}px`,
    };
    case "quiet-action": return {
      backgroundColor: colors.surface, color: colors.muted,
      fontFamily: typography.fontFamily, fontSize: Math.max(12, typography.baseSize - 1),
      textDecoration: "underline", textAlign: "center", borderRadius: "0px",
      innerPadding: `${Math.max(6, spacing.sm)}px ${Math.max(8, spacing.md)}px`, padding: `0 ${inset}px ${spacing.lg}px`,
    };
    case "hero-title": return {
      ...text, fontFamily: typography.headingFontFamily,
      fontWeight: "bold", fontSize: typography.headingSize,
      lineHeight: `${Math.round(typography.headingSize * 1.24)}px`,
      textAlign: "center", padding: `${spacing.xl}px ${inset}px ${spacing.sm}px`,
    };
    case "hero-subtitle": return {
      ...text, color: colors.muted, fontSize: Math.max(15, typography.baseSize),
      lineHeight: `${Math.round(typography.baseSize * typography.lineHeight)}px`,
      textAlign: "center", padding: `0 ${inset}px ${spacing.lg}px`,
    };
    case "section-title": return {
      ...text, fontFamily: typography.headingFontFamily,
      fontSize: Math.max(18, typography.baseSize + 3), fontWeight: "bold",
      lineHeight: "1.35", padding: `${spacing.lg}px ${inset}px ${spacing.sm}px`,
    };
    case "brand-title": return {
      ...text, fontFamily: typography.headingFontFamily,
      fontSize: Math.max(17, Math.min(22, typography.headingSize - 5)),
      fontWeight: "bold", textAlign: "center",
      padding: `${spacing.sm}px 0 ${spacing.sm}px`,
    };
    case "brand-rule": return { color: colors.primary, padding: `${spacing.sm}px 0 0` };
    case "footer-note": return {
      ...text, color: colors.muted, fontSize: Math.max(12, typography.baseSize - 2),
      lineHeight: "1.6", textAlign: "center", padding: `0 0 ${spacing.sm}px`,
    };
    case "success-note":
    case "warning-note":
    case "danger-note": return {
      ...text,
      color: role === "success-note" ? colors.success : role === "warning-note" ? colors.warning : colors.danger,
      fontWeight: "bold", fontSize: Math.max(13, typography.baseSize - 1),
      lineHeight: "1.5", padding: `${spacing.sm}px ${inset}px`,
    };
    case "divider": return { color: colors.border, padding: `${spacing.sm}px ${inset}px` };
    case "panel-outer": return { padding: `${spacing.xs}px ${inset}px ${spacing.lg}px` };
    case "panel-inner": return {
      backgroundColor: colors.section,
      border: `1px solid ${colors.border}`,
      borderRadius: `${appearance.cardRadius}px`,
      padding: `${appearance.cardPadding}px`,
    };
    case "status-icon": return {
      backgroundColor: colors.section, color: colors.primary,
      fontSize: 26, fontWeight: "bold", textAlign: "center",
      padding: `${spacing.lg}px ${inset}px ${spacing.sm}px`,
    };
    case "promotional-code": return {
      backgroundColor: colors.section, color: colors.primary,
      fontWeight: "bold", fontSize: 28, textAlign: "center",
      lineHeight: "36px", padding: `${spacing.md}px ${inset}px`,
    };
    default: return {};
  }
}

/** Find a high-contrast text color for arbitrary validated brand colors. */
function buttonTextColor(background: string): string {
  const luminance = (hex: string): number => {
    const channels = [1, 3, 5].map(index => {
      const value = parseInt(hex.slice(index, index + 2), 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
  };
  const backgroundLuminance = luminance(background);
  const whiteContrast = 1.05 / (backgroundLuminance + 0.05);
  const darkContrast = (backgroundLuminance + 0.05) / 0.05;
  return whiteContrast >= darkContrast ? "#ffffff" : "#000000";
}

function defaultStyles(node: EmailNode, theme: ResolvedEmailTheme): Styles {
  const { colors, typography, spacing, appearance } = theme;
  const lineHeight = `${Math.round(typography.baseSize * typography.lineHeight)}px`;
  switch (node.type) {
    case "header":
    case "footer":
      if (node.children?.some(child => STRUCTURAL.has(child.type))) return {};
      return {
        backgroundColor: colors.surface,
        padding: node.type === "header"
          ? `${spacing.lg}px ${appearance.contentPadding}px ${spacing.md}px`
          : `${spacing.lg}px ${appearance.contentPadding}px ${spacing.sm}px`,
      };
    case "section":
    case "row": return { backgroundColor: colors.section, padding: `0 ${spacing.md}px` };
    case "heading": return {
      color: colors.text, fontFamily: typography.headingFontFamily,
      fontSize: Math.min(typography.headingSize, 32), fontWeight: "bold",
      lineHeight: "1.25", padding: `0 0 ${spacing.sm}px`,
    };
    case "text": return {
      color: colors.text, fontFamily: typography.fontFamily,
      fontSize: Math.max(14, typography.baseSize), lineHeight, padding: `0 0 ${spacing.md}px`,
    };
    case "copyright": return {
      color: colors.muted, fontFamily: typography.fontFamily,
      fontSize: Math.max(10, typography.baseSize - 2), textAlign: "center",
      padding: `${spacing.sm}px ${appearance.contentPadding}px ${spacing.lg}px`,
    };
    case "button": return {
      backgroundColor: colors.primary, color: buttonTextColor(colors.primary), fontFamily: typography.fontFamily,
      fontSize: Math.max(13, typography.baseSize - 1), fontWeight: "bold",
      borderRadius: `${appearance.buttonRadius}px`,
      innerPadding: `${appearance.buttonPaddingY}px ${appearance.buttonPaddingX}px`,
      textAlign: "center", padding: `${spacing.sm}px ${spacing.md}px`,
    };
    case "table": return { color: colors.text, fontFamily: typography.fontFamily, fontSize: Math.max(13, typography.baseSize - 1), padding: `${spacing.md}px ${appearance.contentPadding}px` };
    case "image": return { width: 140, padding: `${spacing.xs}px 0` };
    case "divider": return { color: colors.border, padding: `${spacing.sm}px` };
    case "spacer": return { height: `${spacing.md}px` };
    default: return {};
  }
}

/**
 * Styles precedence: generic theme < semantic template role < developer node styles.
 * This applies AFTER user document patches. Never mutate the caller's document.
 */
export function applyEmailTheme(source: EmailDocument, theme: ResolvedEmailTheme): EmailDocument {
  const document = structuredClone(source);
  const walk = (node: EmailNode, inPanel = false): void => {
    // Table-specific design tokens. Explicit cell colors always take precedence.
    if (node.type === "table") {
      node.props = {
        headerBackground: theme.colors.section,
        headerTextColor: theme.colors.text,
        textColor: theme.colors.text,
        stripeColor: theme.colors.background,
        borderColor: theme.colors.border,
        ...node.props,
      };
    }
    const role = node.attrs?.["data-mf-style"];
    const semantic: Styles = typeof role === "string" ? roleStyles(role, theme) : {};
    const defaults = defaultStyles(node, theme);
    if (inPanel && role !== "panel-inner" &&
        ["title", "body", "muted", "eyebrow", "primary-action", "quiet-action", "hero-title", "hero-subtitle", "section-title", "success-note", "warning-note", "danger-note"].includes(String(role))) {
      semantic.padding = `0 0 ${theme.spacing.sm}px`;
    }
    if (Object.keys(defaults).length || Object.keys(semantic).length) {
      node.styles = { ...defaults, ...semantic, ...node.styles };
    }
    node.children?.forEach(child => walk(child, inPanel || role === "panel-inner"));
  };
  if (document.header) walk(document.header);
  document.body.forEach(node => walk(node));
  if (document.footer) walk(document.footer);
  if (document.copyright) walk(document.copyright);
  return document;
}
