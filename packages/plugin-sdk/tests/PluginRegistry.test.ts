import { describe, expect, it } from "vitest";
import { PluginRegistry } from "../src/index.js";
import type { EmailDocument } from "@mailforge/core";

const document: EmailDocument = {
    schemaVersion: "1.0", id: "test", version: "1.0.0", subject: "Hello",
    body: [{ id: "message", type: "text", props: { text: "Hi" } }],
};

describe("plugin lifecycle", () => {
    it("prevents duplicate plugin IDs and protects original documents", () => {
        const registry = new PluginRegistry();
        const host = { registerTemplate() {}, registerComponent() {} };
        const plugin = {
            name: "my-plugin", version: "1.0.0", setup() {},
            beforeRender(draft: EmailDocument) { draft.subject = "Changed"; },
        };
        registry.use(plugin, host);
        expect(registry.beforeRender(document).subject).toBe("Changed");
        expect(document.subject).toBe("Hello");
        expect(() => registry.use(plugin, host)).toThrow(/already installed/);
    });
});
