import { describe, expect, it } from "vitest";

import { DocumentValidator } from "@mailforge/core";

import {
  getBuiltinTemplate,
  getBuiltinTemplateInfo,
  listBuiltinTemplates,
  listTemplateCatalog,
} from "../src/index.js";

describe("MailForge Template Catalog", () => {
  it("1. keeps all five existing IDs", () => {
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

  it("2. groups authentication templates", () => {
    expect(
      listTemplateCatalog("authentication").map((item) => item.id),
    ).toEqual(["otp", "login", "password-reset"]);
  });

  it("3. groups account templates", () => {
    expect(listTemplateCatalog("account").map((item) => item.id)).toEqual([
      "welcome",
      "invitation",
    ]);
  });

  it("4. discovers the expanded billing and ecommerce categories", () => {
    expect(listTemplateCatalog("billing").map(item => item.id)).toEqual([
      "invoice", "payment-receipt",
    ]);
    expect(listTemplateCatalog("ecommerce").map(item => item.id)).toEqual([
      "order-confirmation",
    ]);
    expect(listTemplateCatalog("notifications").map(item => item.id)).toEqual([
      "notification", "security-alert",
    ]);
    expect(listTemplateCatalog("marketing")).toEqual([]);
  });

  it("5. preserves template versions", () => {
    for (const item of listTemplateCatalog()) {
      const document = getBuiltinTemplate(item.id);

      expect(document.id).toBe(item.id);
      expect(document.version).toBe(item.version);
      expect(item.version).toBe("1.0.0");
    }
  });

  it("6. produces valid structured documents", () => {
    const validator = new DocumentValidator();

    for (const item of listTemplateCatalog()) {
      expect(validator.validate(getBuiltinTemplate(item.id)).valid).toBe(true);
    }
  });

  it("7. returns independent documents and metadata", () => {
    const first = getBuiltinTemplate("welcome");
    const second = getBuiltinTemplate("welcome");

    first.body.find(node => node.id === "welcome-heading")!.props!.text =
      "Changed";

    expect(
      second.body.find(node => node.id === "welcome-heading")?.props?.text,
    ).toBe("Welcome to your new workspace.");

    const info = getBuiltinTemplateInfo("welcome");

    expect(info.category).toBe("account");

    const snapshot = listTemplateCatalog();

    Object.assign(snapshot[0]!, {
      title: "Modified",
    });

    expect(getBuiltinTemplateInfo("welcome").title).toBe("Welcome Email");
  });

  it("8. retains existing variable contracts", () => {
    const otp = getBuiltinTemplate("otp");
    const reset = getBuiltinTemplate("password-reset");

    expect(otp.body[2]?.type).toBe("section");
    expect(otp.body[2]?.children?.[0]?.children?.[1]?.type)
        .toBe("mf-otp-code");
    expect(otp.body[2]?.children?.[0]?.children?.[1]?.props?.code)
        .toBe("{{code}}");

    expect(reset.body[3]?.props?.href).toBe("{{resetUrl}}");

    expect(getBuiltinTemplate("notification").subject).toBe("{{title}}");
  });
});
