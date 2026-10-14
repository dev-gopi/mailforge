import type { EmailNode } from "./EmailNode.js";

export interface EmailDocument {
    schemaVersion: "1.0";

    id: string;

    version: string;

    subject: string;

    preheader?: string | undefined;

    locale?: string | undefined;

    direction?: "ltr" | "rtl" | undefined;

    metadata?: Record<string, string> | undefined;

    head?: {
        title?: string | undefined;
        customCss?: string | undefined;
        /** Optional validated canvas color for renderers that support an email body background. */
        bodyBackgroundColor?: string | undefined;
    } | undefined;

    header?: EmailNode | undefined;

    body: EmailNode[];

    footer?: EmailNode | undefined;

    copyright?: EmailNode | undefined;
}
