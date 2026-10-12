
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

/**
 * Options for rendering a structured email.
 */
export interface TemplateRenderOptions
    extends RenderOptions {
    patches?: readonly DocumentPatch[];
}

/**
 * Main MailForge email generation API.
 *
 * Connects the document engine,
 * customization system, and renderers.
 */
export class MailForgeEmail {
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
     * Register a reusable email template.
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
     * Returns the registered template names.
     */
    public listTemplates(): string[] {
        return [...this.templates.keys()].sort();
    }

    /**
     * Returns an isolated copy of a template.
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
     * Render a previously registered template.
     */
    public async render(
        templateId: string,
        options: TemplateRenderOptions = {},
    ): Promise<RenderResult> {
        const document = this.getTemplate(templateId);

        return this.renderDocument(document, options);
    }

    /**
     * Render a document directly.
     * Registering a template is optional.
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
     * Render developer-supplied HTML.
     *
     * Safe mode is the default.
     * Trusted mode must be explicitly requested.
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
 * Simple entry point for developers.
 */
export function createEmail(): MailForgeEmail {
    return new MailForgeEmail();
}
