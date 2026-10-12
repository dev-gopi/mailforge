
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
    isBuiltinTemplateName,
    assertBuiltinTemplateData,
    type BuiltinTemplateName,
    type BuiltinTemplateDataMap,
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
     * List the five templates bundled with MailForge.
     */
    public listBuiltinTemplates():
        BuiltinTemplateName[] {
        return listBuiltinTemplates();
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
        /**
         * When using a built-in directly,
         * validate its required data.
         *
         * Custom templates with the same ID are
         * unaffected by built-in requirements.
         */
        if (
            !this.templates.has(templateId) &&
            isBuiltinTemplateName(templateId)
        ) {
            assertBuiltinTemplateData(
                templateId,
                options.data,
            );
        }

        const document = this.getTemplate(templateId);

        return this.renderDocument(
            document,
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
        // 1. Resolve layout and theme.
        const layout = this.resolveLayout(
            options.layout ?? {},
        );

        const theme = this.resolveTheme(
            options.theme ?? {},
        );

        const data = options.data === undefined
            ? {}
            : options.data;

        // 2. Create missing header, footer,
        // and copyright.
        const withDefaults = applyDefaultLayout(
            document,
            this.config.brand,
            layout,
        );

        // 3. Resolve variables inside the document.
        const interpolated = interpolateEmailDocument(
            withDefaults,
            data,
        );

        // 4. Resolve variables in custom patches.
        const patches = interpolateDocumentPatches(
            options.patches ?? [],
            data,
        );

        // 5. Apply patches atomically and validate.
        const customized = this.customizer.apply(
            interpolated,
            patches,
        );

        const expanded = this.componentExpander.expand(
            customized,
        );

        // 6. Apply colors, typography and spacing.
        const themed = applyEmailTheme(
            expanded,
            theme,
        );

        // 7. Generate HTML and plain text.
        return this.mjmlRenderer.render(
            themed,
            {
                trust: options.trust ?? "safe",
                bodyBackgroundColor:
                    theme.colors.background,

                ...(options.inlineCss !== undefined
                    ? {
                        inlineCss: options.inlineCss,
                    }
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
