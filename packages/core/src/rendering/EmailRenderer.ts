
import type {
    EmailDocument,
} from "../document/EmailDocument.js";

export type RenderTrust = "safe" | "trusted";

export interface RenderOptions {
    trust?: RenderTrust;
    inlineCss?: boolean;
    /** MJML remains responsive by default; extra mobile rules can be disabled. */
    responsive?: boolean;
    /** Off by default to preserve existing email-client behavior. */
    darkMode?: "off" | "auto";
    /** Validated six-digit HEX colors used only in the opt-in dark stylesheet. */
    darkModeColors?: Partial<{
        background: string;
        surface: string;
        text: string;
        muted: string;
        border: string;
    }>;
    bodyBackgroundColor?: string;
    /** Validated theme-driven email shell; defaults for direct renderer callers. */
    surfaceColor?: string;
    /** Validated theme-driven content section background. */
    sectionColor?: string;
    borderColor?: string;
    containerWidth?: number;
    containerRadius?: number;
}

export interface RenderWarning {
    code: string;
    message: string;
}

export interface RenderResult {
    html: string;
    text: string;
    subject: string;
    preheader?: string;
    warnings: RenderWarning[];
}

export interface EmailRenderer<TInput = EmailDocument> {
    readonly name: string;

    render(
        document: TInput,
        options?: RenderOptions,
    ): Promise<RenderResult>;
}
