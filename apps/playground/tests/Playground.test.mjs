/* global fetch */
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { normalizePreviewRequest, safeHost, verifySameOrigin } from "../lib.mjs";
import { createPlaygroundServer } from "../server.mjs";
import { getTemplatePreviewData } from "../../../scripts/template-preview-fixtures.mjs";

const templates = new Set(["welcome", "invoice"]);
const themes = ["modern", "minimal", "corporate"];
const valid = { templateId: "welcome", data: { user: { firstName: "Gopi" } }, theme: "modern", brandColor: "#2563eb" };

describe("Playground — validation", () => {
  it("accepts valid branding, layout, variant and display settings", () => {
    const result = normalizePreviewRequest({ ...valid, variant: "premium", layoutPreset: "transactional", display: { heading: false }, locale: "bn-IN", subject: "Hello" }, templates, themes);
    assert.equal(result.options.variant, "premium");
    assert.equal(result.options.layoutPreset, "transactional");
    assert.equal(result.options.display.heading, false);
    assert.equal(result.options.display.subject, "Hello");
    assert.equal(result.options.locale, "bn-IN");
  });
  it("rejects unknown templates and unsupported themes", () => {
    assert.throws(() => normalizePreviewRequest({ ...valid, templateId: "evil" }, templates, themes), /Unknown template/);
    assert.throws(() => normalizePreviewRequest({ ...valid, theme: "unregistered" }, templates, themes), /Unknown theme/);
  });
  it("rejects invalid colors and unknown/unsafe fields", () => {
    assert.throws(() => normalizePreviewRequest({ ...valid, brandColor: "red; background:url(x)" }, templates, themes), /Brand color/);
    assert.throws(() => normalizePreviewRequest({ ...valid, externalUrl: "https://bad.com" }, templates, themes), /Unknown option/);
    assert.throws(() => normalizePreviewRequest({ ...valid, display: { heading: "false" } }, templates, themes), /Invalid display/);
  });
  it("rejects invalid JSON payload shape and bad locale", () => {
    assert.throws(() => normalizePreviewRequest({ ...valid, data: [] }, templates, themes), /JSON object/);
    assert.throws(() => normalizePreviewRequest({ ...valid, locale: "<script>" }, templates, themes), /Invalid locale/);
  });
  it("allows localhost origins and blocks remote Host headers", () => {
    assert.equal(safeHost("127.0.0.1:4173"), true);
    assert.equal(safeHost("example.com:4173"), false);
    assert.equal(verifySameOrigin("http://127.0.0.1:4173", "127.0.0.1:4173"), true);
    assert.equal(verifySameOrigin("https://example.com", "127.0.0.1:4173"), false);
  });
  it("reuses catalog sample data for core and commerce templates", () => {
    assert.equal(getTemplatePreviewData({ id: "welcome", category: "core" }).user.firstName.length > 0, true);
    assert.equal(getTemplatePreviewData({ id: "invoice", category: "core" }).invoice.items.length > 0, true);
    assert.ok(getTemplatePreviewData({ id: "event-reminder", category: "events" }).event);
  });
});

describe("Playground — HTTP routes", () => {
  const stub = {
    createEmail: () => ({
      listBuiltinCatalog: () => [{ id: "welcome", category: "core", title: "Welcome", version: "1.0.0" }],
      listThemes: () => themes,
      async render(id) {
        assert.equal(id, "welcome");
        return { subject: "Welcome", preheader: "", html: "<html><body>Welcome</body></html>", text: "Welcome", warnings: [] };
      },
    }),
  };
  const server = createPlaygroundServer({ loadMailForge: async () => stub });
  let base;
  after(async () => { if (server.listening) await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve())); });
  async function url() {
    if (!server.listening) await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    return `http://127.0.0.1:${server.address().port}`;
  }
  it("returns catalog metadata and sample data", async () => {
    base = await url();
    const catalog = await (await fetch(`${base}/api/catalog`)).json();
    assert.equal(catalog.catalog[0].id, "welcome");
    const sample = await (await fetch(`${base}/api/sample?id=welcome`)).json();
    assert.ok(sample.data.user.firstName);
  });
  it("returns actual renderer HTML with sandbox-friendly headers", async () => {
    base = await url();
    const response = await fetch(`${base}/api/render`, { method: "POST", headers: { "Content-Type": "application/json", "Origin": base }, body: JSON.stringify(valid) });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-security-policy"), /default-src 'none'/);
    const result = await response.json();
    assert.match(result.html, /Welcome/);
  });
  it("rejects foreign-origin POST and invalid template selection", async () => {
    base = await url();
    const blocked = await fetch(`${base}/api/render`, { method: "POST", headers: { "Content-Type": "application/json", "Origin": "https://evil.example" }, body: JSON.stringify(valid) });
    assert.equal(blocked.status, 403);
    const bad = await fetch(`${base}/api/render`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...valid, templateId: "unknown" }) });
    assert.equal(bad.status, 400);
  });
});
