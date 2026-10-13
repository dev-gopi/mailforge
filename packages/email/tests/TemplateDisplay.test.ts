import { describe, expect, it } from "vitest";
import { createEmail, applyTemplateDisplay, TemplateDisplayError } from "../src/index.js";
import { getBuiltinTemplate, getBuiltinCatalogTemplate, listBuiltinTemplateCatalog } from "@mailforge/templates";

const welcome = { user: { firstName: "Priya" }, actionUrl: "https://example.com/start" };
const catalogData = {
  recipientName: "Priya", actionUrl: "https://example.com/action",
  unsubscribeUrl: "https://example.com/unsubscribe", detail: "Reference 123",
};

describe("Professional per-render customization", () => {
  it("hides the content heading but preserves the branded header and subject", async () => {
    const email = createEmail({ brand: { name: "Acme" } });
    const result = await email.render("welcome", {
      data: welcome, display: { heading: false },
    });
    expect(result.html).not.toContain("Welcome to your new workspace.");
    expect(result.html).toContain("Acme");
    expect(result.html).toContain("Open Your Dashboard");
    expect(result.subject).toBe("Welcome, Priya!");
  });

  it("allows the company heading to disappear without removing the logo", async () => {
    const email = createEmail({
      brand: { name: "Acme", logo: "https://example.com/logo.png" },
    });
    const result = await email.render("welcome", {
      data: welcome,
      layout: { footer: { enabled: false }, copyright: { enabled: false } },
      display: { headerTitle: false },
    });
    expect(result.html).toContain("https://example.com/logo.png");
    // The company logo may include the name in its ALT attribute, but
    // its visible text heading must not appear in the text fallback.
    expect(result.text).not.toContain("Acme");
  });

  it("hides optional catalog sections and preserves the marketing unsubscribe", async () => {
    const email = createEmail();
    const result = await email.render("product-launch", {
      data: catalogData,
      display: { heading: false, eyebrow: false, primaryAction: false, footer: false },
    });
    expect(result.html).not.toContain("NEWS & OFFERS");
    expect(result.html).not.toContain("Explore product");
    expect(result.html).toContain("Unsubscribe from marketing emails");
    expect(result.html).not.toContain("Sent by MailForge");
  });

  it("supports per-render body copy, link styles, arbitrary node removal and subject", async () => {
    const result = await createEmail().render("welcome", {
      data: welcome,
      patches: [{ op: "update", target: "welcome-action", props: { text: "Go to Console" }, styles: { backgroundColor: "#14532d" } }],
      display: { hideIds: ["welcome-tip"], subject: "An Acme welcome", preheader: null },
    });
    expect(result.html).toContain("Go to Console");
    expect(result.html).toContain("#14532d");
    expect(result.html).not.toContain("A little tip to get started");
    expect(result.subject).toBe("An Acme welcome");
    expect(result.preheader).toBeUndefined();
  });

  it("does not change source or later render calls", async () => {
    const email = createEmail();
    const document = getBuiltinTemplate("welcome");
    const source = structuredClone(document);
    const filtered = applyTemplateDisplay(document, { heading: false });
    expect(document).toEqual(source);
    expect(filtered.body.some(n => n.id === "welcome-heading")).toBe(false);
    const first = await email.render("welcome", { data: welcome, display: { heading: false } });
    const second = await email.render("welcome", { data: welcome });
    expect(first.html).not.toContain("Welcome to your new workspace.");
    expect(second.html).toContain("Welcome to your new workspace.");
  });

  it("keeps a promo code even when all narrative headings are hidden", () => {
    const document = getBuiltinCatalogTemplate("promotion");
    const filtered = applyTemplateDisplay(document, { heading: false });
    expect(filtered.body.some(n => n.id === "promo-title")).toBe(false);
    expect(filtered.body.some(n => n.id === "promo-code-box")).toBe(true);
  });

  it("supports optional heading removal in all 49 registered templates", () => {
    const catalog = listBuiltinTemplateCatalog();
    expect(catalog).toHaveLength(49);
    for (const { id } of catalog) {
      const original = getBuiltinCatalogTemplate(id);
      const output = applyTemplateDisplay(original, { heading: false, eyebrow: false });
      const visit = (nodes: typeof output.body) => {
        for (const node of nodes) {
          const role = node.attrs?.["data-mf-style"];
          expect(role, `${id}:${node.id}`).not.toBe("title");
          expect(role, `${id}:${node.id}`).not.toBe("eyebrow");
          node.children && visit(node.children);
        }
      };
      visit(output.body);
      expect(output.subject, id).toBe(original.subject);
      expect(original.body.length, id).toBeGreaterThan(0);
    }
  });

  it("rejects unknown component IDs and unsafe header overrides", () => {
    const document = getBuiltinTemplate("welcome");
    expect(() => applyTemplateDisplay(document, { hideIds: ["not-a-node"] })).toThrow(TemplateDisplayError);
    expect(() => applyTemplateDisplay(document, { subject: "Hello\nBcc: stolen@example.com" })).toThrow(TemplateDisplayError);
    expect(() => applyTemplateDisplay(document, { heading: "false" as unknown as boolean })).toThrow(TemplateDisplayError);
    expect(() => applyTemplateDisplay(document, { preheader: "\r" })).toThrow(TemplateDisplayError);
  });
});
