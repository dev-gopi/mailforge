
import {
    isBuiltinTemplateName,
} from "@mailforge/templates";

import type {
    ThemeOverrides,
} from "../theme/Theme.types.js";

import {
    TemplatePresetError,
    type TemplatePresetDefinition,
    type TemplatePresetInfo,
} from "./Preset.types.js";

const IDENTIFIER =
    /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function validateId(
    value: string,
    field: string,
): void {
    if (
        typeof value !== "string" ||
        value.length > 64 ||
        !IDENTIFIER.test(value)
    ) {
        throw new TemplatePresetError(
            field,
            "use lowercase kebab-case, maximum 64 characters",
        );
    }
}

function copyPreset(
    source: TemplatePresetDefinition,
): TemplatePresetDefinition {
    return {
        id: source.id,
        template: source.template,

        ...(source.themeProfile !== undefined
            ? { themeProfile: source.themeProfile }
            : {}),

        ...(source.theme !== undefined
            ? { theme: structuredClone(source.theme) }
            : {}),

        ...(source.layout !== undefined
            ? { layout: structuredClone(source.layout) }
            : {}),

        ...(source.patches !== undefined
            ? { patches: structuredClone(source.patches) }
            : {}),

        ...(source.customize !== undefined
            ? { customize: source.customize }
            : {}),
    };
}

/**
 * Per-engine registry for reusable template presets.
 */
export class TemplatePresetRegistry {
    private readonly presets =
        new Map<string, TemplatePresetDefinition>();

    public register(
        definition: TemplatePresetDefinition,
    ): void {
        if (
            definition === null ||
            typeof definition !== "object" ||
            Array.isArray(definition)
        ) {
            throw new TemplatePresetError(
                "definition",
                "must be an object",
            );
        }

        validateId(definition.id, "id");

        if (!isBuiltinTemplateName(definition.template)) {
            throw new TemplatePresetError(
                "template",
                "must be an existing built-in template",
            );
        }

        if (
            definition.themeProfile !== undefined
        ) {
            validateId(
                definition.themeProfile,
                "themeProfile",
            );
        }

        if (
            definition.customize !== undefined &&
            typeof definition.customize !== "function"
        ) {
            throw new TemplatePresetError(
                "customize",
                "must be a function",
            );
        }

        if (
            definition.patches !== undefined &&
            (
                !Array.isArray(definition.patches) ||
                definition.patches.length > 200
            )
        ) {
            throw new TemplatePresetError(
                "patches",
                "must contain at most 200 patches",
            );
        }

        if (this.presets.has(definition.id)) {
            throw new TemplatePresetError(
                "id",
                `preset already exists: ${definition.id}`,
            );
        }

        this.presets.set(
            definition.id,
            copyPreset(definition),
        );
    }

    public get(
        id: string,
    ): TemplatePresetDefinition | undefined {
        const preset = this.presets.get(id);

        return preset
            ? copyPreset(preset)
            : undefined;
    }

    public list(): TemplatePresetInfo[] {
        return [...this.presets.values()]
            .map(preset => ({
                id: preset.id,
                template: preset.template,
            }))
            .sort((a, b) => a.id.localeCompare(b.id));
    }
}

/**
 * Named theme overrides, shared by multiple
 * templates belonging to one email-engine instance.
 */
export class ThemeProfileRegistry {
    private readonly profiles =
        new Map<string, ThemeOverrides>();

    public register(
        id: string,
        theme: ThemeOverrides,
    ): void {
        validateId(id, "themeProfile");

        if (this.profiles.has(id)) {
            throw new TemplatePresetError(
                "themeProfile",
                `theme profile already exists: ${id}`,
            );
        }

        this.profiles.set(
            id,
            structuredClone(theme),
        );
    }

    public get(
        id: string,
    ): ThemeOverrides | undefined {
        const value = this.profiles.get(id);

        return value === undefined
            ? undefined
            : structuredClone(value);
    }

    public list(): string[] {
        return [...this.profiles.keys()].sort();
    }
}
