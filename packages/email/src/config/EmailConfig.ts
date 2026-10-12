
/**
 * Settings the developer can provide.
 *
 * Every field is optional because MailForge
 * provides default branding.
 */
export interface EmailBrandOptions {
    name?: string;
    logo?: string;
    website?: string;
    primaryColor?: string;
    supportEmail?: string;
}

/**
 * Main configuration passed to createEmail().
 *
 * Themes, header, footer and copyright
 * options will be added in future tasks.
 */
export interface EmailConfigOptions {
    brand?: EmailBrandOptions;
}

/**
 * Final validated brand settings.
 *
 * Name and primary color are always available.
 */
export interface ResolvedEmailBrand {
    readonly name: string;
    readonly primaryColor: string;

    readonly logo?: string;
    readonly website?: string;
    readonly supportEmail?: string;
}

/**
 * Internal normalized engine configuration.
 */
export interface ResolvedEmailConfig {
    readonly brand: Readonly<ResolvedEmailBrand>;
}

/**
 * Structured error for invalid configuration.
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
