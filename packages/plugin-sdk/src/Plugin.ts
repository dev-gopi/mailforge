import type { EmailDocument, RenderResult } from "@mailforge/core";
import type { ReusableComponentDefinition } from "@mailforge/components";

export interface MailForgePluginHost {
    /** Each registration is restricted to its own engine instance. */
    registerTemplate(document: EmailDocument): unknown;
    registerComponent(definition: ReusableComponentDefinition): unknown;
}

/** Plugins are trusted application code, never untrusted user content. */
export interface MailForgePlugin {
    readonly name: string;
    readonly version: string;
    setup(host: MailForgePluginHost): void;
    /** Called on an independent draft, before final validation and rendering. */
    beforeRender?(draft: EmailDocument): EmailDocument | void;
    /** Observational hook: its input is a clone, never the returned email. */
    afterRender?(result: Readonly<RenderResult>): void;
}

export class MailForgePluginError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "MailForgePluginError";
    }
}
