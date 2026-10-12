
import type {
  EmailThemeOptions,
  ResolvedEmailTheme,
} from "../theme/Theme.types.js";

/**
 * Brand options supplied by a developer.
 */
import type {
  EmailLayoutOptions,
  ResolvedEmailLayout,
} from "../layout/Layout.types.js";

export interface EmailBrandOptions {
  name?: string;
  logo?: string;
  website?: string;
  primaryColor?: string;
  supportEmail?: string;
}

export interface EmailConfigOptions
  extends EmailLayoutOptions {
  brand?: EmailBrandOptions;
  theme?: EmailThemeOptions;
}

/**
 * Final validated brand configuration.
 */
export interface ResolvedEmailBrand {
  readonly name: string;
  readonly primaryColor: string;
  readonly logo?: string;
  readonly website?: string;
  readonly supportEmail?: string;
}

/**
 * Final validated engine configuration.
 */
export interface ResolvedEmailConfig {
  readonly brand: Readonly<ResolvedEmailBrand>;
  readonly theme: ResolvedEmailTheme;
  readonly layout: ResolvedEmailLayout;
}

/**
 * Error for invalid global configuration.
 */
export class EmailConfigError extends Error {
  public readonly code = "EMAIL_CONFIG_INVALID";

  constructor(
    public readonly field: string,
    reason: string,
  ) {
    super(
      `Invalid MailForge config at "${field}": ${reason}`,
    );

    this.name = "EmailConfigError";
  }
}
