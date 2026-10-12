
/**
 * Names of the built-in themes.
 */
export type ThemePreset =
    | "modern"
    | "minimal"
    | "corporate";

/**
 * Colors available in every theme.
 */
export interface ThemeColors {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    muted: string;
    border: string;
}

/**
 * Typography settings.
 *
 * Font sizes use pixels.
 * Line height is a unitless multiplier.
 */
export interface ThemeTypography {
    fontFamily: string;
    headingFontFamily: string;
    baseSize: number;
    headingSize: number;
    lineHeight: number;
}

/**
 * Spacing values are in pixels.
 */
export interface ThemeSpacing {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
}

/**
 * Developers can override only the tokens
 * they want to change.
 */
export interface ThemeOverrides {
    colors?: Partial<ThemeColors>;
    typography?: Partial<ThemeTypography>;
    spacing?: Partial<ThemeSpacing>;
}

/**
 * Full theme input at engine initialization.
 */
export interface ThemeConfiguration
    extends ThemeOverrides {
    preset?: ThemePreset;
}

export type EmailThemeOptions =
    | ThemePreset
    | ThemeConfiguration;

/**
 * Complete theme after applying defaults
 * and validating overrides.
 */
export interface ResolvedEmailTheme {
    readonly preset: ThemePreset;
    readonly colors: Readonly<ThemeColors>;
    readonly typography: Readonly<ThemeTypography>;
    readonly spacing: Readonly<ThemeSpacing>;
}

/**
 * Dedicated error for theme configuration.
 */
export class EmailThemeError extends Error {
    public readonly code = "EMAIL_THEME_INVALID";

    constructor(
        public readonly field: string,
        reason: string,
    ) {
        super(
            `Invalid MailForge theme at "${field}": ${reason}`,
        );

        this.name = "EmailThemeError";
    }
}
