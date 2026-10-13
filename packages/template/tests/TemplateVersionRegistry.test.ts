import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  EmailDocument,
} from "@mailforge/core";

import {
  getBuiltinTemplate,
  TemplateVersionError,
  TemplateVersionRegistry,
} from "../src/index.js";

function document(
  version: string,
): EmailDocument {
  return {
    schemaVersion: "1.0",
    id: "newsletter",
    version,
    subject: `Newsletter ${version}`,
    body: [
      {
        id: "message",
        type: "text",
        props: {
          text: "Original",
        },
      },
    ],
  };
}

describe("Template Version Registry", () => {
  it("stores and resolves multiple versions", () => {
    const registry = new TemplateVersionRegistry();

    registry.register(document("1.9.0"));
    registry.register(document("1.10.0"));
    registry.register(document("2.0.0"));

    expect(
      registry.list("newsletter").map(
        item => item.version,
      ),
    ).toEqual([
      "2.0.0",
      "1.10.0",
      "1.9.0",
    ]);

    expect(
      registry.resolve("newsletter").version,
    ).toBe("2.0.0");

    expect(
      registry.resolve("newsletter", {
        compatibleWith: "1.0.0",
      }).version,
    ).toBe("1.10.0");

    expect(
      registry.resolve("newsletter", {
        version: "1.9.0",
      }).version,
    ).toBe("1.9.0");
  });

  it("protects published documents", () => {
    const registry = new TemplateVersionRegistry();
    const input = document("1.0.0");

    registry.register(input);

    input.subject = "Changed after registration";

    const returned = registry.get(
      "newsletter",
      "1.0.0",
    );

    returned.subject = "Modified";
    returned.body[0]!.props!.text = "Modified";

    expect(
      registry.get("newsletter", "1.0.0").subject,
    ).toBe("Newsletter 1.0.0");

    expect(
      registry.get(
        "newsletter",
        "1.0.0",
      ).body[0]!.props!.text,
    ).toBe("Original");
  });

  it("rejects duplicate versions", () => {
    const registry = new TemplateVersionRegistry();

    registry.register(document("1.0.0"));

    expect(() =>
      registry.register(document("1.0.0")),
    ).toThrow(TemplateVersionError);
  });

  it("deprecates without removing history", () => {
    const registry = new TemplateVersionRegistry();

    registry.register(document("1.0.0"));
    registry.register(document("1.1.0"));

    registry.deprecate(
      "newsletter",
      "1.1.0",
      "Please upgrade",
    );

    expect(registry.list("newsletter")[0]).toEqual({
      id: "newsletter",
      version: "1.1.0",
      status: "deprecated",
      deprecationReason: "Please upgrade",
    });

    expect(
      registry.resolve("newsletter").version,
    ).toBe("1.0.0");

    expect(
      registry.resolve("newsletter", {
        version: "1.1.0",
        includeDeprecated: true,
      }).version,
    ).toBe("1.1.0");

    expect(() =>
      registry.resolve("newsletter", {
        version: "1.1.0",
      }),
    ).toThrow(TemplateVersionError);
  });

  it("rejects invalid or incompatible versions", () => {
    const registry = new TemplateVersionRegistry();

    expect(() =>
      registry.register(document("01.0.0")),
    ).toThrow();

    expect(() =>
      registry.register(
        document("99999999999999999.0.0"),
      ),
    ).toThrow();

    registry.register(document("2.0.0"));

    expect(() =>
      registry.resolve("newsletter", {
        compatibleWith: "1.0.0",
      }),
    ).toThrow(TemplateVersionError);

    expect(() =>
      registry.resolve("newsletter", {
        version: "2.0.0",
        compatibleWith: "1.0.0",
      }),
    ).toThrow(TemplateVersionError);
  });

  it("supports existing built-in documents", () => {
    const registry = new TemplateVersionRegistry();

    registry.register(
      getBuiltinTemplate("welcome"),
    );

    expect(
      registry.get("welcome", "1.0.0").id,
    ).toBe("welcome");

    expect(registry.list("unknown")).toEqual([]);
  });
});
