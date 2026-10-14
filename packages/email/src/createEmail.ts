import {
    ComponentRegistry,
    ComponentValidator,
    DocumentCustomizer,
    applyDocumentOverrides,
    type EmailDocumentOverrides,
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
    PluginRegistry,
    MailForgePluginError,
    type MailForgePlugin,
} from "@mailforge/plugin-sdk";

import {
    HtmlRenderer,
    type HtmlRenderInput,
} from "@mailforge/renderer-html";

import {
    ComponentCatalog,
    ComponentExpander,
    registerStandardComponents,
    registerCompositeComponents,
    registerBusinessComponents,
    registerMarketingComponents,
    type ReusableComponentDefinition,
} from "@mailforge/components";


import {
    getBuiltinTemplate,
    TemplateVersionRegistry,
    TemplateVersionError,
    type TemplateVersionInfo,
    type TemplateVersionSelection,
    getBuiltinCatalogTemplate,
    listBuiltinTemplateCatalog,
    isCatalogTemplateName,
    buildCatalogTemplate,
    listSpecializedTemplates,
    buildNewsletterTemplate,
    newsletterSchema,
    buildPromotionTemplate,
    promotionSchema,
    buildShippingUpdateTemplate,
    shippingUpdateSchema,
    listBuiltinTemplates,
    listTemplateCatalog,
    getBuiltinTemplateInfo,
    isBuiltinTemplateName,
    DOMAIN_TEMPLATE_NAMES,
    TemplateContractRegistry,
    buildParsedDomainTemplate,

    type ValidatedBuiltinTemplateDataMap,
    type ParsedDomainTemplateDataMap,
    type TemplateContractDefinition,
    type BuiltinTemplateName,
    type BuiltinTemplateDataMap,
    type DomainTemplateName,
    type TemplateCategory,
    type TemplateCatalogEntry,
} from "@mailforge/templates";

import {
    EmailLocalizationRegistry,
    normalizeEmailLocale,
    localizeEmailDocument,
    type EmailTranslation,
} from "./localization/EmailLocalization.js";

import {
    TemplatePresetRegistry,
    ThemeProfileRegistry,
} from "./presets/PresetRegistry.js";

import {
    TemplatePresetError,
    type TemplatePresetDefinition,
    type TemplatePresetInfo,
    type TemplateCustomizer,
} from "./presets/Preset.types.js";

import {
    mergeThemeOverrides,
    mergeLayoutOverrides,
} from "./presets/PresetMerge.js";
import {
    TemplateVariantRegistry,
    TemplateVariantError,
    type TemplateVariantDefinition,
    type ResolvedTemplateVariant,
} from "./registry/TemplateVariantRegistry.js";

import {
    resolveEmailConfig,
} from "./config/ConfigResolver.js";

import {
    mergeEmailTheme,
    listThemePresets,
    ThemeRegistry,
    ThemeVersionRegistry,
    EmailThemeError,
} from "@mailforge/themes";
import type {
    ThemeDefinition,
    ThemeVersionInfo,
    ResolvedEmailTheme,
    ThemeOverrides,
    ThemePreset,
} from "@mailforge/themes";

import {
    applyDefaultLayout,
} from "./layout/DefaultLayout.js";

import {
    applyEmailTheme,
} from "./layout/ThemeApplicator.js";

import { applyTemplateDisplay, type TemplateDisplayOptions } from "./layout/TemplateDisplay.js";

import {
    mergeEmailLayout,
} from "./layout/LayoutResolver.js";

import {
    getLayoutPreset,
    listLayoutPresets,
    type LayoutPresetName,
} from "./layout/LayoutPresets.js";

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
    /** Per-render node customization shared by all templates; byId overrides byRole and byType. */
    overrides?: EmailDocumentOverrides;
    /** BCP-47 language tag; omitted means the engine's default locale. */
    locale?: string;
    /** Translation fallback when a regional language does not contain a phrase. */
    fallbackLocale?: string;
    /** Override automatic RTL detection for the selected locale. */
    direction?: "ltr" | "rtl";
    layout?: EmailLayoutOptions;
    /** Optional visual layout. Omit to preserve existing rendering. */
    layoutPreset?: LayoutPresetName;
    theme?: ThemeOverrides;
    /** Opt-in named theme from @mailforge/themes; legacy rendering is unchanged if omitted. */
    themeName?: string;
    /** Exact immutable theme version. Requires themeName. */
    themeVersion?: string;
    /** Historical deprecated versions are opt-in only. */
    includeDeprecatedTheme?: boolean;
    /** Select a published version only when explicitly requested. */
    templateVersion?: TemplateVersionSelection;
    /** Select a reusable visual/content variant without changing its data contract. */
    variant?: string;
    /** Trusted tenant ID. Scoped variants never access another tenant's designs. */
    organizationId?: string;

    /**
     * Optional name of a reusable theme profile.
     */
    themeProfile?: string;

    /** Per-render show/hide controls and subject/preheader overrides. */
    display?: TemplateDisplayOptions;
}

function isDomainTemplateName(
    name: string,
): name is DomainTemplateName {
    return (
        DOMAIN_TEMPLATE_NAMES as readonly string[]
    ).includes(name);
}

/** Tenant IDs must come from your trusted backend authorization context. */
function assertOrganizationId(organizationId: string): void {
    if (typeof organizationId !== "string" ||
        !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(organizationId)) {
        throw new TemplateVariantError("Invalid organization ID");
    }
}

const BUILTIN_VARIANT_IDS = new Set(["default", "compact", "premium", "branded"]);
const MAX_ORGANIZATIONS_PER_ENGINE = 250;

export class MailForgeEmail {
    private readonly localizations = new EmailLocalizationRegistry();
    private readonly defaultLocale: string;
    private readonly fallbackLocale: string;
    private readonly themes = new ThemeRegistry();
    private readonly themeVersions = new ThemeVersionRegistry();
    private readonly organizationThemes = new Map<string, ThemeRegistry>();
    private readonly organizationThemeVersions = new Map<string, ThemeVersionRegistry>();
    private readonly plugins = new PluginRegistry();
    private readonly templatePresets =
        new TemplatePresetRegistry();

    private readonly themeProfiles =
        new ThemeProfileRegistry();

    // Reuse the existing variant registry; never share it between engines.
    private readonly templateVariants =
        new TemplateVariantRegistry();
    // Organization variants have separate registries on each email engine.
    private readonly organizationVariants =
        new Map<string, TemplateVariantRegistry>();

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

    // Version history is independent for every MailForgeEmail instance.
    private readonly templateVersions =
        new TemplateVersionRegistry();

    // Safe domain versions store styling recipes, never customer data.
    // Version identity and deprecation still use TemplateVersionRegistry.
    private readonly domainVersionStyles =
        new Map<string, readonly DocumentPatch[]>();

    // Only developer-registered templates live here.
    private readonly templates =
        new Map<string, EmailDocument>();

    constructor(options: EmailConfigOptions = {}) {
        this.config = resolveEmailConfig(options);
        this.defaultLocale = normalizeEmailLocale(options.locale ?? "en");
        this.fallbackLocale = normalizeEmailLocale(options.fallbackLocale ?? "en");

        // Register six standard reusable components
        // in this engine's existing component catalog.
        registerStandardComponents(
            this.componentCatalog,
        );

        // Register composite and layout components.
        registerCompositeComponents(
            this.componentCatalog,
        );

        // Register validated business and table components.
        registerBusinessComponents(this.componentCatalog);
        registerMarketingComponents(this.componentCatalog);
    }

    // ---------------------------------------
    // TRUSTED PLUGIN SDK
    // ---------------------------------------
    /**
     * Plugins are trusted executable application code, not user-provided JSON.
     * Setup collects registrations first, then applies them; failures roll back
     * registrations made during this call, rather than leaving partial state.
     */
    public usePlugin(plugin: MailForgePlugin): this {
        const staged: Array<
            | { kind: "template"; document: EmailDocument }
            | { kind: "component"; definition: ReusableComponentDefinition }
        > = [];
        this.plugins.use(plugin, {
            registerTemplate: document => {
                staged.push({ kind: "template", document: structuredClone(document) });
            },
            registerComponent: definition => {
                staged.push({ kind: "component", definition });
            },
        });
        const applied: Array<{ kind: "template" | "component"; id: string }> = [];
        try {
            for (const registration of staged) {
                if (registration.kind === "template") {
                    this.registerTemplate(registration.document);
                    applied.push({ kind: "template", id: registration.document.id });
                } else {
                    this.registerComponent(registration.definition);
                    applied.push({ kind: "component", id: registration.definition.name });
                }
            }
        } catch (error) {
            // Only remove registrations successfully added by this plugin.
            for (const item of applied.reverse()) {
                if (item.kind === "template") this.unregisterTemplate(item.id);
                else this.unregisterComponent(item.id);
            }
            this.plugins.unuse(plugin.name);
            throw new MailForgePluginError(
                `Plugin registration failed (${plugin.name}): ${String(error)}`,
            );
        }
        return this;
    }

    public listPlugins(): ReadonlyArray<{ name: string; version: string }> {
        return this.plugins.list();
    }

    // ---------------------------------------
    // LOCALIZED EMAIL CONTENT
    // ---------------------------------------
    /** Application-owned, per-engine translations keyed by stable node ID. */
    public registerTranslations(locale: string, templateId: string, translation: EmailTranslation): this {
        this.localizations.register(locale, templateId, translation);
        return this;
    }
    public listTranslations(locale?: string): Array<{locale: string; templateId: string}> {
        return this.localizations.list(locale);
    }
    public resolveTranslations(locale: string, templateId: string, fallbackLocale?: string): EmailTranslation {
        return this.localizations.resolve(locale, templateId, fallbackLocale ?? this.fallbackLocale);
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

    /** Names of optional email-safe page layout styles. */
    public listLayoutPresets(): LayoutPresetName[] {
        return listLayoutPresets();
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

    /** Discover all packaged core, specialized and business catalog templates. */
    public listBuiltinCatalog() {
        return listBuiltinTemplateCatalog();
    }

    /**
     * List built-in templates with metadata.
     * Optionally filter by business domain.
     */
    public listTemplateCatalog(
        category?: TemplateCategory,
    ): TemplateCatalogEntry[] {
        return listTemplateCatalog(category).filter(
            item => item.id !== "login",
        );
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
    public validateTemplateData<Name extends BuiltinTemplateName>(
        name: Name,
        data: unknown,
    ): ValidatedBuiltinTemplateDataMap[Name] {
        return this.templateContracts.validate(name, data);
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
    public async renderCustomizedBuiltin<Name extends BuiltinTemplateName>(
        name: Name,
        data: BuiltinTemplateDataMap[Name],
        customize: TemplateCustomizer,
        options: Omit<TemplateRenderOptions, "data"> = {},
    ): Promise<RenderResult> {
        if (typeof customize !== "function") {
            throw new TypeError("Template customize must be a function");
        }

        const validated = this.validateTemplateData(name, data);

        return this.renderValidatedBuiltin(
            name,
            validated,
            options,
            customize,
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


    // ---------------------------------------------------
    // REUSABLE TEMPLATE VARIANTS
    // ---------------------------------------------------
    /** Seed four built-in variants lazily for a known template. */
    private ensureTemplateVariants(templateId: string): void {
        // A published version is also a valid source, even if that template
        // was never installed as the current custom template.
        if (this.templateVersions.list(templateId).length === 0) {
            this.getTemplate(templateId);
        }
        const known = new Set(
            this.templateVariants.list(templateId).map(item => item.id),
        );
        const presets: readonly Omit<TemplateVariantDefinition, "templateId">[] = [
            { id: "default" },
            {
                id: "compact",
                theme: {
                    appearance: { contentPadding: 20, cardRadius: 8, buttonRadius: 6 },
                    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
                },
            },
            {
                id: "premium",
                theme: {
                    appearance: { contentPadding: 40, cardRadius: 16, buttonRadius: 12 },
                    typography: { headingSize: 30 },
                    spacing: { xs: 6, sm: 12, md: 18, lg: 26, xl: 36 },
                },
            },
            {
                id: "branded",
                theme: { appearance: { contentPadding: 32, cardRadius: 12, buttonRadius: 8 } },
            },
        ];
        for (const preset of presets) {
            if (!known.has(preset.id)) {
                this.templateVariants.register({ templateId, ...preset });
            }
        }
    }

    /** Register an isolated, validated variation of an existing template. */
    public registerTemplateVariant(definition: TemplateVariantDefinition): this {
        this.ensureTemplateVariants(definition.templateId);
        if (definition.themeProfile !== undefined &&
            this.themeProfiles.get(definition.themeProfile) === undefined) {
            throw new TemplateVariantError(
                `Unknown theme profile: ${definition.themeProfile}`,
            );
        }
        if (definition.theme !== undefined) this.resolveTheme(definition.theme);
        if (definition.layout !== undefined) this.resolveLayout(definition.layout);
        // Resolve parents before registration so combined overrides can be checked.
        if (definition.extends !== undefined) {
            const parent = this.templateVariants.resolve(
                definition.templateId, definition.extends,
            );
            this.resolveTheme(mergeThemeOverrides(parent.theme, definition.theme));
            this.resolveLayout(mergeLayoutOverrides(parent.layout, definition.layout));
        }
        this.templateVariants.register(definition);
        return this;
    }

    public listTemplateVariants(templateId?: string): TemplateVariantDefinition[] {
        if (templateId !== undefined) this.ensureTemplateVariants(templateId);
        return this.templateVariants.list(templateId);
    }

    public resolveTemplateVariant(
        templateId: string,
        variantId: string,
    ): ResolvedTemplateVariant {
        this.ensureTemplateVariants(templateId);
        return this.templateVariants.resolve(templateId, variantId);
    }

    /** Export the existing registry's portable, data-only JSON format. */
    public exportTemplateVariants(): string {
        return this.templateVariants.exportJSON();
    }

    /** Import only validated, portable JSON. No partial changes on failure. */
    public importTemplateVariants(json: string): this {
        // Parse/inheritance-check in a temporary registry first.
        const candidate = new TemplateVariantRegistry();
        candidate.importJSON(json);
        for (const item of candidate.list()) {
            if (this.templateVersions.list(item.templateId).length === 0) {
                this.getTemplate(item.templateId);
            }
            const resolved = candidate.resolve(item.templateId, item.id);
            if (resolved.themeProfile !== undefined &&
                this.themeProfiles.get(resolved.themeProfile) === undefined) {
                throw new TemplateVariantError(
                    `Unknown theme profile: ${resolved.themeProfile}`,
                );
            }
            this.resolveTheme(resolved.theme);
            this.resolveLayout(resolved.layout);
        }
        // Original registry import checks conflicts and is all-or-nothing.
        this.templateVariants.importJSON(json);
        return this;
    }

    // ---------------------------------------------------
    // ORGANIZATION VARIANTS
    // ---------------------------------------------------
    /** Each organization owns a separate registry; global custom variants are not inherited. */
    private organizationVariantRegistry(organizationId: string): TemplateVariantRegistry {
        assertOrganizationId(organizationId);
        const existing = this.organizationVariants.get(organizationId);
        if (existing !== undefined) return existing;
        if (this.organizationVariants.size >= MAX_ORGANIZATIONS_PER_ENGINE) {
            throw new TemplateVariantError("Organization registry limit exceeded");
        }
        const created = new TemplateVariantRegistry();
        this.organizationVariants.set(organizationId, created);
        return created;
    }

    /** Seed only MailForge's four built-in variants, never global custom variants. */
    private ensureOrganizationVariants(
        organizationId: string,
        templateId: string,
    ): TemplateVariantRegistry {
        this.ensureTemplateVariants(templateId); // Also checks that the template exists.
        const registry = this.organizationVariantRegistry(organizationId);
        const existing = new Set(registry.list(templateId).map(item => item.id));
        for (const preset of this.templateVariants.list(templateId)) {
            if (BUILTIN_VARIANT_IDS.has(preset.id) && !existing.has(preset.id)) {
                registry.register(preset);
            }
        }
        return registry;
    }

    /** Register a design visible only inside the named organization. */
    public registerOrganizationTemplateVariant(
        organizationId: string,
        definition: TemplateVariantDefinition,
    ): this {
        assertOrganizationId(organizationId);
        const registry = this.ensureOrganizationVariants(organizationId, definition.templateId);
        if (definition.themeProfile !== undefined &&
            this.themeProfiles.get(definition.themeProfile) === undefined) {
            throw new TemplateVariantError(`Unknown theme profile: ${definition.themeProfile}`);
        }
        const inherited = definition.extends === undefined
            ? undefined
            : registry.resolve(definition.templateId, definition.extends);
        this.resolveTheme(mergeThemeOverrides(inherited?.theme, definition.theme));
        this.resolveLayout(mergeLayoutOverrides(inherited?.layout, definition.layout));
        registry.register(definition);
        return this;
    }

    public resolveOrganizationTemplateVariant(
        organizationId: string,
        templateId: string,
        variantId: string,
    ): ResolvedTemplateVariant {
        return this.ensureOrganizationVariants(organizationId, templateId)
            .resolve(templateId, variantId);
    }

    public listOrganizationTemplateVariants(
        organizationId: string,
        templateId: string,
    ): TemplateVariantDefinition[] {
        return this.ensureOrganizationVariants(organizationId, templateId)
            .list(templateId);
    }

    /** Serializable data to save in the caller's DB/file; built-in presets are omitted. */
    public exportOrganizationTemplateVariants(organizationId: string): string {
        assertOrganizationId(organizationId);
        const variants = (this.organizationVariants.get(organizationId)?.list() ?? [])
            .filter(item => !BUILTIN_VARIANT_IDS.has(item.id));
        return JSON.stringify({ schemaVersion: 1, organizationId, variants }, null, 2);
    }

    /** Atomic import. Rejects exports intended for a different organization. */
    public importOrganizationTemplateVariants(
        organizationId: string,
        json: string,
    ): this {
        assertOrganizationId(organizationId);
        if (typeof json !== "string" || json.length > 2_000_000) {
            throw new TemplateVariantError("Invalid organization variant JSON size");
        }
        let parsed: unknown;
        try {
            parsed = JSON.parse(json) as unknown;
        } catch {
            throw new TemplateVariantError("Invalid organization variant JSON");
        }
        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new TemplateVariantError("Invalid organization variant export");
        }
        const record = parsed as Record<string, unknown>;
        if (record.schemaVersion !== 1 || record.organizationId !== organizationId ||
            !Array.isArray(record.variants)) {
            throw new TemplateVariantError("Organization or schema mismatch in variant export");
        }
        const rows = record.variants as unknown[];
        const candidate = new TemplateVariantRegistry();
        const existing = this.organizationVariants.get(organizationId);
        if (existing !== undefined) candidate.importJSON(existing.exportJSON());

        // Seed built-in parents in a detached registry; do not mutate tenant state.
        for (const raw of rows) {
            if (raw === null || typeof raw !== "object" || Array.isArray(raw) ||
                typeof (raw as Record<string, unknown>).templateId !== "string") {
                throw new TemplateVariantError("Invalid organization variant entry");
            }
            const templateId = (raw as { templateId: string }).templateId;
            this.ensureTemplateVariants(templateId);
            const already = new Set(candidate.list(templateId).map(item => item.id));
            for (const preset of this.templateVariants.list(templateId)) {
                if (BUILTIN_VARIANT_IDS.has(preset.id) && !already.has(preset.id)) {
                    candidate.register(preset);
                }
            }
        }
        candidate.importJSON(JSON.stringify({ schemaVersion: 1, variants: rows }));
        // Validate inherited tokens/profile names before committing anything.
        for (const raw of rows) {
            const entry = raw as TemplateVariantDefinition;
            const resolved = candidate.resolve(entry.templateId, entry.id);
            if (resolved.themeProfile !== undefined &&
                this.themeProfiles.get(resolved.themeProfile) === undefined) {
                throw new TemplateVariantError(`Unknown theme profile: ${resolved.themeProfile}`);
            }
            this.resolveTheme(resolved.theme);
            this.resolveLayout(resolved.layout);
        }
        if (existing === undefined && this.organizationVariants.size >= MAX_ORGANIZATIONS_PER_ENGINE) {
            throw new TemplateVariantError("Organization registry limit exceeded");
        }
        this.organizationVariants.set(organizationId, candidate);
        return this;
    }

    // ---------------------------------------
    // CUSTOM TEMPLATE REGISTRATION
    // ---------------------------------------

    /** Publish one immutable document version for this email engine. */
    public registerTemplateVersion(document: EmailDocument): this {
        if (isDomainTemplateName(document.id)) {
            throw new TemplateVersionError(
                `Use publishDomainTemplateVersion for data-driven templates: ${document.id}`,
            );
        }
        this.templateVersions.register(document);
        return this;
    }

    /** List available and deprecated versions, newest first. */
    public listTemplateVersions(templateId: string): TemplateVersionInfo[] {
        return this.templateVersions.list(templateId);
    }

    /** Return a detached copy of one published version. */
    public getTemplateVersion(
        templateId: string,
        version: string,
    ): EmailDocument {
        return this.templateVersions.get(templateId, version);
    }

    /** Find the latest, exact, or compatible published version. */
    public resolveTemplateVersion(
        templateId: string,
        selection: TemplateVersionSelection = {},
    ): EmailDocument {
        return this.templateVersions.resolve(templateId, selection);
    }

    /** Retain the version but exclude it from default resolution. */
    public deprecateTemplateVersion(
        templateId: string,
        version: string,
        reason?: string,
    ): this {
        this.templateVersions.deprecate(templateId, version, reason);
        return this;
    }

    /**
     * Save a reusable immutable snapshot of a custom template or a
     * non-data-driven core built-in template. Current rendering is unaffected.
     *
     * Do not save materialized invoice/order/security customer data in a
     * shared registry: those templates need data at render time.
     */
    public publishTemplateVersion(
        templateId: string,
        version?: string,
    ): this {
        const custom = this.templates.get(templateId);
        if (custom) {
            return this.registerTemplateVersion({
                ...structuredClone(custom),
                version: version ?? custom.version,
            });
        }
        if (isBuiltinTemplateName(templateId)) {
            if (isDomainTemplateName(templateId)) {
                throw new TemplateVersionError(
                    `Data-driven template requires explicit safe version design: ${templateId}`,
                );
            }
            const document = getBuiltinTemplate(templateId);
            return this.registerTemplateVersion({
                ...document,
                version: version ?? document.version,
            });
        }
        if (listBuiltinTemplateCatalog().some(item => item.id === templateId)) {
            throw new TemplateVersionError(
                `Catalog template requires an explicit data-safe version document: ${templateId}`,
            );
        }
        throw new TemplateVersionError(`Template not found: ${templateId}`);
    }

    /**
     * Publish a newer immutable version by customizing a detached snapshot.
     * Optionally deprecate the old version after successful publication.
     */
    public migrateTemplateVersion(
        templateId: string,
        fromVersion: string,
        toVersion: string,
        customize: TemplateCustomizer,
        options: {
            readonly deprecateSource?: boolean;
            readonly reason?: string;
        } = {},
    ): this {
        if (isDomainTemplateName(templateId)) {
            throw new TemplateVersionError(
                `Data-driven versions cannot use document migration: ${templateId}`,
            );
        }
        this.templateVersions.migrate(
            templateId,
            fromVersion,
            toVersion,
            customize,
            options,
        );
        return this;
    }

    /**
     * Publish a versioned, reusable *style recipe* for one data-driven
     * core built-in (invoice, receipt, order or security alert).
     *
     * We store the canonical empty blueprint only. Customer data is
     * validated and materialized fresh for each render. Permanent edits
     * are deliberately limited to style-only update patches.
     */
    public publishDomainTemplateVersion(
        name: DomainTemplateName,
        version: string,
        patches: readonly DocumentPatch[] = [],
    ): this {
        if (!isDomainTemplateName(name)) {
            throw new TemplateVersionError(
                `Not a data-driven core template: ${String(name)}`,
            );
        }
        if (!Array.isArray(patches) || patches.length > 200) {
            throw new TemplateVersionError(
                "Domain version requires at most 200 styling patches",
            );
        }
        for (const patch of patches) {
            if (
                patch === null ||
                typeof patch !== "object" ||
                patch.op !== "update" ||
                patch.styles === undefined ||
                patch.props !== undefined ||
                patch.attrs !== undefined
            ) {
                throw new TemplateVersionError(
                    "Domain versions accept only style-only update patches",
                );
            }
        }

        const styles = structuredClone(patches);
        // Built with no user data: customer content never enters history.
        const blueprint = getBuiltinTemplate(name);
        this.templateVersions.register({ ...blueprint, version });
        this.domainVersionStyles.set(`${name}@${version}`, styles);
        return this;
    }

    public registerTemplate(
        document: EmailDocument,
    ): this {
        return this.storeTemplate(document, false);
    }

    /**
     * Persistently replace a registered template or a packaged
     * template with the same id. The supplied document is cloned,
     * so later caller mutations cannot affect future renders.
     */
    public overrideTemplate(
        document: EmailDocument,
    ): this {
        return this.storeTemplate(document, true);
    }

    /**
     * Derive and persist a template without mutating its source.
     *
     * The source can be either a packaged template or a previously
     * registered custom template. The callback may mutate the draft
     * or return a replacement document.
     */
    public extendTemplate(
        templateId: string,
        customize: TemplateCustomizer,
    ): this {
        if (typeof customize !== "function") {
            throw new TypeError("Template customize must be a function");
        }

        const draft = this.getTemplate(templateId);
        const modified = customize(draft) ?? draft;

        if (
            modified === null ||
            typeof modified !== "object" ||
            modified.id !== templateId ||
            !Array.isArray(modified.body)
        ) {
            throw new Error(
                `Invalid extended template: ${templateId}`,
            );
        }

        return this.overrideTemplate(modified);
    }

    /** Remove a custom template, revealing a packaged template if one exists. */
    public unregisterTemplate(templateId: string): boolean {
        return this.templates.delete(templateId);
    }

    private storeTemplate(
        document: EmailDocument,
        replace: boolean,
    ): this {
        const validationCopy =
            prepareTemplateForValidation(document);

        this.validator.validateOrThrow(validationCopy);

        if (!replace && this.templates.has(document.id)) {
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
     * Preserve the existing behavior:
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

        // Keep the original core API intact while allowing discovery of
        // all packaged documents. An unmaterialized document is intended
        // for inspection; render() validates its corresponding data contract.
        const match = listBuiltinTemplateCatalog().find(item => item.id === templateId);
        if (match) return getBuiltinCatalogTemplate(match.id);

        throw new Error(`Template not found: ${templateId}`);
    }

    // ---------------------------------------
    // EMAIL RENDERING
    // ---------------------------------------


    public async render(
        templateId: string,
        options: TemplateRenderOptions = {},
    ): Promise<RenderResult> {
        // Opt-in: existing calls keep using the original resolution path.
        if (options.templateVersion !== undefined) {
            const document = this.resolveTemplateVersion(
                templateId,
                options.templateVersion,
            );

            // Core built-ins must never skip their Zod data contract.
            if (isBuiltinTemplateName(templateId)) {
                const validated = this.validateTemplateData(
                    templateId,
                    options.data,
                );
                if (isDomainTemplateName(templateId)) {
                    const styles = this.domainVersionStyles.get(
                        `${templateId}@${document.version}`,
                    );
                    if (styles === undefined) {
                        throw new TemplateVersionError(
                            `No safe data-driven recipe for: ${templateId}@${document.version}`,
                        );
                    }
                    // Use the existing domain builder and prepared pipeline.
                    // Caller's one-off patches run after the saved styles.
                    return this.renderValidatedBuiltin(
                        templateId,
                        validated,
                        {
                            ...options,
                            patches: [
                                ...structuredClone(styles),
                                ...(options.patches ?? []),
                            ],
                        },
                    );
                }
                return this.renderPipeline(
                    document,
                    { ...options, data: validated as TemplateData },
                    false,
                );
            }

            return this.renderDocument(document, options);
        }

        if (this.templates.has(templateId)) {
            return this.renderDocument(
                this.getTemplate(templateId),
                options,
            );
        }

        // Catalog templates share a lightweight, strict data contract.
        if (isCatalogTemplateName(templateId)) {
            const document = buildCatalogTemplate(templateId, options.data);
            if (options.data === undefined) {
                throw new Error(`Template data required: ${templateId}`);
            }
            return this.renderPipeline(document, options, true);
        }

        // Specialized templates use their existing individual Zod schemas.
        // Materialize them once and do not reinterpret user copy as variables.
        if ((listSpecializedTemplates().map(item => item.id) as string[]).includes(templateId)) {
            if (options.data === undefined) {
                throw new Error(`Template data required: ${templateId}`);
            }
            let document: EmailDocument;
            switch (templateId) {
                case "newsletter":
                    document = buildNewsletterTemplate(newsletterSchema.parse(options.data));
                    break;
                case "promotion":
                    document = buildPromotionTemplate(promotionSchema.parse(options.data));
                    break;
                case "shipping-update":
                    document = buildShippingUpdateTemplate(shippingUpdateSchema.parse(options.data));
                    break;
                default:
                    throw new Error(`Unsupported specialized template: ${templateId}`);
            }
            return this.renderPipeline(document, options, true);
        }

        if (!isBuiltinTemplateName(templateId)) {
            throw new Error(`Template not found: ${templateId}`);
        }

        const validated = this.validateTemplateData(
            templateId,
            options.data,
        );

        return this.renderValidatedBuiltin(
            templateId,
            validated,
            options,
        );
    }

    /**
     * Type-safe helper that always renders the
     * packaged template, even if a custom
     * template has the same name.
     */

    public async renderBuiltin<Name extends BuiltinTemplateName>(
        name: Name,
        data: BuiltinTemplateDataMap[Name],
        options: Omit<TemplateRenderOptions, "data"> = {},
    ): Promise<RenderResult> {
        const validated = this.validateTemplateData(name, data);

        return this.renderValidatedBuiltin(
            name,
            validated,
            options,
        );
    }

    /**
     * Existing structured-document pipeline
     * from the baseline rendering flow.
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
     * All nine official templates use this path.
     * Domain data is materialized only once.
     */
    private async renderValidatedBuiltin(
        name: BuiltinTemplateName,
        data: ValidatedBuiltinTemplateDataMap[BuiltinTemplateName],
        options: Omit<TemplateRenderOptions, "data">,
        customize?: TemplateCustomizer,
    ): Promise<RenderResult> {
        const domain = isDomainTemplateName(name);

        const source = domain
            ? buildParsedDomainTemplate(
                name,
                data as ParsedDomainTemplateDataMap[DomainTemplateName],
            )
            : getBuiltinTemplate(name);

        const draft = structuredClone(source);
        const modified = customize?.(draft) ?? draft;

        if (
            modified === null ||
            typeof modified !== "object" ||
            modified.id !== name ||
            !Array.isArray(modified.body)
           ) {
            throw new Error(
                `Invalid customized built-in template: ${name}`,
            );
        }

        this.validator.validateOrThrow(
            prepareTemplateForValidation(modified),
        );

        return this.renderPipeline(
            structuredClone(modified),
            {
                ...options,
                data: data as TemplateData,
            },
            domain,
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
        // Variants apply in the shared pipeline, including all render entry points.
        if (options.organizationId !== undefined) {
            assertOrganizationId(options.organizationId);
        }
        const variant = options.variant === undefined
            ? undefined
            : options.organizationId === undefined
                ? this.resolveTemplateVariant(document.id, options.variant)
                : this.resolveOrganizationTemplateVariant(
                    options.organizationId, document.id, options.variant,
                );
        // Layout presets are opt-in. Explicit caller overrides always win.
        const layoutPreset = options.layoutPreset === undefined
            ? undefined
            : getLayoutPreset(options.layoutPreset);
        const layout = this.resolveLayout(
            mergeLayoutOverrides(
                layoutPreset?.layout,
                variant?.layout,
                options.layout,
            ),
        );

        const profileId = options.themeProfile ?? variant?.themeProfile;
        const profile = profileId === undefined
            ? undefined
            : this.themeProfiles.get(profileId);

        if (
            profileId !== undefined &&
            profile === undefined
        ) {
            throw new TemplatePresetError(
                "themeProfile",
                `Unknown theme profile: ${profileId}`,
            );
        }

        if (options.themeVersion !== undefined && options.themeName === undefined) {
            throw new EmailThemeError("theme.version", "themeVersion requires themeName");
        }
        if (options.includeDeprecatedTheme !== undefined &&
            options.themeVersion === undefined) {
            throw new EmailThemeError("theme.version", "includeDeprecatedTheme requires themeVersion");
        }
        const baseTheme = options.themeName === undefined
            ? this.config.theme
            : options.themeVersion === undefined
                ? options.organizationId === undefined
                    ? this.resolveRegisteredTheme(options.themeName)
                    : this.resolveOrganizationTheme(options.organizationId, options.themeName)
                : this.resolvePublishedTheme(
                    options.themeName, options.themeVersion,
                    options.includeDeprecatedTheme === true, options.organizationId,
                );
        const theme = mergeEmailTheme(
            baseTheme,
            mergeThemeOverrides(layoutPreset?.theme, profile, variant?.theme, options.theme),
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

        // Translate before interpolation, so localized {{variables}} use the
        // existing safe variable resolver rather than a new interpolation path.
        const targetLocale = normalizeEmailLocale(options.locale ?? document.locale ?? this.defaultLocale);
        const localized = localizeEmailDocument(
            withDefaults,
            targetLocale,
            this.localizations.resolve(targetLocale, document.id, options.fallbackLocale ?? this.fallbackLocale),
            {
                ...(options.direction !== undefined ? {direction: options.direction} : {}),
                allowVariables: !prepared,
            },
        );

        // 2. Only ordinary templates require another
        // interpolation pass. Domain data is complete.
        const interpolated = prepared
            ? localized
            : interpolateEmailDocument(
                localized,
                data,
            );

        // 3. Patch placeholders still use the supplied data.
        // Inherited variant patches run first. Call-specific patches run last.
        const patches = interpolateDocumentPatches(
            variant === undefined
                ? options.patches ?? []
                : [...(variant.patches ?? []), ...(options.patches ?? [])],
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

        // Apply reusable per-node overrides after component expansion so they
        // also reach the standard and composite components. Explicit styles
        // continue to win over theme defaults during applyEmailTheme().
        const overridden = applyDocumentOverrides(expanded, options.overrides);

        // Apply visibility after component expansion so nested actions,
        // headings and composite components respect the same controls.
        const visible = applyTemplateDisplay(
            overridden,
            options.display,
        );

        // 6. Apply brand/theme design tokens.
        // Trusted plugins may transform a cloned document, but cannot bypass
        // subsequent document validation, resource budgets or safe MJML rendering.
        const pluginDocument = this.plugins.beforeRender(visible);
        const themed = applyEmailTheme(
            pluginDocument,
            theme,
        );

        // 7. Validate once more after theme application.
        this.validator.validateOrThrow(themed);

        // Preserve the resource budget.
        assertRenderBudget(themed);

        // 9. Produce responsive HTML and plain text.
        const rendered = await this.mjmlRenderer.render(
            themed,
            {
                trust: options.trust ?? "safe",
                bodyBackgroundColor: themed.head?.bodyBackgroundColor ?? theme.colors.background,
                surfaceColor: theme.colors.surface,
                sectionColor: theme.colors.section,
                borderColor: theme.colors.border,
                ...(options.responsive !== undefined ? { responsive: options.responsive } : {}),
                ...(options.darkMode !== undefined ? { darkMode: options.darkMode } : {}),
                ...(options.darkModeColors !== undefined ? { darkModeColors: options.darkModeColors } : {}),
                containerWidth: theme.appearance.containerWidth,
                containerRadius: theme.appearance.cardRadius,

                ...(options.inlineCss !== undefined
                    ? { inlineCss: options.inlineCss }
                    : {}),
            },
        );
        this.plugins.afterRender(rendered);
        return rendered;
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

    // ---------------------------------------------------
    // REUSABLE REGISTERED THEMES
    // ---------------------------------------------------
    public registerTheme(definition: ThemeDefinition): this {
        this.themes.register(definition);
        return this;
    }

    public listRegisteredThemes(): string[] {
        return this.themes.list();
    }

    public resolveRegisteredTheme(name: string, overrides: ThemeOverrides = {}): ResolvedEmailTheme {
        return this.themes.resolve(name, overrides);
    }

    public exportRegisteredThemes(): string {
        return this.themes.exportJSON();
    }

    public importRegisteredThemes(json: string): this {
        this.themes.importJSON(json);
        return this;
    }

    private scopedThemes(organizationId: string): ThemeRegistry {
        assertOrganizationId(organizationId);
        const existing = this.organizationThemes.get(organizationId);
        if (existing) return existing;
        if (this.organizationThemes.size >= MAX_ORGANIZATIONS_PER_ENGINE) {
            throw new EmailThemeError("theme.organizationId", "organization theme registry limit exceeded");
        }
        const next = new ThemeRegistry();
        this.organizationThemes.set(organizationId, next);
        return next;
    }

    private scopedThemeVersions(organizationId: string): ThemeVersionRegistry {
        assertOrganizationId(organizationId);
        const existing = this.organizationThemeVersions.get(organizationId);
        if (existing) return existing;
        if (this.organizationThemeVersions.size >= MAX_ORGANIZATIONS_PER_ENGINE) {
            throw new EmailThemeError("theme.organizationId", "organization theme version limit exceeded");
        }
        const next = new ThemeVersionRegistry();
        this.organizationThemeVersions.set(organizationId, next);
        return next;
    }

    public registerOrganizationTheme(organizationId: string, definition: ThemeDefinition): this {
        this.scopedThemes(organizationId).register(definition);
        return this;
    }

    public resolveOrganizationTheme(
        organizationId: string,
        name: string,
        overrides: ThemeOverrides = {},
    ): ResolvedEmailTheme {
        assertOrganizationId(organizationId);
        // Do not fall back to global custom themes for organization-scoped requests.
        return this.scopedThemes(organizationId).resolve(name, overrides);
    }

    public exportOrganizationThemes(organizationId: string): string {
        assertOrganizationId(organizationId);
        return JSON.stringify({
            schemaVersion: 1,
            organizationId,
            themes: JSON.parse(this.scopedThemes(organizationId).exportJSON()) as unknown,
        });
    }

    public importOrganizationThemes(organizationId: string, json: string): this {
        assertOrganizationId(organizationId);
        if (typeof json !== "string" || json.length > 1_000_000) {
            throw new EmailThemeError("theme.import", "invalid or oversized JSON");
        }
        let input: unknown;
        try { input = JSON.parse(json) as unknown; }
        catch { throw new EmailThemeError("theme.import", "invalid JSON"); }
        if (typeof input !== "object" || input === null || Array.isArray(input)) {
            throw new EmailThemeError("theme.import", "expected a JSON object");
        }
        const root = input as Record<string, unknown>;
        if (Object.keys(root).some(key => !["schemaVersion", "organizationId", "themes"].includes(key)) ||
            root.schemaVersion !== 1 || root.organizationId !== organizationId) {
            throw new EmailThemeError("theme.import", "organization mismatch or unsupported schema");
        }
        const candidate = new ThemeRegistry();
        candidate.importJSON(JSON.stringify(root.themes));
        // Update only after the entire import passes validation.
        this.organizationThemes.set(organizationId, candidate);
        return this;
    }

    private selectedVersions(organizationId?: string): ThemeVersionRegistry {
        return organizationId === undefined
            ? this.themeVersions
            : this.scopedThemeVersions(organizationId);
    }

    public publishThemeVersion(name: string, version: string, organizationId?: string): this {
        const theme = organizationId === undefined
            ? this.themes.resolve(name)
            : this.resolveOrganizationTheme(organizationId, name);
        this.selectedVersions(organizationId).publish(name, version, theme);
        return this;
    }

    public listThemeVersions(name: string, organizationId?: string): ThemeVersionInfo[] {
        return this.selectedVersions(organizationId).list(name);
    }

    public resolvePublishedTheme(
        name: string,
        version: string,
        includeDeprecated = false,
        organizationId?: string,
    ): ResolvedEmailTheme {
        return this.selectedVersions(organizationId).resolve(name, version, includeDeprecated);
    }

    public deprecateThemeVersion(
        name: string,
        version: string,
        reason?: string,
        organizationId?: string,
    ): this {
        this.selectedVersions(organizationId).deprecate(name, version, reason);
        return this;
    }

    public migrateThemeVersion(
        name: string,
        from: string,
        to: string,
        overrides: ThemeOverrides,
        deprecateSource = false,
        organizationId?: string,
    ): this {
        this.selectedVersions(organizationId).migrate(name, from, to, overrides, deprecateSource);
        return this;
    }

    /** Register a reusable theme for this engine. */
    public registerThemeProfile(
        name: string,
        theme: ThemeOverrides,
    ): this {
        this.resolveTheme(theme);
        this.themeProfiles.register(name, theme);
        return this;
    }

    public getThemeProfile(
        name: string,
    ): ThemeOverrides | undefined {
        return this.themeProfiles.get(name);
    }

    public listThemeProfiles(): string[] {
        return this.themeProfiles.list();
    }

    /** Register one reusable built-in template preset. */
    public registerTemplatePreset<Name extends BuiltinTemplateName>(
        definition: TemplatePresetDefinition<Name>,
    ): this {
        if (
            definition.themeProfile !== undefined &&
            this.themeProfiles.get(definition.themeProfile) === undefined
        ) {
            throw new TemplatePresetError(
                "themeProfile",
                `Unknown theme profile: ${definition.themeProfile}`,
            );
        }

        if (definition.theme !== undefined) {
            this.resolveTheme(definition.theme);
        }

        if (definition.layout !== undefined) {
            this.resolveLayout(definition.layout);
        }

        this.templatePresets.register(definition);
        return this;
    }

    public listTemplatePresets(): TemplatePresetInfo[] {
        return this.templatePresets.list();
    }

    public getTemplatePreset(
        name: string,
    ): TemplatePresetDefinition | undefined {
        return this.templatePresets.get(name);
    }

    /** Render saved customization with fresh validated data. */
    public async renderPreset(
        presetId: string,
        data: unknown,
        options: Omit<TemplateRenderOptions, "data"> = {},
    ): Promise<RenderResult> {
        const preset = this.templatePresets.get(presetId);

        if (!preset) {
            throw new TemplatePresetError(
                "id",
                `Preset not found: ${presetId}`,
            );
        }

        const themeProfile =
            options.themeProfile ?? preset.themeProfile;

        const merged: Omit<TemplateRenderOptions, "data"> = {
            ...options,

            ...(themeProfile !== undefined
                ? { themeProfile }
                : {}),

            theme: mergeThemeOverrides(
                preset.theme,
                options.theme,
            ),

            layout: mergeLayoutOverrides(
                preset.layout,
                options.layout,
            ),

            patches: [
                ...(preset.patches ?? []),
                ...(options.patches ?? []),
            ],
        };

        return this.renderCustomizedBuiltin(
            preset.template,
            data as BuiltinTemplateDataMap[BuiltinTemplateName],
            draft => preset.customize?.(draft),
            merged,
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

    /** Register a reusable component library on this engine. */
    public registerComponents(
        definitions: readonly ReusableComponentDefinition[],
    ): this {
        for (const definition of definitions) {
            this.registerComponent(definition);
        }

        return this;
    }

    /** Replace a registered reusable component for this engine. */
    public overrideComponent(
        definition: ReusableComponentDefinition,
    ): this {
        this.componentCatalog.replace(definition);
        return this;
    }

    /** Remove a registered reusable component from this engine. */
    public unregisterComponent(name: string): boolean {
        return this.componentCatalog.unregister(name);
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
