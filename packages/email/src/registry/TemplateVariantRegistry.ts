import type { DocumentPatch } from "@mailforge/core";
import type { EmailLayoutOptions } from "../layout/Layout.types.js";
import type { ThemeOverrides } from "../theme/Theme.types.js";
import { mergeLayoutOverrides, mergeThemeOverrides } from "../presets/PresetMerge.js";

/** A named style/content variation; the template's input contract is unchanged. */
export interface TemplateVariantDefinition {
    readonly templateId: string;
    readonly id: string;
    /** Parent variation within the same template. Cycles are rejected. */
    readonly extends?: string;
    readonly themeProfile?: string;
    readonly theme?: ThemeOverrides;
    readonly layout?: EmailLayoutOptions;
    readonly patches?: readonly DocumentPatch[];
}
export type ResolvedTemplateVariant = Omit<TemplateVariantDefinition, "extends">;

export class TemplateVariantError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "TemplateVariantError";
    }
}

const IDENTIFIER = /^[a-z0-9][a-z0-9._-]{0,79}$/;
const MAX_VARIANTS = 500;

function assertDefinition(value: TemplateVariantDefinition): void {
    if (!IDENTIFIER.test(value.id) || !IDENTIFIER.test(value.templateId)) {
        throw new TemplateVariantError("Variant and template IDs must be lowercase identifiers");
    }
    if (value.extends !== undefined && !IDENTIFIER.test(value.extends)) {
        throw new TemplateVariantError("Invalid parent variant ID");
    }
    if (value.extends === value.id) {
        throw new TemplateVariantError("A variant cannot extend itself");
    }
    if (value.themeProfile !== undefined && !IDENTIFIER.test(value.themeProfile)) {
        throw new TemplateVariantError("Invalid theme profile name");
    }
    if (value.patches !== undefined && (!Array.isArray(value.patches) || value.patches.length > 100)) {
        throw new TemplateVariantError("A variant accepts at most 100 patches");
    }
}

export class TemplateVariantRegistry {
    private readonly items = new Map<string, TemplateVariantDefinition>();
    private key(templateId: string, id: string): string {
        return `${templateId}:${id}`;
    }

    public register(definition: TemplateVariantDefinition): this {
        assertDefinition(definition);
        const key = this.key(definition.templateId, definition.id);
        if (this.items.has(key)) {
            throw new TemplateVariantError(`Variant already exists: ${key}`);
        }
        if (this.items.size >= MAX_VARIANTS) {
            throw new TemplateVariantError(`Variant limit exceeded: ${MAX_VARIANTS}`);
        }
        // Validate ancestry against existing definitions before persisting.
        if (definition.extends !== undefined) {
            this.resolve(definition.templateId, definition.extends);
        }
        this.items.set(key, structuredClone(definition));
        return this;
    }

    public list(templateId?: string): TemplateVariantDefinition[] {
        return [...this.items.values()]
            .filter(item => templateId === undefined || item.templateId === templateId)
            .map(item => structuredClone(item))
            .sort((a, b) => this.key(a.templateId, a.id).localeCompare(this.key(b.templateId, b.id)));
    }

    public resolve(templateId: string, id: string): ResolvedTemplateVariant {
        const seen = new Set<string>();
        const ancestry: TemplateVariantDefinition[] = [];
        let current: string | undefined = id;
        while (current !== undefined) {
            const key = this.key(templateId, current);
            if (seen.has(key)) throw new TemplateVariantError(`Variant inheritance cycle: ${key}`);
            seen.add(key);
            const value = this.items.get(key);
            if (!value) throw new TemplateVariantError(`Variant not found: ${key}`);
            ancestry.unshift(value);
            current = value.extends;
        }
        const profile = [...ancestry].reverse().find(v => v.themeProfile !== undefined)?.themeProfile;
        return {
            templateId,
            id,
            ...(profile === undefined ? {} : { themeProfile: profile }),
            theme: mergeThemeOverrides(...ancestry.map(v => v.theme)),
            layout: mergeLayoutOverrides(...ancestry.map(v => v.layout)),
            patches: ancestry.flatMap(v => v.patches ?? []).map(p => structuredClone(p)),
        };
    }

    /** Portable JSON; the caller chooses filesystem/database storage. */
    public exportJSON(): string {
        return JSON.stringify({ schemaVersion: 1, variants: this.list() }, null, 2);
    }

    /** All-or-nothing import, with no callback or executable code deserialization. */
    public importJSON(json: string): this {
        if (json.length > 2_000_000) throw new TemplateVariantError("Variant JSON is too large");
        const parsed: unknown = JSON.parse(json);
        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new TemplateVariantError("Invalid variant export");
        }
        const record = parsed as Record<string, unknown>;
        if (record.schemaVersion !== 1 || !Array.isArray(record.variants)) {
            throw new TemplateVariantError("Unsupported variant export schema");
        }
        const rows = record.variants as unknown[];
        if (rows.length > MAX_VARIANTS) throw new TemplateVariantError("Variant limit exceeded");
        const temporary = new TemplateVariantRegistry();
        // Parent references may be ordered after children in an import file.
        const pending = rows.map((raw): TemplateVariantDefinition => {
            if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
                throw new TemplateVariantError("Invalid variant entry");
            }
            const item = raw as Record<string, unknown>;
            if (typeof item.templateId !== "string" || typeof item.id !== "string" ||
                (item.extends !== undefined && typeof item.extends !== "string") ||
                (item.themeProfile !== undefined && typeof item.themeProfile !== "string") ||
                (item.theme !== undefined && (item.theme === null || typeof item.theme !== "object" || Array.isArray(item.theme))) ||
                (item.layout !== undefined && (item.layout === null || typeof item.layout !== "object" || Array.isArray(item.layout)))) {
                throw new TemplateVariantError("Invalid variant entry fields");
            }
            const definition = raw as unknown as TemplateVariantDefinition;
            assertDefinition(definition);
            return definition;
        });
        for (const [key, value] of this.items) {
            temporary.items.set(key, structuredClone(value));
        }
        while (pending.length > 0) {
            let progressed = false;
            for (let i = pending.length - 1; i >= 0; i--) {
                const item = pending[i]!;
                const key = this.key(item.templateId, item.id);
                if (this.items.has(key)) {
                    throw new TemplateVariantError(`Variant already exists: ${key}`);
                }
                if (item.extends !== undefined && !temporary.items.has(this.key(item.templateId, item.extends))) continue;
                temporary.register(item);
                pending.splice(i, 1);
                progressed = true;
            }
            if (!progressed) throw new TemplateVariantError("Missing parent or cyclic variants in import");
        }
        // Existing versions never silently overwrite.
        if (this.items.size + rows.length > MAX_VARIANTS) {
            throw new TemplateVariantError("Variant limit exceeded");
        }
        for (const row of rows) {
            const definition = row as TemplateVariantDefinition;
            const key = this.key(definition.templateId, definition.id);
            this.items.set(key, structuredClone(temporary.items.get(key)!));
        }
        return this;
    }
}
