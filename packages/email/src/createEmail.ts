
import {
    ComponentRegistry,
    ComponentValidator,
    DocumentCustomizer,
    type EmailDocument,
    type DocumentPatch,
    type RenderOptions,
    type RenderResult,
} from "@mailforge/core";

import {
    MjmlRenderer,
} from "@mailforge/renderer-mjml";

import {
    HtmlRenderer,
    type HtmlRenderInput,
} from "@mailforge/renderer-html";

import {
    resolveEmailConfig,
} from "./config/ConfigResolver.js";

import {
    mergeEmailTheme,
} from "./theme/ThemeResolver.js";

import {
    listThemePresets,
} from "./theme/ThemePresets.js";

import {
    applyDefaultLayout,
} from "./layout/DefaultLayout.js";

import {
    applyEmailTheme,
} from "./layout/ThemeApplicator.js";

import {
    mergeEmailLayout,
} from "./layout/LayoutResolver.js";

import {
    prepareTemplateForValidation,
    interpolateEmailDocument,
    interpolateDocumentPatches,
} from "./variables/VariableResolver.js";

import type {
    TemplateData,
} from "./variables/Variable.types.js";

import type {
    EmailConfigOptions,
    ResolvedEmailBrand,
    ResolvedEmailConfig,
} from "./config/EmailConfig.js";

import type {
    ResolvedEmailTheme,
    ThemeOverrides,
    ThemePreset,
} from "./theme/Theme.types.js";

import type {
    EmailLayoutOptions,
    ResolvedEmailLayout,
} from "./layout/Layout.types.js";

/**
 * Additional properties accepted by render().
 */
export interface TemplateRenderOptions
    extends RenderOptions {
    data?: TemplateData;
    patches?: readonly DocumentPatch[];
    layout?: EmailLayoutOptions;
    theme?: ThemeOverrides;
}

export class MailForgeEmail {
    private readonly config: ResolvedEmailConfig;

    private readonly registry =
        new ComponentRegistry();

    private readonly validator =
        new ComponentValidator(this.registry);

    private readonly customizer =
        new DocumentCustomizer(this.registry);

    private readonly mjmlRenderer =
        new MjmlRenderer(this.registry);

    private readonly htmlRenderer =
        new HtmlRenderer();

    private readonly templates =
        new Map<string, EmailDocument>();

    constructor(options: EmailConfigOptions = {}) {
        this.config = resolveEmailConfig(options);
    }

    // -----------------------------
    // BRAND AND THEME CONFIGURATION
    // -----------------------------

    public getBrand(): ResolvedEmailBrand {
        return structuredClone(this.config.brand);
    }

    public getTheme(): ResolvedEmailTheme {
        return structuredClone(this.config.theme);
    }

    public getLayout(): ResolvedEmailLayout {
        return structuredClone(this.config.layout);
    }

    public getConfig(): ResolvedEmailConfig {
        return {
            brand: this.getBrand(),
            theme: this.getTheme(),
            layout: this.getLayout(),
        };
    }

    public listThemes(): ThemePreset[] {
        return listThemePresets();
    }

    public resolveTheme(
        overrides: ThemeOverrides = {},
    ): ResolvedEmailTheme {
        return mergeEmailTheme(
            this.config.theme,
            overrides,
        );
    }

    public resolveLayout(
        overrides: EmailLayoutOptions = {},
    ): ResolvedEmailLayout {
        return mergeEmailLayout(
            this.config.layout,
            overrides,
        );
    }

    // -----------------------------
    // TEMPLATE REGISTRATION
    // -----------------------------

    public registerTemplate(
        document: EmailDocument,
    ): this {
        /**
         * Validate a temporary copy where variable
         * URLs are replaced with safe example URLs.
         *
         * Store the original template unchanged.
         */
        const validationCopy =
            prepareTemplateForValidation(document);

        this.validator.validateOrThrow(validationCopy);

        if (this.templates.has(document.id)) {
            throw new Error(
                `Template already registered: ${document.id}`,
            );
        }

        this.templates.set(
            document.id,
            structuredClone(document),
        );

        return this;
    }

    public listTemplates(): string[] {
        return [...this.templates.keys()].sort();
    }

    public getTemplate(
        templateId: string,
    ): EmailDocument {
        const document = this.templates.get(templateId);

        if (!document) {
            throw new Error(
                `Template not found: ${templateId}`,
            );
        }

        return structuredClone(document);
    }

    // -----------------------------
    // EMAIL RENDERING
    // -----------------------------

    public async render(
        templateId: string,
        options: TemplateRenderOptions = {},
    ): Promise<RenderResult> {
        const document = this.getTemplate(templateId);

        return this.renderDocument(
            document,
            options,
        );
    }

    public async renderDocument(
        document: EmailDocument,
        options: TemplateRenderOptions = {},
    ): Promise<RenderResult> {
        // Step 1: Resolve configuration for this email.
        const layout = this.resolveLayout(
            options.layout ?? {},
        );

        const theme = this.resolveTheme(
            options.theme ?? {},
        );

        const data = options.data === undefined
            ? {}
            : options.data;

        // Step 2: Add missing branded sections.
        const withDefaults = applyDefaultLayout(
            document,
            this.config.brand,
            layout,
        );

        // Step 3: Resolve variables before component
        // validation, especially dynamic URLs.
        const interpolated = interpolateEmailDocument(
            withDefaults,
            data,
        );

        // Step 4: Resolve variables inside patches.
        const patches = interpolateDocumentPatches(
            options.patches ?? [],
            data,
        );

        // Step 5: Apply patches atomically.
        // This validates the fully resolved document.
        const customized = this.customizer.apply(
            interpolated,
            patches,
        );

        // Step 6: Apply theme styling.
        const themed = applyEmailTheme(
            customized,
            theme,
        );

        // Step 7: Render the completed email.
        return this.mjmlRenderer.render(
            themed,
            {
                trust: options.trust ?? "safe",
                bodyBackgroundColor: theme.colors.background,

                ...(options.inlineCss !== undefined
                    ? { inlineCss: options.inlineCss }
                    : {}),
            },
        );
    }

    /**
     * Existing standalone HTML API.
     *
     * This does not interpolate {{variables}}.
     * HTML-template interpolation requires a
     * separate, context-aware API in a later task.
     */
    public async renderHtml(
        input: HtmlRenderInput,
        options: RenderOptions = {},
    ): Promise<RenderResult> {
        return this.htmlRenderer.render(
            input,
            {
                ...options,
                trust: options.trust ?? "safe",
            },
        );
    }
}

/**
 * Main plug-and-play factory.
 */
export function createEmail(
    config: EmailConfigOptions = {},
): MailForgeEmail {
    return new MailForgeEmail(config);
}
