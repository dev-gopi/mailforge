import {
    ComponentRegistry,
    ComponentValidator,
    DocumentCustomizer,
    type EmailDocument,
    type DocumentPatch,
    type RenderOptions,
    type RenderResult,
    type ComponentInfo,
} from "@mailforge/core";

import {
    MjmlRenderer,
} from "@mailforge/renderer-mjml";

import {
    HtmlRenderer,
    type HtmlRenderInput,
} from "@mailforge/renderer-html";

import {
    ComponentCatalog,
    ComponentExpander,
    registerStandardComponents,
    registerCompositeComponents,
    type ReusableComponentDefinition,
} from "@mailforge/components";

import {
    getBuiltinTemplate,
    listBuiltinTemplates,
    listTemplateCatalog,
    getBuiltinTemplateInfo,
    isBuiltinTemplateName,
    assertBuiltinTemplateData,
    DOMAIN_TEMPLATE_NAMES,
    buildDomainTemplate,
    TemplateContractRegistry,
    type TemplateContractDefinition,
    type BuiltinTemplateName,
    type BuiltinTemplateDataMap,
    type DomainTemplateName,
    type TemplateCategory,
    type TemplateCatalogEntry,
} from "@mailforge/templates";

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

import {
    assertRenderBudget,
} from "./security/RenderGuard.js";

export interface TemplateRenderOptions
    extends RenderOptions {
    data?: TemplateData;
    patches?: readonly DocumentPatch[];
    layout?: EmailLayoutOptions;
    theme?: ThemeOverrides;
}

function isDomainTemplateName(
    name: string,
): name is DomainTemplateName {
    return (
        DOMAIN_TEMPLATE_NAMES as readonly string[]
    ).includes(name);
}

export class MailForgeEmail {
    private readonly config: ResolvedEmailConfig;

    private readonly registry =
        new ComponentRegistry();

    private readonly componentCatalog =
        new ComponentCatalog(this.registry);

    private readonly componentExpander =
        new ComponentExpander(
            this.registry,
            this.componentCatalog,
        );

    private readonly validator =
        new ComponentValidator(this.registry);

    private readonly customizer =
        new DocumentCustomizer(this.registry);

    private readonly mjmlRenderer =
        new MjmlRenderer(this.registry);

    private readonly htmlRenderer =
        new HtmlRenderer();

    private readonly templateContracts =
        new TemplateContractRegistry();

    // Only developer-registered templates live here.
    private readonly templates =
        new Map<string, EmailDocument>();

    constructor(options: EmailConfigOptions = {}) {
        this.config = resolveEmailConfig(options);

        // Register six standard reusable components
        // in this engine's existing component catalog.
        registerStandardComponents(
            this.componentCatalog,
        );

        // Task 7.7.4: Six composite/layout components.
        registerCompositeComponents(
            this.componentCatalog,
        );
    }

    // ---------------------------------------
    // BRAND AND THEME CONFIGURATION
    // ---------------------------------------

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

    // ---------------------------------------
    // BUILT-IN TEMPLATES
    // ---------------------------------------

    /**
     * List all built-in templates bundled with MailForge.
     */
    public listBuiltinTemplates():
        BuiltinTemplateName[] {
        return listBuiltinTemplates();
    }

    /**
     * List built-in templates with metadata.
     * Optionally filter by business domain.
     */
    public listTemplateCatalog(
        category?: TemplateCategory,
    ): TemplateCatalogEntry[] {
        return listTemplateCatalog(category);
    }

    /**
     * Inspect the required and optional fields
     * for a built-in template.
     */
    public getTemplateContract<
        Name extends BuiltinTemplateName
    >(
        name: Name,
    ): TemplateContractDefinition<Name> {
        return this.templateContracts.get(name);
    }

    /**
     * Validate data using the unified Zod contracts.
     * Applies supported defaults and returns
     * the validated data.
     */
    public validateTemplateData<
        Name extends BuiltinTemplateName
    >(
        name: Name,
        data: unknown,
    ): BuiltinTemplateDataMap[Name] {
        return this.templateContracts.validate(
            name,
            data,
        );
    }

    /**
     * Render a built-in template after allowing
     * trusted application code to customize its
     * structured document.
     *
     * This does not modify the published template
     * or store changes on the engine.
     *
     * Domain templates are materialized first so
     * invoice/order arrays remain real structures.
     */
    public async renderCustomizedBuiltin<
        Name extends BuiltinTemplateName
    >(
        name: Name,
        data: BuiltinTemplateDataMap[Name],
        customize: (
            draft: EmailDocument,
        ) => EmailDocument | void,
        options: Omit<TemplateRenderOptions, "data"> = {},
    ): Promise<RenderResult> {
        const validated = this.validateTemplateData(
            name,
            data,
        );

        const domain = isDomainTemplateName(name);

        // Build from the official catalog, even if the
        // developer registered a template with this ID.
        const source = domain
            ? buildDomainTemplate(name, validated)
            : getBuiltinTemplate(name);

        // Each render receives an independent document.
        const draft = structuredClone(source);

        // Developer may mutate the draft or return
        // a completely new EmailDocument.
        const replacement = customize(draft);
        const customized = replacement ?? draft;

        if (
            !customized ||
            customized.id !== name ||
            !Array.isArray(customized.body)
        ) {
            throw new Error(
                `Invalid customized built-in template: ${name}`,
            );
        }

        // Existing validation allows placeholders
        // during the template preparation phase.
        this.validator.validateOrThrow(
            prepareTemplateForValidation(customized),
        );

        // For domain templates, original business data
        // has already been materialized. Never run
        // document interpolation over it again.
        return this.renderPipeline(
            structuredClone(customized),
            {
                ...options,
                data: validated as unknown as TemplateData,
            },
            domain,
        );
    }

    /**
     * Get metadata for one built-in template.
     */
    public getBuiltinTemplateInfo(
        name: BuiltinTemplateName,
    ): TemplateCatalogEntry {
        return getBuiltinTemplateInfo(name);
    }


    // ---------------------------------------
    // CUSTOM TEMPLATE REGISTRATION
    // ---------------------------------------

    public registerTemplate(
        document: EmailDocument,
    ): this {
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

    /**
     * Preserve the existing Task 7.1 behavior:
     * list only templates explicitly registered
     * by the developer.
     */
    public listTemplates(): string[] {
        return [...this.templates.keys()].sort();
    }

    /**
     * Custom templates take priority.
     * Otherwise, fall back to a built-in.
     */
    public getTemplate(
        templateId: string,
    ): EmailDocument {
        const custom = this.templates.get(templateId);

        if (custom) {
            return structuredClone(custom);
        }

        if (isBuiltinTemplateName(templateId)) {
            return getBuiltinTemplate(templateId);
        }

        throw new Error(
            `Template not found: ${templateId}`,
        );
    }

    // ---------------------------------------
    // EMAIL RENDERING
    // ---------------------------------------


    public async render(
        templateId: string,
        options: TemplateRenderOptions = {},
    ): Promise<RenderResult> {
        // Developer-defined templates always take priority.
        if (this.templates.has(templateId)) {
            return this.renderDocument(
                this.getTemplate(templateId),
                options,
            );
        }

        if (!isBuiltinTemplateName(templateId)) {
            throw new Error(
                `Template not found: ${templateId}`,
            );
        }

        // New domain templates validate and materialize in one pass.
        // New domain templates need typed, materialized
        // components for line-item arrays and money.
        if (isDomainTemplateName(templateId)) {
            const document = buildDomainTemplate(
                templateId,
                options.data,
            );

            return this.renderPipeline(
                document,
                options,
                true,
            );
        }

        // The original templates retain their schema validation.
        assertBuiltinTemplateData(templateId, options.data);

        // Existing five templates use the normal
        // dynamic-variable interpolation pipeline.
        return this.renderDocument(
            getBuiltinTemplate(templateId),
            options,
        );
    }


    /**
     * Type-safe helper that always renders the
     * packaged template, even if a custom
     * template has the same name.
     */

    public async renderBuiltin<
        Name extends BuiltinTemplateName
    >(
        name: Name,
        data: BuiltinTemplateDataMap[Name],
        options: Omit<TemplateRenderOptions, "data"> = {},
    ): Promise<RenderResult> {
        // This always renders the packaged template,
        // ignoring any custom template with the same ID.
        if (isDomainTemplateName(name)) {
            return this.renderPipeline(
                buildDomainTemplate(name, data),
                {
                    ...options,
                    data,
                },
                true,
            );
        }

        assertBuiltinTemplateData(name, data);

        return this.renderDocument(
            getBuiltinTemplate(name),
            {
                ...options,
                data,
            },
        );
    }


    /**
     * Existing structured-document pipeline
     * from Task 7.5.
     */
    public async renderDocument(
        document: EmailDocument,
        options: TemplateRenderOptions = {},
    ): Promise<RenderResult> {
        return this.renderPipeline(
            document,
            options,
            false,
        );
    }


    /**
     * Shared rendering pipeline for:
     *
     * - Ordinary templates with {{variables}}
     * - Already-materialized domain templates
     *
     * prepared=true skips document interpolation but
     * still interpolates any developer patch values.
     */
    private async renderPipeline(
        document: EmailDocument,
        options: TemplateRenderOptions,
        prepared: boolean,
    ): Promise<RenderResult> {
        const layout = this.resolveLayout(
            options.layout ?? {},
        );

        const theme = this.resolveTheme(
            options.theme ?? {},
        );

        const data = options.data === undefined
            ? {}
            : options.data;

        // 1. Add company header/footer/copyright.
        const withDefaults = applyDefaultLayout(
            document,
            this.config.brand,
            layout,
        );

        // 2. Only ordinary templates require another
        // interpolation pass. Domain data is complete.
        const interpolated = prepared
            ? withDefaults
            : interpolateEmailDocument(
                withDefaults,
                data,
            );

        // 3. Patch placeholders still use the supplied data.
        const patches = interpolateDocumentPatches(
            options.patches ?? [],
            data,
        );

        // 4. Apply developer patches atomically.
        const customized = this.customizer.apply(
            interpolated,
            patches,
        );

        // 5. Expand reusable leaf and composite components.
        const expanded = this.componentExpander.expand(
            customized,
        );

        // 6. Apply brand/theme design tokens.
        const themed = applyEmailTheme(
            expanded,
            theme,
        );

        // 7. Validate once more after theme application.
        this.validator.validateOrThrow(themed);

        // 8. Preserve the Task 7.7.5 resource budget.
        assertRenderBudget(themed);

        // 9. Produce responsive HTML and plain text.
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
     * Existing standalone HTML renderer.
     * Kept separate from structured templates.
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

    /**
     * Register a reusable custom email component.
     */
    public registerComponent(
        definition: ReusableComponentDefinition,
    ): this {
        this.componentCatalog.register(definition);
        return this;
    }

    /**
     * List all available built-in primitives
     * and registered custom components.
     */
    public listComponents(): ComponentInfo[] {
        return this.registry.list();
    }
}

export function createEmail(
    config: EmailConfigOptions = {},
): MailForgeEmail {
    return new MailForgeEmail(config);
}
