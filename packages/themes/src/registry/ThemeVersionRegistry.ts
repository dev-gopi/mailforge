import { EmailThemeError } from "../contracts/Theme.types.js";
import { mergeEmailTheme, resolveEmailTheme } from "../resolver/ThemeResolver.js";
import type { ResolvedEmailTheme, ThemeOverrides } from "../contracts/Theme.types.js";

export interface ThemeVersionInfo {
    name: string;
    version: string;
    status: "active" | "deprecated";
    deprecationReason?: string;
}

type SavedTheme = {
    theme: ResolvedEmailTheme;
    status: "active" | "deprecated";
    reason?: string;
};

const NAME_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;
const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function validateName(value: string): void {
    if (typeof value !== "string" || !NAME_PATTERN.test(value)) {
        throw new EmailThemeError("theme.name", "invalid theme name");
    }
}
function parts(value: string): readonly number[] {
    if (typeof value !== "string" || !VERSION_PATTERN.test(value)) {
        throw new EmailThemeError("theme.version", "expected MAJOR.MINOR.PATCH");
    }
    const numbers = value.split(".").map(Number);
    if (numbers.some(n => !Number.isSafeInteger(n))) {
        throw new EmailThemeError("theme.version", "version is too large");
    }
    return numbers;
}
function compareVersions(a: string, b: string): number {
    const x = parts(a);
    const y = parts(b);
    for (let i = 0; i < 3; i++) {
        if (x[i]! !== y[i]!) return x[i]! < y[i]! ? -1 : 1;
    }
    return 0;
}

/** In-memory immutable snapshots. The application owns persistent storage. */
export class ThemeVersionRegistry {
    private readonly versions = new Map<string, Map<string, SavedTheme>>();

    publish(name: string, version: string, resolved: ResolvedEmailTheme): this {
        validateName(name);
        parts(version);
        const existing = this.versions.get(name);
        if (existing?.has(version)) {
            throw new EmailThemeError("theme.version", `already published: ${name}@${version}`);
        }
        // A resolved object is not trusted blindly; validate the complete token set.
        const checked = mergeEmailTheme(resolveEmailTheme(resolved.preset), {
            colors: resolved.colors, typography: resolved.typography,
            spacing: resolved.spacing, appearance: resolved.appearance,
        });
        const items = existing ?? new Map<string, SavedTheme>();
        items.set(version, { theme: structuredClone(checked), status: "active" });
        this.versions.set(name, items);
        return this;
    }

    list(name: string): ThemeVersionInfo[] {
        validateName(name);
        return [...(this.versions.get(name)?.entries() ?? [])]
            .sort(([a], [b]) => compareVersions(b, a))
            .map(([version, item]) => ({
                name, version, status: item.status,
                ...(item.reason === undefined ? {} : { deprecationReason: item.reason }),
            }));
    }

    resolve(name: string, version: string, includeDeprecated = false): ResolvedEmailTheme {
        validateName(name);
        parts(version);
        const item = this.versions.get(name)?.get(version);
        if (!item || (item.status === "deprecated" && !includeDeprecated)) {
            throw new EmailThemeError("theme.version", `unavailable theme version: ${name}@${version}`);
        }
        return structuredClone(item.theme);
    }

    deprecate(name: string, version: string, reason?: string): this {
        validateName(name);
        parts(version);
        const item = this.versions.get(name)?.get(version);
        if (!item) throw new EmailThemeError("theme.version", `unknown version: ${name}@${version}`);
        if (reason !== undefined && (typeof reason !== "string" || reason.length > 500)) {
            throw new EmailThemeError("theme.version.reason", "must be a string up to 500 characters");
        }
        item.status = "deprecated";
        if (reason === undefined) delete item.reason;
        else item.reason = reason;
        return this;
    }

    /** Publish a new validated snapshot, without changing the old one. */
    migrate(name: string, from: string, to: string, overrides: ThemeOverrides, deprecateSource = false): this {
        if (compareVersions(to, from) <= 0) {
            throw new EmailThemeError("theme.version", "target version must be newer");
        }
        const previous = this.resolve(name, from, true);
        const updated = mergeEmailTheme(previous, overrides);
        this.publish(name, to, updated);
        if (deprecateSource) this.deprecate(name, from, `Replaced by ${to}`);
        return this;
    }
}
