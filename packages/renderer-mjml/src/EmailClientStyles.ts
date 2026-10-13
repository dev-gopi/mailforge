/** Opt-in CSS enhancements layered on top of MJML's built-in responsive tables. */
export interface EmailClientStyleOptions {
    responsive?: boolean;
    darkMode?: "off" | "auto";
    darkModeColors?: Partial<EmailDarkColors>;
}
export interface EmailDarkColors {
    background: string;
    surface: string;
    text: string;
    muted: string;
    border: string;
}

const DEFAULT_DARK: EmailDarkColors = Object.freeze({
    background: "#111827",
    surface: "#1f2937",
    text: "#f9fafb",
    muted: "#cbd5e1",
    border: "#475569",
});
const HEX = /^#[0-9a-fA-F]{6}$/;

export function resolveEmailClientStyles(options: EmailClientStyleOptions = {}): {
    responsive: boolean;
    darkMode: "off" | "auto";
    dark: EmailDarkColors;
} {
    if (options.responsive !== undefined && typeof options.responsive !== "boolean") {
        throw new TypeError("responsive must be a boolean");
    }
    if (options.darkMode !== undefined && options.darkMode !== "off" && options.darkMode !== "auto") {
        throw new TypeError("darkMode must be off or auto");
    }
    const source = options.darkModeColors ?? {};
    if (!source || typeof source !== "object" || Array.isArray(source) ||
        (Object.getPrototypeOf(source) !== Object.prototype && Object.getPrototypeOf(source) !== null)) {
        throw new TypeError("darkModeColors must be a plain object");
    }
    for (const [key, color] of Object.entries(source)) {
        if (!Object.hasOwn(DEFAULT_DARK, key) || typeof color !== "string" || !HEX.test(color)) {
            throw new TypeError(`Invalid dark-mode color: ${key}`);
        }
    }
    return {
        responsive: options.responsive ?? false,
        darkMode: options.darkMode ?? "off",
        dark: { ...DEFAULT_DARK, ...source },
    };
}

/** This CSS is generated exclusively from validated tokens. No arbitrary CSS input. */
export function emailClientHead(options: EmailClientStyleOptions = {}): string {
    const config = resolveEmailClientStyles(options);
    const css: string[] = [];
    if (config.responsive) {
        css.push(`@media only screen and (max-width: 480px) {
  .mf-responsive-copy > div { line-height: 1.55 !important; }
  .mf-responsive-action table { width: 100% !important; }
  .mf-responsive-action td { text-align: center !important; }
}`);
    }
    if (config.darkMode === "auto") {
        const { background, surface, text, muted, border } = config.dark;
        css.push(`@media (prefers-color-scheme: dark) {
  .mf-email-shell { background-color: ${surface} !important; border-color: ${border} !important; }
  .mf-email-body { background-color: ${background} !important; }
  .mf-responsive-copy, .mf-responsive-copy > div { color: ${text} !important; }
  .mf-muted-copy, .mf-muted-copy > div { color: ${muted} !important; }
}`);
    }
    if (css.length === 0) return "";
    return `<mj-style>${css.join("\n")}</mj-style>`;
}
