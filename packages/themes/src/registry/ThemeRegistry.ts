import { THEME_PRESET_NAMES } from "../presets/ThemePresets.js";
import { mergeEmailTheme, resolveEmailTheme } from "../resolver/ThemeResolver.js";
import { EmailThemeError } from "../contracts/Theme.types.js";
import type {
    ResolvedEmailTheme,
    ThemeOverrides,
    ThemePreset,
} from "../contracts/Theme.types.js";

/** A reusable, data-only theme definition, never executable CSS or JavaScript. */
export interface ThemeDefinition {
    name: string;
    extends?: string;
    overrides?: ThemeOverrides;
}

export interface ThemeImportOptions {
    /** Replace all custom definitions rather than rejecting name conflicts. */
    replace?: boolean;
}

const BUILT_INS: ReadonlySet<string> = new Set(THEME_PRESET_NAMES);
const NAME_RE = /^[a-z][a-z0-9-]{0,63}$/;
const DEFINITION_KEYS = new Set(["name", "extends", "overrides"]);

function record(value: unknown, label: string): Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new EmailThemeError(label, "must be a plain object");
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
        throw new EmailThemeError(label, "must be a plain object");
    }
    return value as Record<string, unknown>;
}

function name(value: unknown, field: string): string {
    if (typeof value !== "string" || !NAME_RE.test(value)) {
        throw new EmailThemeError(field, "must contain lowercase letters, digits or hyphens (1-64 chars; starts with a letter)");
    }
    return value;
}

function definition(input: unknown): ThemeDefinition {
    const value = record(input, "theme.definition");
    for (const key of Object.keys(value)) {
        if (!DEFINITION_KEYS.has(key)) {
            throw new EmailThemeError(`theme.definition.${key}`, "unknown definition field");
        }
    }
    const id = name(value.name, "theme.definition.name");
    if (BUILT_INS.has(id)) {
        throw new EmailThemeError("theme.definition.name", "cannot replace a built-in theme");
    }
    const parent = value.extends === undefined
        ? "modern"
        : name(value.extends, "theme.definition.extends");
    const overrides = value.overrides === undefined ? {} : record(value.overrides, "theme.definition.overrides");
    // Use the central resolver for token allow-lists, sanitization and bounds.
    // These standalone checks ensure the saved definition can be JSON serialized.
    let safe: ThemeOverrides;
    try {
        safe = structuredClone(overrides) as ThemeOverrides;
    } catch {
        throw new EmailThemeError("theme.definition.overrides", "must contain cloneable values");
    }
    return { name: id, extends: parent, overrides: safe };
}

/** Isolated custom-theme registry. Does not mutate the global built-in presets. */
export class ThemeRegistry {
    private definitions = new Map<string, ThemeDefinition>();

    private resolveFrom(
        themeName: string,
        definitions: ReadonlyMap<string, ThemeDefinition>,
        visiting: Set<string> = new Set(),
    ): ResolvedEmailTheme {
        if (BUILT_INS.has(themeName)) {
            return resolveEmailTheme(themeName as ThemePreset);
        }
        const entry = definitions.get(themeName);
        if (!entry) {
            throw new EmailThemeError("theme.extends", `unknown theme: ${themeName}`);
        }
        if (visiting.has(themeName)) {
            throw new EmailThemeError("theme.extends", "cyclic theme inheritance is not allowed");
        }
        visiting.add(themeName);
        try {
            const parent = this.resolveFrom(entry.extends ?? "modern", definitions, visiting);
            return mergeEmailTheme(parent, entry.overrides ?? {});
        } finally {
            visiting.delete(themeName);
        }
    }

    register(input: ThemeDefinition): this {
        const saved = definition(input);
        if (this.definitions.has(saved.name)) {
            throw new EmailThemeError("theme.definition.name", `already registered: ${saved.name}`);
        }
        const draft = new Map(this.definitions);
        draft.set(saved.name, saved);
        this.resolveFrom(saved.name, draft); // Validate before committing.
        this.definitions = draft;
        return this;
    }

    get(themeName: string): ThemeDefinition {
        const saved = this.definitions.get(name(themeName, "theme.name"));
        if (!saved) {
            throw new EmailThemeError("theme.name", `unknown custom theme: ${themeName}`);
        }
        return structuredClone(saved);
    }

    list(): string[] {
        return [...this.definitions.keys()].sort();
    }

    resolve(themeName: string, overrides: ThemeOverrides = {}): ResolvedEmailTheme {
        const base = this.resolveFrom(name(themeName, "theme.name"), this.definitions);
        return mergeEmailTheme(base, overrides);
    }

    exportJSON(): string {
        return JSON.stringify({
            schemaVersion: 1,
            themes: this.list().map(id => this.get(id)),
        }, null, 2);
    }

    /** Validates the entire import before replacing any existing registry state. */
    importJSON(payload: string, options: ThemeImportOptions = {}): this {
        if (typeof payload !== "string" || payload.length > 1_000_000) {
            throw new EmailThemeError("theme.import", "invalid or oversized JSON");
        }
        const input: unknown = (() => {
            try {
                return JSON.parse(payload) as unknown;
            } catch {
                throw new EmailThemeError("theme.import", "invalid JSON");
            }
        })();
        const root = record(input, "theme.import");
        if (Object.keys(root).some(key => key !== "schemaVersion" && key !== "themes") ||
            root.schemaVersion !== 1 || !Array.isArray(root.themes) || root.themes.length > 1000) {
            throw new EmailThemeError("theme.import", "expected schemaVersion 1 and up to 1000 themes");
        }
        const settings = record(options, "theme.import.options");
        if (Object.keys(settings).some(key => key !== "replace") ||
            (settings.replace !== undefined && typeof settings.replace !== "boolean")) {
            throw new EmailThemeError("theme.import.options", "unsupported import options");
        }
        const draft = settings.replace === true
            ? new Map<string, ThemeDefinition>()
            : new Map(this.definitions);
        for (const entry of root.themes) {
            const saved = definition(entry);
            if (draft.has(saved.name)) {
                throw new EmailThemeError("theme.import", `duplicate theme: ${saved.name}`);
            }
            draft.set(saved.name, saved);
        }
        // Resolve all imported definitions from the draft: supports out-of-order
        // parents, detects missing parents/cycles, and validates token ranges.
        for (const key of draft.keys()) {
            this.resolveFrom(key, draft);
        }
        this.definitions = draft;
        return this;
    }
}
