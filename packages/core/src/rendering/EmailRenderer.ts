
import type {
    EmailDocument,
} from "../document/EmailDocument.js";

export type RenderTrust = "safe" | "trusted";

export interface RenderOptions {
    trust?: RenderTrust;
    inlineCss?: boolean;
    bodyBackgroundColor?: string;
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
