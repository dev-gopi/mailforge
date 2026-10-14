import type {
    EmailDocument,
} from "../document/EmailDocument.js";
import type {
    EmailAttributeValue,
    EmailNode,
    EmailNodeValue,
} from "../document/EmailNode.js";

/** Safe, per-node overrides. Structure changes remain available through DocumentPatch. */
export interface EmailNodeOverrides {
    props?: Readonly<Record<string, EmailNodeValue>>;
    styles?: Readonly<Record<string, string | number>>;
    attrs?: Readonly<Record<string, EmailAttributeValue>>;
}

/**
 * Non-destructive, render-local customization for any EmailDocument, including
 * every built-in template. Precedence: byType < byRole < byId.
 * `byRole` uses the existing `data-mf-style` semantic attribute.
 */
export interface EmailDocumentOverrides {
    byType?: Readonly<Record<string, EmailNodeOverrides>>;
    byRole?: Readonly<Record<string, EmailNodeOverrides>>;
    byId?: Readonly<Record<string, EmailNodeOverrides>>;
}

export class EmailDocumentOverrideError extends Error {
    public readonly code = "EMAIL_OVERRIDE_INVALID";
    constructor(public readonly field: string, message: string) {
        super(`Invalid MailForge overrides.${field}: ${message}`);
        this.name = "EmailDocumentOverrideError";
    }
}

const MAX_SELECTORS = 200;
const MAX_FIELDS = 100;
const MAX_KEY_LENGTH = 200;
const MAX_STRING_LENGTH = 16_384;
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function plain(value: unknown): value is Record<string, unknown> {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    const proto: unknown = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

function checkKey(key: string, field: string): void {
    if (!key.trim() || key.length > MAX_KEY_LENGTH || /\p{Cc}/u.test(key) || FORBIDDEN_KEYS.has(key)) {
        throw new EmailDocumentOverrideError(field, `unsafe or invalid key: ${key}`);
    }
}

function validateValue(value: unknown, field: string, depth = 0): void {
    if (depth > 12) throw new EmailDocumentOverrideError(field, "nested value exceeds 12 levels");
    if (value === null || typeof value === "boolean") return;
    if (typeof value === "number" && Number.isFinite(value)) return;
    if (typeof value === "string" && value.length <= MAX_STRING_LENGTH) return;
    if (Array.isArray(value)) {
        if (value.length > MAX_FIELDS) throw new EmailDocumentOverrideError(field, "array is too large");
        value.forEach((part, index) => validateValue(part, `${field}[${index}]`, depth + 1));
        return;
    }
    if (plain(value)) {
        if (Object.keys(value).length > MAX_FIELDS) throw new EmailDocumentOverrideError(field, "object is too large");
        for (const [key, item] of Object.entries(value)) {
            checkKey(key, field);
            validateValue(item, `${field}.${key}`, depth + 1);
        }
        return;
    }
    throw new EmailDocumentOverrideError(field, "value must be finite JSON data");
}

function checkSelectors(
    value: unknown,
    field: "byType" | "byRole" | "byId",
): Map<string, EmailNodeOverrides> {
    if (value === undefined) return new Map();
    if (!plain(value)) throw new EmailDocumentOverrideError(field, "expected a plain object");
    const entries = Object.entries(value);
    if (entries.length > MAX_SELECTORS) throw new EmailDocumentOverrideError(field, `maximum ${MAX_SELECTORS} selectors`);
    const output = new Map<string, EmailNodeOverrides>();
    for (const [key, patch] of entries) {
        checkKey(key, field);
        if (!plain(patch)) throw new EmailDocumentOverrideError(`${field}.${key}`, "expected a plain object");
        for (const [part, values] of Object.entries(patch)) {
            if (part !== "props" && part !== "styles" && part !== "attrs") {
                throw new EmailDocumentOverrideError(`${field}.${key}.${part}`, "unsupported override field");
            }
            if (!plain(values)) throw new EmailDocumentOverrideError(`${field}.${key}.${part}`, "expected a plain object");
            if (Object.keys(values).length > MAX_FIELDS) throw new EmailDocumentOverrideError(`${field}.${key}.${part}`, "too many fields");
            for (const [name, val] of Object.entries(values)) {
                checkKey(name, `${field}.${key}.${part}`);
                const path = `${field}.${key}.${part}.${name}`;
                if (part === "styles" && !(typeof val === "string" || (typeof val === "number" && Number.isFinite(val)))) {
                    throw new EmailDocumentOverrideError(path, "expected a string or finite number");
                }
                if (part === "attrs" && !(typeof val === "string" || typeof val === "boolean" || (typeof val === "number" && Number.isFinite(val)))) {
                    throw new EmailDocumentOverrideError(path, "expected a string, boolean or finite number");
                }
                validateValue(val, path);
            }
        }
        output.set(key, patch as EmailNodeOverrides);
    }
    return output;
}

/**
 * Merge property, style and attribute overrides into a fresh document.
 * Existing node IDs and all document metadata remain unchanged.
 * Unknown byId selectors throw to detect typos; byType/byRole can be shared
 * safely across templates even when a specific type or role is absent.
 */
export function applyDocumentOverrides(
    source: EmailDocument,
    overrides: EmailDocumentOverrides = {},
): EmailDocument {
    if (!plain(overrides)) throw new EmailDocumentOverrideError("options", "expected a plain object");
    for (const key of Object.keys(overrides)) {
        if (key !== "byType" && key !== "byRole" && key !== "byId") {
            throw new EmailDocumentOverrideError(key, "unsupported override group");
        }
    }
    const byType = checkSelectors(overrides.byType, "byType");
    const byRole = checkSelectors(overrides.byRole, "byRole");
    const byId = checkSelectors(overrides.byId, "byId");
    const seen = new Set<string>();
    const document = structuredClone(source);
    const merge = (node: EmailNode, override: EmailNodeOverrides | undefined): void => {
        if (!override) return;
        if (override.props) node.props = { ...node.props, ...structuredClone(override.props) };
        if (override.styles) node.styles = { ...node.styles, ...structuredClone(override.styles) };
        if (override.attrs) node.attrs = { ...node.attrs, ...structuredClone(override.attrs) };
    };
    const walk = (node: EmailNode): void => {
        // Match roles before merging attrs, so a byId attribute change cannot
        // silently cause a different role override during this same pass.
        const role = node.attrs?.["data-mf-style"];
        const selectedRole = typeof role === "string" ? role : undefined;
        merge(node, byType.get(node.type));
        if (selectedRole !== undefined) merge(node, byRole.get(selectedRole));
        if (byId.has(node.id)) {
            seen.add(node.id);
            merge(node, byId.get(node.id));
        }
        node.children?.forEach(walk);
    };
    if (document.header) walk(document.header);
    document.body.forEach(walk);
    if (document.footer) walk(document.footer);
    if (document.copyright) walk(document.copyright);
    for (const id of byId.keys()) {
        if (!seen.has(id)) throw new EmailDocumentOverrideError(`byId.${id}`, "node ID not found");
    }
    return document;
}
