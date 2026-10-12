
import sanitizeHtml from "sanitize-html";

export function escapeHtml(value: unknown): string {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function safeUrl(value: unknown): string {
    if (typeof value !== "string") {
        throw new Error("URL must be a string");
    }

    const url = new URL(value);

    if (!["https:", "http:"].includes(url.protocol)) {
        throw new Error("Unsafe URL protocol");
    }

    return url.toString();
}

export function safeRichHtml(html: string): string {
    return sanitizeHtml(html, {
        allowedTags: [
            "p", "b", "strong", "em", "i",
            "u", "span", "br", "div",
            "ul", "ol", "li", "a",
        ],
        allowedAttributes: {
            a: ["href", "title"],
            "*": ["title", "class", "data-*", "aria-*"],
        },
        allowedSchemes: ["https", "http", "mailto"],
        allowProtocolRelative: false,
        disallowedTagsMode: "completelyDiscard",
    });
}

const STYLE_ATTRIBUTES: Record<string, string> = {
    color: "color",
    backgroundColor: "background-color",
    fontSize: "font-size",
    fontWeight: "font-weight",
    fontFamily: "font-family",
    textAlign: "align",
    lineHeight: "line-height",
    padding: "padding",
    width: "width",
    height: "height",
    borderRadius: "border-radius",
};

export function mjmlStyles(
    styles: Record<string, string | number> = {},
): string {
    const attributes: string[] = [];

    for (const [key, value] of Object.entries(styles)) {
        const attr = STYLE_ATTRIBUTES[key];

        if (!attr) {
            throw new Error(`Unsupported style: ${key}`);
        }

        const formatted =
            typeof value === "number" &&
                ["fontSize", "lineHeight", "width", "height",
                    "padding", "borderRadius"].includes(key)
                ? `${value}px`
                : String(value);

        // Prevent markup injection through style properties.
        if (
            formatted.length > 256 ||
            /[<>"'`\\]/.test(formatted) ||
            /url\s*\(|expression\s*\(|@import/i.test(formatted)
        ) {
            throw new Error(`Unsafe style value: ${key}`);
        }

        attributes.push(
            `${attr}="${escapeHtml(formatted)}"`,
        );
    }

    return attributes.join(" ");
}
