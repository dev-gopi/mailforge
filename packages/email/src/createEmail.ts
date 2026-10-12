
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

import type {
    EmailConfigOptions,
    ResolvedEmailBrand,
    ResolvedEmailConfig,
} from "./config/EmailConfig.js";

/**
 * Options for rendering a structured document.
 */
export interface TemplateRenderOptions
    extends RenderOptions {
    patches?: readonly DocumentPatch[];
}

/**
 * Main public MailForge email engine.
 */
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

    /**
     * Validate and store brand configuration.
     */
    constructor(options: EmailConfigOptions = {}) {
        this.config = resolveEmailConfig(options);
    }

    /**
     * Get a copy of the current brand settings.
     */
    public getBrand(): ResolvedEmailBrand {
        return {
            ...this.config.brand,
        };
    }

    /**
     * Get a copy of the complete engine configuration.
     */
    public getConfig(): ResolvedEmailConfig {
        return {
            brand: this.getBrand(),
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
     * Return the registered template IDs.
     */
    public listTemplates(): string[] {
        return [...this.templates.keys()].sort();
    }

    /**
     * Return an isolated copy of a template.
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
     * Render a registered template.
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
     * Render custom HTML through the HTML adapter.
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
 * Plug-and-play public factory.
 *
 * Existing createEmail() calls still work.
 */
export function createEmail(
    config: EmailConfigOptions = {},
): MailForgeEmail {
    return new MailForgeEmail(config);
}
