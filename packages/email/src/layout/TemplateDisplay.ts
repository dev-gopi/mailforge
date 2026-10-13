import type { EmailDocument, EmailNode } from "@mailforge/core";

/** Per-render appearance and content controls. All fields are optional. */
export interface TemplateDisplayOptions {
    /** Hide every content heading (does not change the email subject). */
    heading?: boolean;
    /** Hide the company/header heading while keeping a supplied logo. */
    headerTitle?: boolean;
    /** Hide small category labels above a heading. */
    eyebrow?: boolean;
    /** Hide primary call-to-action buttons; quiet/unsubscribe links remain. */
    primaryAction?: boolean;
    /** Hide the entire footer for this render. */
    footer?: boolean;
    /** Hide the automatic or custom copyright node for this render. */
    copyright?: boolean;
    /** Hide particular components by their stable EmailNode.id. */
    hideIds?: readonly string[];
    /** Override the subject for this render without editing a template. */
    subject?: string;
    /** Override the preheader; null removes it entirely. */
    preheader?: string | null;
}

export class TemplateDisplayError extends Error {
    public readonly code = "EMAIL_DISPLAY_INVALID";
    constructor(public readonly field: string, message: string) {
        super(`Invalid MailForge display.${field}: ${message}`);
        this.name = "TemplateDisplayError";
    }
}

const OPTIONS = new Set([
    "heading", "headerTitle", "eyebrow", "primaryAction", "footer",
    "copyright", "hideIds", "subject", "preheader",
]);
const BOOLEANS = ["heading", "headerTitle", "eyebrow", "primaryAction", "footer", "copyright"] as const;

function validateText(value: unknown, key: string, max: number): string {
    if (typeof value !== "string" || !value.trim() || value.length > max || /\p{Cc}/u.test(value)) {
        throw new TemplateDisplayError(key, `must be non-empty text of at most ${max} characters, without control characters`);
    }
    return value.trim();
}

function validateOptions(input: TemplateDisplayOptions): ReadonlySet<string> {
    if (!input || typeof input !== "object" || Array.isArray(input) ||
        (Object.getPrototypeOf(input) !== Object.prototype && Object.getPrototypeOf(input) !== null)) {
        throw new TemplateDisplayError("options", "must be a plain object");
    }
    const options = input as Record<string, unknown>;
    for (const key of Object.keys(options)) {
        if (!OPTIONS.has(key)) throw new TemplateDisplayError(key, "unsupported option");
    }
    for (const key of BOOLEANS) {
        if (options[key] !== undefined && typeof options[key] !== "boolean") {
            throw new TemplateDisplayError(key, "must be boolean");
        }
    }
    if (options.subject !== undefined) validateText(options.subject, "subject", 200);
    if (options.preheader !== undefined && options.preheader !== null) {
        validateText(options.preheader, "preheader", 300);
    }
    if (options.hideIds === undefined) return new Set();
    if (!Array.isArray(options.hideIds) || options.hideIds.length > 200) {
        throw new TemplateDisplayError("hideIds", "must be an array of at most 200 node IDs");
    }
    const ids = new Set<string>();
    for (const id of options.hideIds as unknown[]) {
        if (typeof id !== "string" || !id.trim() || id.length > 200 || /\p{Cc}/u.test(id)) {
            throw new TemplateDisplayError("hideIds", "each ID must be a valid string of at most 200 characters");
        }
        if (ids.has(id)) throw new TemplateDisplayError("hideIds", `duplicate ID: ${id}`);
        ids.add(id);
    }
    return ids;
}

/**
 * Remove unwanted nodes before component expansion and styling.
 * The source and all of its nested node objects remain unchanged.
 * Hidden nodes are removed rather than hidden with CSS because email clients
 * do not consistently support display:none.
 */
export function applyTemplateDisplay(
    source: EmailDocument,
    options: TemplateDisplayOptions = {},
): EmailDocument {
    const hidden = validateOptions(options);
    const document = structuredClone(source);
    const seen = new Set<string>();
    const shouldHide = (node: EmailNode, region: "header" | "body" | "footer" | "copyright"): boolean => {
        if (hidden.has(node.id)) {
            seen.add(node.id);
            return true;
        }
        const role = node.attrs?.["data-mf-style"];
        if (region === "header" && options.headerTitle === false && node.type === "heading") return true;
        if (region === "body" && options.heading === false && (role === "title" || (node.type === "heading" && role !== "promotional-code"))) return true;
        if (options.eyebrow === false && role === "eyebrow") return true;
        if (options.primaryAction === false && role === "primary-action") return true;
        return false;
    };
    const filter = (nodes: readonly EmailNode[], region: "header" | "body" | "footer" | "copyright"): EmailNode[] => {
        const output: EmailNode[] = [];
        for (const node of nodes) {
            if (shouldHide(node, region)) continue;
            if (node.children) {
                const children = filter(node.children, region);
                // Don't leave empty layout structures after removing their final child.
                if (!children.length && node.children.length &&
                    ["header", "footer", "section", "row", "column", "container"].includes(node.type)) continue;
                output.push({ ...node, children });
            } else {
                output.push(node);
            }
        }
        return output;
    };
    const root = (value: EmailNode | undefined, region: "header" | "footer" | "copyright"): EmailNode | undefined => {
        if (!value) return undefined;
        return filter([value], region)[0];
    };
    document.header = root(document.header, "header");
    document.body = filter(document.body, "body");
    document.footer = options.footer === false ? undefined : root(document.footer, "footer");
    document.copyright = options.copyright === false ? undefined : root(document.copyright, "copyright");
    for (const id of hidden) {
        if (!seen.has(id)) throw new TemplateDisplayError("hideIds", `component not found: ${id}`);
    }
    if (options.subject !== undefined) document.subject = validateText(options.subject, "subject", 200);
    if (options.preheader === null) delete document.preheader;
    else if (options.preheader !== undefined) document.preheader = validateText(options.preheader, "preheader", 300);
    return document;
}
