
export {
    createEmail,
    MailForgeEmail,
} from "./createEmail.js";

export type {
    TemplateRenderOptions,
} from "./createEmail.js";

// Global configuration
export {
    EmailConfigError,
} from "./config/EmailConfig.js";

export {
    resolveEmailConfig,
} from "./config/ConfigResolver.js";

export type {
    EmailBrandOptions,
    EmailConfigOptions,
    ResolvedEmailBrand,
    ResolvedEmailConfig,
} from "./config/EmailConfig.js";

// Existing core types
export type {
    EmailDocument,
    EmailNode,
    DocumentPatch,
    RenderOptions,
    RenderResult,
} from "@mailforge/core";

// Existing HTML renderer input
export type {
    HtmlRenderInput,
} from "@mailforge/renderer-html";
