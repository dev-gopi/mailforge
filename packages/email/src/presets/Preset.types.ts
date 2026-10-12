
import type {
    EmailDocument,
    DocumentPatch,
} from "@mailforge/core";

import type {
    BuiltinTemplateName,
} from "@mailforge/templates";

import type {
    ThemeOverrides,
} from "../theme/Theme.types.js";

import type {
    EmailLayoutOptions,
} from "../layout/Layout.types.js";

/**
 * Trusted developer callback.
 *
 * A callback may mutate the draft or return a new
 * EmailDocument. It is executed once per render.
 */
export type TemplateCustomizer = (
    draft: EmailDocument,
) => EmailDocument | void;

/**
 * Reusable customization for one built-in template.
 *
 * Template input data is deliberately not saved.
 * Data is supplied separately for each render.
 */
export interface TemplatePresetDefinition<
    Name extends BuiltinTemplateName = BuiltinTemplateName
> {
    readonly id: string;
    readonly template: Name;
    readonly themeProfile?: string;
    readonly theme?: ThemeOverrides;
    readonly layout?: EmailLayoutOptions;
    readonly patches?: readonly DocumentPatch[];
    readonly customize?: TemplateCustomizer;
}

export interface TemplatePresetInfo {
    readonly id: string;
    readonly template: BuiltinTemplateName;
}

export class TemplatePresetError extends Error {
    public readonly code = "EMAIL_TEMPLATE_PRESET_INVALID";

    constructor(
        public readonly field: string,
        reason: string,
    ) {
        super(
            `Invalid MailForge preset at "${field}": ${reason}`,
        );

        this.name = "TemplatePresetError";
    }
}
