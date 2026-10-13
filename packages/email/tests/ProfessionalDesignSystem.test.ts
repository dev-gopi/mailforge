import { describe, expect, it } from "vitest";
import { DocumentValidator } from "@mailforge/core";
import {
  getBuiltinCatalogTemplate,
  listBuiltinTemplateCatalog,
  buildCatalogTemplate,
  listCatalogTemplates,
} from "@mailforge/templates";
import {
  createEmail,
  resolveEmailTheme,
  applyEmailTheme,
} from "../src/index.js";

describe("Professional email design system", () => {
  it("audits all registered catalog documents individually", () => {
    const validator = new DocumentValidator();
    const catalog = listBuiltinTemplateCatalog();
    expect(catalog).toHaveLength(100);
    for (const { id } of catalog) {
      const original = getBuiltinCatalogTemplate(id);
      expect(validator.validate(original).valid, id).toBe(true);
      const roles: string[] = [];
      const inspect = (nodes: typeof original.body): void => {
        for (const node of nodes) {
          const role = node.attrs?.["data-mf-style"];
          if (typeof role === "string") roles.push(role);
          if (node.children) inspect(node.children);
        }
      };
      inspect(original.body);
      expect(roles.length, `${id} should use common semantic styling`).toBeGreaterThan(0);
      expect(original.body.some(node => node.type === "raw-html"), id).toBe(false);
    }
  });

  it("applies theme dimensions and keeps source documents untouched", () => {
    const source = buildCatalogTemplate("payment-failed");
    const before = structuredClone(source);
    const theme = resolveEmailTheme({
      preset: "corporate",
      colors: { primary: "#9333ea", background: "#f4f2fa", border: "#ccd2dd" },
      appearance: { containerWidth: 640, contentPadding: 40, cardRadius: 14, buttonRadius: 9 },
    });
    const themed = applyEmailTheme(source, theme);
    const action = themed.body.find(node => node.id === "payment-failed-action");
    expect(action?.styles?.backgroundColor).toBe("#9333ea");
    expect(action?.styles?.borderRadius).toBe("9px");
    expect(action?.styles?.padding).toContain("40px");
    expect(source).toEqual(before);
    expect(theme.appearance.containerWidth).toBe(640);
  });

  it("rejects unsafe or oversized appearance overrides", () => {
    expect(() => resolveEmailTheme({ appearance: { containerWidth: 2000 } })).toThrow();
    expect(() => resolveEmailTheme({ appearance: { cardRadius: -1 } })).toThrow();
    expect(() => resolveEmailTheme({ appearance: { containerWidth: "600px" } })).toThrow();
  });

  it("renders a real catalog template with a branded shell", async () => {
    const email = createEmail({
      brand: { name: "Example Co." },
      theme: { preset: "corporate", colors: { primary: "#9333ea" },
        appearance: { containerWidth: 640, contentPadding: 40 } },
    });
    expect(email.listBuiltinCatalog()).toHaveLength(100);
    const result = await email.render("payment-failed", {
      data: { recipientName: "Gopi", actionUrl: "https://example.com/pay", detail: "Invoice 123" },
    });
    expect(result.subject).toBe("Payment unsuccessful");
    expect(result.html).toContain("#9333ea");
    expect(result.html).toContain("Gopi");
    expect(result.html).toContain("640px");
    expect(result.text).toContain("Gopi");
    expect(result.warnings).toHaveLength(0);
  });

  it("renders all 36 catalog templates through the public API", async () => {
    const email = createEmail({ theme: "modern" });
    for (const { id, title } of listCatalogTemplates()) {
      const result = await email.render(id, { data: {
        recipientName: "Gopi",
        actionUrl: "https://example.com/action",
        unsubscribeUrl: "https://example.com/unsubscribe",
        detail: "Reference: 12345",
      } });
      expect(result.subject, id).toBe(title);
      expect(result.html, id).toContain("Gopi");
      expect(result.text, id).toContain("Gopi");
      expect(result.html, id).toContain("https://example.com/action");
    }
  });

  it("renders every marketing catalog template with opt-out links", async () => {
    const email = createEmail({ theme: "minimal" });
    const all = listCatalogTemplates("marketing");
    expect(all.length).toBeGreaterThan(0);
    for (const { id } of all) {
      const result = await email.render(id, { data: {
        recipientName: "Gopi", actionUrl: "https://example.com/details",
        unsubscribeUrl: "https://example.com/unsubscribe",
      } });
      expect(result.html).toContain("Unsubscribe");
      expect(result.text).toContain("Gopi");
    }
  });
});
