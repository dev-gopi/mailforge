
import type {
    EmailAttributeValue,
} from "@mailforge/core";

export type LayoutAttributes =
    Record<string, EmailAttributeValue>;

export interface HeaderOptions {
    enabled?: boolean;
    title?: string;
    logo?: string;
    attrs?: LayoutAttributes;
}

export interface FooterOptions {
    enabled?: boolean;
    message?: string;
    supportEmail?: string;
    attrs?: LayoutAttributes;
}

export interface CopyrightOptions {
    enabled?: boolean;
    text?: string;
    year?: number | "auto";
    attrs?: LayoutAttributes;
}

export interface EmailLayoutOptions {
    header?: HeaderOptions;
    footer?: FooterOptions;
    copyright?: CopyrightOptions;
}

export interface ResolvedHeader {
    readonly enabled: boolean;
    readonly title?: string;
    readonly logo?: string;
    readonly attrs: Readonly<LayoutAttributes>;
}

export interface ResolvedFooter {
    readonly enabled: boolean;
    readonly message?: string;
    readonly supportEmail?: string;
    readonly attrs: Readonly<LayoutAttributes>;
}

export interface ResolvedCopyright {
    readonly enabled: boolean;
    readonly text: string;
    readonly year: number | "auto";
    readonly attrs: Readonly<LayoutAttributes>;
}

export interface ResolvedEmailLayout {
    readonly header: ResolvedHeader;
    readonly footer: ResolvedFooter;
    readonly copyright: ResolvedCopyright;
}

export class EmailLayoutError extends Error {
    public readonly code = "EMAIL_LAYOUT_INVALID";

    constructor(
        public readonly field: string,
        reason: string,
    ) {
        super(
            `Invalid MailForge layout at "${field}": ${reason}`,
        );
        this.name = "EmailLayoutError";
    }
}
