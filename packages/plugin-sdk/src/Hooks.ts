import type { EmailDocument, RenderResult } from "@mailforge/core";
import type { MailForgePlugin, MailForgePluginHost } from "./Plugin.js";
import { MailForgePluginError } from "./Plugin.js";

const PLUGIN_NAME = /^[a-z][a-z0-9._-]{0,79}$/;

export class PluginRegistry {
    private readonly plugins = new Map<string, MailForgePlugin>();

    public use(plugin: MailForgePlugin, host: MailForgePluginHost): this {
        if (!PLUGIN_NAME.test(plugin.name) || !/^\d+\.\d+\.\d+$/.test(plugin.version)) {
            throw new MailForgePluginError("Plugin name or version is invalid");
        }
        if (this.plugins.has(plugin.name)) {
            throw new MailForgePluginError(`Plugin already installed: ${plugin.name}`);
        }
        if (this.plugins.size >= 50) throw new MailForgePluginError("Maximum plugin count exceeded");
        if (typeof plugin.setup !== "function") throw new MailForgePluginError("Plugin setup must be a function");
        // Important: only install plugins written by trusted application developers.
        // Their registration side effects cannot be rolled back if setup throws.
        try {
            plugin.setup(host);
        } catch (error) {
            throw new MailForgePluginError(`Plugin setup failed (${plugin.name}): ${String(error)}`);
        }
        this.plugins.set(plugin.name, plugin);
        return this;
    }

    public list(): ReadonlyArray<{ name: string; version: string }> {
        return [...this.plugins.values()].map(p => ({ name: p.name, version: p.version }));
    }

    public beforeRender(source: EmailDocument): EmailDocument {
        let document = structuredClone(source);
        for (const plugin of this.plugins.values()) {
            if (!plugin.beforeRender) continue;
            try {
                const draft = structuredClone(document);
                const modified = plugin.beforeRender(draft);
                document = structuredClone(modified ?? draft);
            } catch (error) {
                throw new MailForgePluginError(`beforeRender failed (${plugin.name}): ${String(error)}`);
            }
        }
        return document;
    }

    public afterRender(source: RenderResult): void {
        for (const plugin of this.plugins.values()) {
            if (!plugin.afterRender) continue;
            try {
                plugin.afterRender(structuredClone(source));
            } catch (error) {
                throw new MailForgePluginError(`afterRender failed (${plugin.name}): ${String(error)}`);
            }
        }
    }
}
