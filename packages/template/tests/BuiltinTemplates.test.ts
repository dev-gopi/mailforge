import { describe, expect, it } from "vitest";

import { DocumentValidator, type EmailNode } from "@mailforge/core";

import {
  getBuiltinTemplate,
  listBuiltinTemplates,
  isBuiltinTemplateName,
} from "../src/index.js";

describe("MailForge Built-in Templates", () => {
  const validator = new DocumentValidator();

  it("1. provides five built-in templates", () => {
    expect(listBuiltinTemplates()).toEqual([
      "welcome",
      "otp",
      "login",
      "password-reset",
      "invitation",
      "notification",
      "invoice",
      "payment-receipt",
      "order-confirmation",
      "security-alert",
    ]);
  });

  it("2. recognizes supported names", () => {
    expect(isBuiltinTemplateName("welcome")).toBe(true);

    expect(isBuiltinTemplateName("otp")).toBe(true);

    expect(isBuiltinTemplateName("unknown")).toBe(false);
  });

  it("3. creates valid email documents", () => {
    for (const name of listBuiltinTemplates()) {
      const document = getBuiltinTemplate(name);
      const result = validator.validate(document);

      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    }
  });

  it("4. uses the expected template IDs", () => {
    for (const name of listBuiltinTemplates()) {
      expect(getBuiltinTemplate(name).id).toBe(name);

      expect(getBuiltinTemplate(name).version).toBe("1.0.0");
    }
  });

  it("5. leaves branding and layout to the engine", () => {
    for (const name of listBuiltinTemplates()) {
      const document = getBuiltinTemplate(name);

      expect(document.header).toBeUndefined();
      expect(document.footer).toBeUndefined();
      expect(document.copyright).toBeUndefined();
      expect(document.body.length).toBeGreaterThan(0);
    }
  });

  it("6. returns independent document instances", () => {
    const first = getBuiltinTemplate("welcome");
    const second = getBuiltinTemplate("welcome");

    first.body.find(node => node.id === "welcome-heading")!.props!.text =
      "Changed";

    expect(
      second.body.find(node => node.id === "welcome-heading")?.props?.text,
    ).toBe("Welcome to your new workspace.");
  });

  it("7. uses unique nodes without raw HTML", () => {
    for (const name of listBuiltinTemplates()) {
      const ids = new Set<string>();
      const document = getBuiltinTemplate(name);

      const visit = (node: EmailNode): void => {
        expect(ids.has(node.id)).toBe(false);
        ids.add(node.id);

        expect(node.type).not.toBe("raw-html");

        node.children?.forEach(visit);
      };

      document.body.forEach(visit);
    }
  });
});
