import { describe, it, expect } from "vitest";
import { compileTemplate, escapeHtml } from "../src/compiler/compileTemplate.js";

describe("compileTemplate", () => {
  it("escapes HTML in standard variables to prevent XSS", () => {
    const tpl = "Hello, {{ name }}!";
    const output = compileTemplate(tpl, { name: "<script>alert('xss')</script>" });
    expect(output).toBe("Hello, &lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;!");
  });

  it("supports unescaped raw interpolation via {{{ raw }}}", () => {
    const tpl = "Content: {{{ rawHtml }}}";
    const output = compileTemplate(tpl, { rawHtml: "<strong>Bold Text</strong>" });
    expect(output).toBe("Content: <strong>Bold Text</strong>");
  });

  it("resolves nested property paths", () => {
    const tpl = "User: {{ user.profile.name }} ({{ user.email }})";
    const data = {
      user: {
        profile: { name: "Alice" },
        email: "alice@example.com",
      },
    };
    expect(compileTemplate(tpl, data)).toBe("User: Alice (alice@example.com)");
  });

  it("handles fallback values for missing properties", () => {
    const tpl = "Hello, {{ name || 'Valued Member' }}!";
    expect(compileTemplate(tpl, {})).toBe("Hello, Valued Member!");
    expect(compileTemplate(tpl, { name: "Bob" })).toBe("Hello, Bob!");
  });

  it("handles conditionals: #if and #else", () => {
    const tpl = "{{#if isVip}}VIP Exclusive Offer!{{else}}Standard Offer{{/if}}";
    expect(compileTemplate(tpl, { isVip: true })).toBe("VIP Exclusive Offer!");
    expect(compileTemplate(tpl, { isVip: false })).toBe("Standard Offer");
  });

  it("handles #each loops with array indexing", () => {
    const tpl = "Items: {{#each items}}[{{@index}}: {{name}}]{{/each}}";
    const data = {
      items: [{ name: "Widget" }, { name: "Gadget" }],
    };
    expect(compileTemplate(tpl, data)).toBe("Items: [0: Widget][1: Gadget]");
  });

  it("returns pre-compiled reusable function when called with 1 argument", () => {
    const render = compileTemplate("Welcome, {{ name }}!");
    expect(typeof render).toBe("function");
    expect(render({ name: "Charlie" })).toBe("Welcome, Charlie!");
    expect(render({ name: "Dana" })).toBe("Welcome, Dana!");
  });

  it("escapes special characters with escapeHtml", () => {
    expect(escapeHtml("& < > \" '")).toBe("&amp; &lt; &gt; &quot; &#39;");
    expect(escapeHtml(null)).toBe("");
  });
});

