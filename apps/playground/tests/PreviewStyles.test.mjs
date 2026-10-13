/* global fetch */
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import { createPlaygroundServer } from "../server.mjs";

// Real MJML output has both inline style attributes and <style> blocks.
const html = '<!doctype html><html><head><style>.action{background:#2563eb;color:white}</style></head><body><a class="action" style="padding:14px 24px">Open dashboard</a></body></html>';
const stub = {
  createEmail: () => ({
    listBuiltinCatalog: () => [{ id: "welcome", title: "Welcome", category: "core" }],
    listThemes: () => ["modern"],
    async render() { return { subject: "Welcome", html, text: "Open dashboard" }; },
  }),
};

describe("isolated styled email previews", () => {
  const server = createPlaygroundServer({ loadMailForge: async () => stub });
  after(async () => {
    if (server.listening) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });
  async function localUrl() {
    if (!server.listening) await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    return `http://127.0.0.1:${server.address().port}`;
  }
  async function generate() {
    const origin = await localUrl();
    const response = await fetch(`${origin}/api/render`, {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ templateId: "welcome", data: {}, theme: "modern", brandName: "Acme" }),
    });
    assert.equal(response.status, 200);
    return response.json();
  }
  it("keeps the editor's restrictive CSP intact", async () => {
    const response = await fetch(await localUrl());
    assert.equal(response.status, 200);
    const policy = response.headers.get("content-security-policy");
    assert.match(policy, /style-src 'self'/);
    assert.doesNotMatch(policy, /unsafe-inline/);
  });
  it("serves generated MJML with inline CSS in a dedicated, script-free preview", async () => {
    const result = await generate();
    assert.match(result.previewUrl, /^\/api\/preview\/[a-f0-9]{32}$/);
    const response = await fetch(new URL(result.previewUrl, await localUrl()));
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /^text\/html/);
    const policy = response.headers.get("content-security-policy");
    assert.match(policy, /style-src 'unsafe-inline'/);
    assert.match(policy, /script-src 'none'/);
    assert.match(policy, /frame-ancestors 'self'/);
    assert.equal(await response.text(), html);
  });
  it("requires an unpredictable valid preview ID", async () => {
    const base = await localUrl();
    for (const path of ["/api/preview/missing", "/api/preview/00000000000000000000000000000000"]) {
      const response = await fetch(base + path);
      assert.equal(response.status, 404);
    }
  });
  it("keeps the output iframe sandboxed and uses the preview URL", async () => {
    const markup = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
    const script = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
    assert.match(markup, /<iframe\b[^>]*\bsandbox=""/);
    assert.match(script, /frame\.src = state\.last\.previewUrl/);
    assert.doesNotMatch(script, /frame\.srcdoc/);
  });
});
