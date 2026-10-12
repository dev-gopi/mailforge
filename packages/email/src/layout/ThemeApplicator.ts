
import type {
    EmailDocument,
    EmailNode,
} from "@mailforge/core";

import type {
    ResolvedEmailTheme,
} from "../theme/Theme.types.js";

type EmailStyles = NonNullable<EmailNode["styles"]>;

const LAYOUT_CHILDREN = new Set([
    "section",
    "row",
    "container",
    "header",
    "footer",
]);

function defaultStyles(
    node: EmailNode,
    theme: ResolvedEmailTheme,
): EmailStyles {
    const { colors, typography, spacing } = theme;

    const lineHeight =
        `${Math.round(
            typography.baseSize * typography.lineHeight,
        )}px`;

    switch (node.type) {
        case "header":
            // MJML containers with nested sections must
            // not carry their own styles.
            if (node.children?.some(
                child => LAYOUT_CHILDREN.has(child.type),
            )) {
                return {};
            }

            return {
                backgroundColor: colors.surface,
                padding: `${spacing.lg}px`,
            };

        case "footer":
            if (node.children?.some(
                child => LAYOUT_CHILDREN.has(child.type),
            )) {
                return {};
            }

            return {
                backgroundColor: colors.background,
                padding: `${spacing.md}px`,
            };

        case "section":
        case "row":
            return {
                backgroundColor: colors.surface,
                padding: `${spacing.md}px`,
            };

        case "heading":
            return {
                color: colors.text,
                fontFamily: typography.headingFontFamily,
                fontSize: typography.headingSize,
                fontWeight: "bold",
                padding: `${spacing.sm}px`,
            };

        case "text":
            return {
                color: colors.text,
                fontFamily: typography.fontFamily,
                fontSize: typography.baseSize,
                lineHeight,
                padding: `${spacing.sm}px`,
            };

        case "copyright":
            return {
                color: colors.muted,
                fontFamily: typography.fontFamily,
                fontSize: Math.max(
                    10,
                    typography.baseSize - 2,
                ),
                textAlign: "center",
                padding: `${spacing.sm}px`,
            };

        case "button":
            return {
                backgroundColor: colors.primary,
                color: "#ffffff",
                fontFamily: typography.fontFamily,
                fontSize: typography.baseSize,
                borderRadius: "6px",
                padding: `${spacing.md}px`,
            };

        case "image":
            return {
                width: 140,
                padding: `${spacing.sm}px`,
            };

        case "divider":
            return {
                color: colors.border,
                padding: `${spacing.sm}px`,
            };

        case "spacer":
            return {
                height: `${spacing.md}px`,
            };

        default:
            return {};
    }
}

/**
 * Apply theme defaults without overwriting
 * explicitly defined developer styles.
 */
export function applyEmailTheme(
    source: EmailDocument,
    theme: ResolvedEmailTheme,
): EmailDocument {
    const document = structuredClone(source);

    const walk = (node: EmailNode): void => {
        const defaults = defaultStyles(node, theme);

        if (Object.keys(defaults).length > 0) {
            node.styles = {
                ...defaults,
                ...node.styles,
            };
        }

        node.children?.forEach(walk);
    };

    if (document.header) walk(document.header);
    document.body.forEach(walk);
    if (document.footer) walk(document.footer);
    if (document.copyright) walk(document.copyright);

    return document;
}
