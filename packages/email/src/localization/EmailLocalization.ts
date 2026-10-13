import type { EmailDocument, EmailNode } from "@mailforge/core";

/** Localized content is treated as application-owned data, never executable code. */
export interface EmailTranslation {
    subject?: string;
    preheader?: string;
    nodes?: Record<string, string>;
}

export interface EmailLocalizationOptions {
    locale?: string;
    fallbackLocale?: string;
    direction?: "ltr" | "rtl";
}

export class EmailLocalizationError extends Error {
    public readonly code = "EMAIL_LOCALIZATION_INVALID";
    constructor(public readonly field: string, message: string) {
        super(`Invalid MailForge localization at "${field}": ${message}`);
        this.name = "EmailLocalizationError";
    }
}

const RTL_LANGUAGES = new Set(["ar", "fa", "he", "ur", "ps", "sd", "yi", "dv"]);
const TEMPLATE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/;
const NODE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,199}$/;
const LOCALE = /^[a-z]{2,3}(?:-[a-zA-Z0-9]{2,8}){0,4}$/i;
const KEYS = new Set(["subject", "preheader", "nodes"]);
const DANGEROUS = new Set(["__proto__", "constructor", "prototype"]);

function plain(value: unknown): value is Record<string, unknown> {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    const proto = Object.getPrototypeOf(value);
    return proto === null || proto === Object.prototype;
}

export function normalizeEmailLocale(locale: string): string {
    if (typeof locale !== "string" || locale.length > 35 || !LOCALE.test(locale)) {
        throw new EmailLocalizationError("locale", "expected a valid language tag");
    }
    try {
        const canonical = Intl.getCanonicalLocales(locale)[0];
        if (!canonical || !LOCALE.test(canonical)) throw new Error("Invalid locale");
        return canonical;
    } catch {
        throw new EmailLocalizationError("locale", "unsupported language tag");
    }
}

export function resolveEmailDirection(locale: string, direction?: "ltr" | "rtl"): "ltr" | "rtl" {
    if (direction !== undefined && direction !== "ltr" && direction !== "rtl") {
        throw new EmailLocalizationError("direction", "must be ltr or rtl");
    }
    if (direction) return direction;
    return RTL_LANGUAGES.has(normalizeEmailLocale(locale).split("-")[0]!.toLowerCase()) ? "rtl" : "ltr";
}

function checkedText(value: unknown, field: string, max: number): string {
    if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) {
        throw new EmailLocalizationError(field, `must be nonempty text, at most ${max} characters, without control characters`);
    }
    return value;
}

function validateTranslation(input: EmailTranslation): EmailTranslation {
    if (!plain(input)) throw new EmailLocalizationError("translation", "must be a plain object");
    for (const key of Object.keys(input)) {
        if (!KEYS.has(key)) throw new EmailLocalizationError(`translation.${key}`, "unknown field");
    }
    const result: EmailTranslation = {};
    if (input.subject !== undefined) result.subject = checkedText(input.subject, "subject", 200);
    if (input.preheader !== undefined) result.preheader = checkedText(input.preheader, "preheader", 300);
    if (input.nodes !== undefined) {
        if (!plain(input.nodes) || Object.keys(input.nodes).length > 200) {
            throw new EmailLocalizationError("nodes", "must have no more than 200 string entries");
        }
        const entries: Record<string, string> = Object.create(null) as Record<string, string>;
        for (const [id, text] of Object.entries(input.nodes)) {
            if (!NODE_ID.test(id) || DANGEROUS.has(id)) throw new EmailLocalizationError("nodes", `invalid node ID: ${id}`);
            entries[id] = checkedText(text, `nodes.${id}`, 8192);
        }
        result.nodes = entries;
    }
    return result;
}

/** Stores independent translations per MailForgeEmail instance. */
export class EmailLocalizationRegistry {
    private readonly translations = new Map<string, Map<string, EmailTranslation>>();

    public register(locale: string, templateId: string, translation: EmailTranslation): this {
        const canonical = normalizeEmailLocale(locale);
        if (typeof templateId !== "string" || !TEMPLATE_ID.test(templateId) || DANGEROUS.has(templateId)) {
            throw new EmailLocalizationError("templateId", "invalid template ID");
        }
        const safe = validateTranslation(translation);
        const bucket = this.translations.get(canonical) ?? new Map<string, EmailTranslation>();
        if (bucket.has(templateId)) throw new EmailLocalizationError("translation", `already registered: ${templateId}@${canonical}`);
        if (!this.translations.has(canonical) && this.translations.size >= 100) {
            throw new EmailLocalizationError("locale", "maximum number of locales exceeded");
        }
        if (bucket.size >= 200) throw new EmailLocalizationError("translation", "too many templates for one locale");
        bucket.set(templateId, structuredClone(safe));
        this.translations.set(canonical, bucket);
        return this;
    }

    public list(locale?: string): Array<{locale: string; templateId: string}> {
        const requested = locale === undefined ? undefined : normalizeEmailLocale(locale);
        const output: Array<{locale: string; templateId: string}> = [];
        for (const [key, templates] of this.translations) {
            if (requested !== undefined && requested !== key) continue;
            for (const templateId of templates.keys()) output.push({ locale: key, templateId });
        }
        return output.sort((a,b) => `${a.locale}/${a.templateId}`.localeCompare(`${b.locale}/${b.templateId}`));
    }

    public resolve(locale: string, templateId: string, fallbackLocale = "en"): EmailTranslation {
        const wanted = normalizeEmailLocale(locale);
        const fallback = normalizeEmailLocale(fallbackLocale);
        const base = (value: string) => value.split("-")[0]!;
        const candidates = [base(fallback), fallback, base(wanted), wanted];
        const merged: EmailTranslation = {};
        const nodes: Record<string, string> = Object.create(null) as Record<string, string>;
        for (const key of new Set(candidates)) {
            const value = this.translations.get(key)?.get(templateId);
            if (!value) continue;
            if (value.subject !== undefined) merged.subject = value.subject;
            if (value.preheader !== undefined) merged.preheader = value.preheader;
            Object.assign(nodes, value.nodes ?? {});
        }
        if (Object.keys(nodes).length > 0) merged.nodes = nodes;
        return structuredClone(merged);
    }
}

/** Apply translations to existing stable node IDs. No HTML strings or unsafe CSS are introduced. */
export function localizeEmailDocument(
    source: EmailDocument,
    locale: string,
    translation: EmailTranslation = {},
    options: {direction?: "ltr" | "rtl"; allowVariables?: boolean} = {},
): EmailDocument {
    const canonical = normalizeEmailLocale(locale);
    const safe = validateTranslation(translation);
    const output = structuredClone(source);
    output.locale = canonical;
    output.direction = resolveEmailDirection(canonical, options.direction);
    if (safe.subject !== undefined) output.subject = safe.subject;
    if (safe.preheader !== undefined) output.preheader = safe.preheader;
    const remaining = new Map(Object.entries(safe.nodes ?? {}));
    const visit = (node: EmailNode): void => {
        if (remaining.has(node.id)) {
            const replacement = remaining.get(node.id)!;
            if (typeof node.props?.text !== "string") {
                throw new EmailLocalizationError("nodes", `node is not translatable text: ${node.id}`);
            }
            node.props.text = replacement;
            remaining.delete(node.id);
        }
        node.children?.forEach(visit);
    };
    if (output.header) visit(output.header);
    output.body.forEach(visit);
    if (output.footer) visit(output.footer);
    if (output.copyright) visit(output.copyright);
    if (remaining.size > 0) {
        throw new EmailLocalizationError("nodes", `unknown node ID: ${remaining.keys().next().value}`);
    }
    if (options.allowVariables === false) {
        const text = [safe.subject ?? "", safe.preheader ?? "", ...Object.values(safe.nodes ?? {})].join(" ");
        if (/{{[^{}]*}}/.test(text)) {
            throw new EmailLocalizationError("translation", "variables are unavailable for already-materialized templates");
        }
    }
    return output;
}

/** Uses native Intl, with UTC as the deterministic default for stored dates. */
export function formatEmailDate(value: Date | string | number, locale: string, options: Intl.DateTimeFormatOptions = {}): string {
    const language = normalizeEmailLocale(locale);
    const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
    if (!Number.isFinite(date.getTime())) throw new EmailLocalizationError("date", "invalid date");
    try { return new Intl.DateTimeFormat(language, { timeZone: "UTC", ...options }).format(date); }
    catch { throw new EmailLocalizationError("date", "invalid formatting options"); }
}

export function formatEmailCurrency(amount: number, currency: string, locale: string): string {
    const language = normalizeEmailLocale(locale);
    if (typeof amount !== "number" || !Number.isFinite(amount)) throw new EmailLocalizationError("amount", "must be finite");
    if (typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)) {
        throw new EmailLocalizationError("currency", "must be a three-letter uppercase ISO currency code");
    }
    try { return new Intl.NumberFormat(language, { style: "currency", currency }).format(amount); }
    catch { throw new EmailLocalizationError("currency", "unsupported currency"); }
}

export function formatEmailNumber(value: number, locale: string, options: Intl.NumberFormatOptions = {}): string {
    const language = normalizeEmailLocale(locale);
    if (typeof value !== "number" || !Number.isFinite(value)) throw new EmailLocalizationError("value", "must be finite");
    try { return new Intl.NumberFormat(language, options).format(value); }
    catch { throw new EmailLocalizationError("number", "invalid formatting options"); }
}
