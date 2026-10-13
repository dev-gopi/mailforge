import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createEmail, MailForgePluginError } from "../src/index.js";
import type { MailForgePlugin, EmailDocument } from "../src/index.js";

const document: EmailDocument = {
    schemaVersion: "1.0", id: "plugin-greeting", version: "1.0.0",
    subject: "Greeting", body: [{ id: "plugin-title", type: "heading", props: { text: "Hello" } }],
};

describe("Task 7.9: plugins integrated into MailForgeEmail", () => {
    it("registers a plugin template and runs both hooks", async () => {
        let observed = 0;
        const plugin: MailForgePlugin = {
            name: "greeting-plugin", version: "1.0.0",
            setup(host) { host.registerTemplate(document); },
            beforeRender(draft) { draft.subject = "Plugin subject"; },
            afterRender(result) {
                observed++;
                (result as { subject: string }).subject = "Attempted mutation";
            },
        };
        const email = createEmail();
        email.usePlugin(plugin);
        expect(email.listPlugins()).toEqual([{ name: "greeting-plugin", version: "1.0.0" }]);
        const result = await email.render("plugin-greeting");
        expect(result.subject).toBe("Plugin subject");
        expect(result.html).toContain("Hello");
        expect(observed).toBe(1);
    });
    it("registers a plugin component", async () => {
        const email = createEmail();
        email.usePlugin({
            name: "extra-component", version: "1.0.0",
            setup(host) {
                host.registerComponent({
                    name: "plugin-message", version: "1.0.0", allowChildren: false,
                    schema: z.object({ label: z.string().min(1) }),
                    render: (props, context) => ({ id: context.nodeId, type: "text", props: { text: String(props.label) } }),
                });
            },
        });
        email.registerTemplate({ ...document, id: "plugin-component-test", body: [
            { id: "msg", type: "plugin-message", props: { label: "Sent from plugin" } },
        ] });
        expect((await email.render("plugin-component-test")).text).toContain("Sent from plugin");
    });
    it("rolls back registrations when a later registration conflicts", () => {
        const email = createEmail();
        email.registerTemplate({ ...document, id: "already-taken" });
        expect(() => email.usePlugin({
            name: "rollback-plugin", version: "1.0.0",
            setup(host) {
                host.registerTemplate(document);
                host.registerTemplate({ ...document, id: "already-taken" });
            },
        })).toThrow(MailForgePluginError);
        expect(email.listPlugins()).toEqual([]);
        expect(email.listTemplates()).toEqual(["already-taken"]);
    });
    it("does not install a plugin whose setup throws", () => {
        const email = createEmail();
        expect(() => email.usePlugin({
            name: "throws-plugin", version: "1.0.0",
            setup(host) { host.registerTemplate(document); throw new Error("broken"); },
        })).toThrow(MailForgePluginError);
        expect(email.listTemplates()).toEqual([]);
        expect(email.listPlugins()).toEqual([]);
    });
    it("keeps plugin state isolated per engine and rejects duplicates", () => {
        const a = createEmail();
        const b = createEmail();
        const plugin: MailForgePlugin = { name: "isolated", version: "1.0.0", setup(host) { host.registerTemplate(document); } };
        a.usePlugin(plugin);
        expect(b.listPlugins()).toEqual([]);
        expect(() => b.getTemplate("plugin-greeting")).toThrow();
        expect(() => a.usePlugin(plugin)).toThrow(MailForgePluginError);
    });
    it("runs validation after beforeRender and rejects invalid document mutations", async () => {
        const email = createEmail();
        email.usePlugin({ name: "invalid-output", version: "1.0.0", setup() {},
            beforeRender(draft) { draft.subject = ""; },
        });
        await expect(email.render("welcome", { data: { user: { firstName: "Priya" }, actionUrl: "https://example.com" } })).rejects.toThrow();
    });
});
