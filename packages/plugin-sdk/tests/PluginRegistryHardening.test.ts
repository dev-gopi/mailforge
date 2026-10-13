import { describe, expect, it } from "vitest";
import { PluginRegistry, MailForgePluginError } from "../src/index.js";

describe("PluginRegistry lifecycle hardening", () => {
    const host = { registerTemplate() {}, registerComponent() {} };
    it("rejects malformed plugins and accepts proper SemVer identifiers", () => {
        const registry = new PluginRegistry();
        expect(() => registry.use(null as never, host)).toThrow(MailForgePluginError);
        expect(() => registry.use({ name: "INVALID NAME", version: "1.0.0", setup() {} }, host)).toThrow(MailForgePluginError);
        expect(() => registry.use({ name: "ok", version: "1.0.0", setup() {} }, host)).not.toThrow();
    });
    it("allows hook removal after a rolled back installation", () => {
        const registry = new PluginRegistry();
        registry.use({ name: "my-plugin", version: "1.0.0", setup() {} }, host);
        expect(registry.unuse("my-plugin")).toBe(true);
        expect(registry.list()).toEqual([]);
        expect(registry.unuse("my-plugin")).toBe(false);
    });
});
