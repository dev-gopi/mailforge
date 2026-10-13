import sanitizeHtml from "sanitize-html";

export function escapeHtml(value: unknown): string {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/** Only absolute HTTP(S) URLs are permitted for email links. */
export function safeUrl(value: unknown): string {
    if (typeof value !== "string" || value.length > 4096) {
        throw new Error("URL must be a string of at most 4096 characters");
    }
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        throw new Error("Invalid absolute URL");
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new Error("Unsafe URL protocol");
    }
    if (url.username || url.password) {
        throw new Error("URLs must not contain credentials");
    }
    return url.toString();
}

/** CID images are for attached images; inline data images are intentionally excluded. */
export function safeImageUrl(value: unknown): string {
    if (typeof value === "string" && /^cid:[a-z0-9][a-z0-9._@+-]*$/i.test(value)) {
        return value;
    }
    if (typeof value === "string" && /^data:image\/(png|jpeg|gif|webp);base64,/i.test(value)) {
        // Only permitted in trusted mode by the MJML renderer, and validated by core.
        return value;
    }
    return safeUrl(value);
}

export function safeRichHtml(html: string): string {
    return sanitizeHtml(html, {
        allowedTags: ["p", "b", "strong", "em", "i", "u", "span", "br", "div", "ul", "ol", "li", "a"],
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
    letterSpacing: "letter-spacing",
    padding: "padding",
    width: "width",
    height: "height",
    borderRadius: "border-radius",
    border: "border",
    innerPadding: "inner-padding",
    textDecoration: "text-decoration",
};

// MJML validates attributes per element. Do not emit CSS for unsupported targets.
const TARGET_STYLES: Record<string, readonly string[]> = {
    "mj-text": ["color", "backgroundColor", "fontSize", "fontWeight", "fontFamily", "textAlign", "lineHeight", "letterSpacing", "padding", "height", "textDecoration"],
    "mj-button": ["color", "backgroundColor", "fontSize", "fontWeight", "fontFamily", "textAlign", "lineHeight", "padding", "innerPadding", "width", "height", "borderRadius", "border", "textDecoration"],
    "mj-image": ["width", "height", "padding", "borderRadius", "textAlign"],
    "mj-section": ["backgroundColor", "padding", "textAlign"],
    "mj-column": ["backgroundColor", "width", "padding", "border", "borderRadius"],
    "mj-table": ["color", "fontSize", "fontWeight", "fontFamily", "textAlign", "lineHeight", "padding", "width"],
    "mj-divider": ["color", "padding", "width"],
    "mj-spacer": ["height", "padding"],
};

export function mjmlStyles(
    styles: Record<string, string | number> = {},
    target?: string,
): string {
    const attributes: string[] = [];
    for (const [key, value] of Object.entries(styles)) {
        const name = target === "mj-divider" && key === "color"
            ? "border-color"
            : STYLE_ATTRIBUTES[key];
        if (!name || (target && !TARGET_STYLES[target]?.includes(key))) {
            throw new Error(`Unsupported style '${key}' for ${target ?? "MJML"}`);
        }
        const formatted = typeof value === "number" &&
            ["fontSize", "lineHeight", "width", "height", "padding", "borderRadius"].includes(key)
            ? `${value}px`
            : String(value);
        if (formatted.length > 256 || /[<>"'`\\]/.test(formatted) || /url\s*\(|expression\s*\(|@import/i.test(formatted)) {
            throw new Error(`Unsafe style value: ${key}`);
        }
        attributes.push(`${name}="${escapeHtml(formatted)}"`);
    }
    return attributes.join(" ");
}
