
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
                padding: `${spacing.md}px ${spacing.md}px`,
            };

        case "footer":
            if (node.children?.some(
                child => LAYOUT_CHILDREN.has(child.type),
            )) {
                return {};
            }

            return {
                backgroundColor: colors.surface,
                padding: `${spacing.sm}px ${spacing.md}px`,
            };

        case "section":
        case "row":
            return {
                backgroundColor: colors.surface,
                padding: `0 ${spacing.md}px`,
            };

        case "heading":
            return {
                color: colors.text,
                fontFamily: typography.headingFontFamily,
                fontSize: Math.min(typography.headingSize, 24),
                fontWeight: "bold",
                lineHeight: "1.25",
                padding: `0 0 ${spacing.sm}px`,
            };

        case "text":
            return {
                color: colors.text,
                fontFamily: typography.fontFamily,
                fontSize: typography.baseSize,
                lineHeight,
                padding: `0 0 ${spacing.sm}px`,
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
                padding: `${spacing.xs}px ${spacing.sm}px`,
            };

        case "button":
            return {
                backgroundColor: colors.primary,
                color: "#ffffff",
                fontFamily: typography.fontFamily,
                fontSize: Math.max(13, typography.baseSize - 1),
                fontWeight: "bold",
                borderRadius: "6px",
                textAlign: "center",
                padding: `${spacing.sm + 1}px ${spacing.md}px`,
            };

        case "image":
            return {
                width: 140,
                padding: `${spacing.xs}px 0`,
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
