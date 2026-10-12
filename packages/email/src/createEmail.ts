
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

  public async render(
    templateId: string,
    options: TemplateRenderOptions = {},
  ): Promise<RenderResult> {
    const document = this.getTemplate(templateId);

    return this.renderDocument(document, options);
  }

  public async renderDocument(
    document: EmailDocument,
    options: TemplateRenderOptions = {},
  ): Promise<RenderResult> {
    // 1. Resolve this email's layout.
    const layout = this.resolveLayout(
      options.layout ?? {},
    );

    // 2. Resolve this email's visual theme.
    const theme = this.resolveTheme(
      options.theme ?? {},
    );

    // 3. Generate missing branded sections.
    const withDefaults = applyDefaultLayout(
      document,
      this.config.brand,
      layout,
    );

    // 4. Apply developer patches atomically.
    const customized = this.customizer.apply(
      withDefaults,
      options.patches ?? [],
    );

    // 5. Apply theme defaults to all components.
    const themed = applyEmailTheme(
      customized,
      theme,
    );

    // 6. Render the completed document.
    return this.mjmlRenderer.render(
      themed,
      {
        trust: options.trust ?? "safe",
        bodyBackgroundColor: theme.colors.background,

        ...(options.inlineCss !== undefined
          ? {
              inlineCss: options.inlineCss,
            }
          : {}),
      },
    );
  }

  /**
   * Standalone HTML rendering retains its
   * existing behavior and trust policy.
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

export function createEmail(
  config: EmailConfigOptions = {},
): MailForgeEmail {
  return new MailForgeEmail(config);
}
