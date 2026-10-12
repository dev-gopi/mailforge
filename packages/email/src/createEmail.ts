
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

export interface TemplateRenderOptions
    extends RenderOptions {
    patches?: readonly DocumentPatch[];
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

    /**
     * Return an isolated copy of brand settings.
     */
    public getBrand(): ResolvedEmailBrand {
        return structuredClone(this.config.brand);
    }

    /**
     * Return an isolated copy of the theme.
     */
    public getTheme(): ResolvedEmailTheme {
        return structuredClone(this.config.theme);
    }

    /**
     * List available built-in theme presets.
     */
    public listThemes(): ThemePreset[] {
        return listThemePresets();
    }

    /**
     * Calculate a temporary customized theme.
     *
     * Does NOT change the stored configuration.
     */
    public resolveTheme(
        overrides: ThemeOverrides = {},
    ): ResolvedEmailTheme {
        return mergeEmailTheme(
            this.config.theme,
            overrides,
        );
    }

    /**
     * Return an isolated copy of full config.
     */
    public getConfig(): ResolvedEmailConfig {
        return {
            brand: this.getBrand(),
            theme: this.getTheme(),
        };
    }

    /**
     * Register a reusable email document.
     */
    public registerTemplate(
        document: EmailDocument,
    ): this {
        this.validator.validateOrThrow(document);

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

    /**
     * List all registered template IDs.
     */
    public listTemplates(): string[] {
        return [...this.templates.keys()].sort();
    }

    /**
     * Return an isolated document copy.
     */
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

    /**
     * Render an existing template.
     */
    public async render(
        templateId: string,
        options: TemplateRenderOptions = {},
    ): Promise<RenderResult> {
        const document = this.getTemplate(templateId);

        return this.renderDocument(document, options);
    }

    /**
     * Render a structured document directly.
     */
    public async renderDocument(
        document: EmailDocument,
        options: TemplateRenderOptions = {},
    ): Promise<RenderResult> {
        const customized = this.customizer.apply(
            document,
            options.patches ?? [],
        );

        return this.mjmlRenderer.render(
            customized,
            {
                trust: options.trust ?? "safe",

                ...(options.inlineCss !== undefined
                    ? { inlineCss: options.inlineCss }
                    : {}),
            },
        );
    }

    /**
     * Render custom HTML using the HTML adapter.
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
