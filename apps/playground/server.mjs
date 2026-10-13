/* global process, console, Buffer, URL */
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { normalizePreviewRequest, safeHost, verifySameOrigin, LAYOUTS, VARIANTS } from "./lib.mjs";
import { getTemplatePreviewData } from "../../scripts/template-preview-fixtures.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const staticFiles = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
]);
const PORT = Number(process.env.PORT || 4173);
if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) throw new Error("PORT must be between 1024 and 65535");
const MAX_BYTES = 250_000;
const COMMON_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "cache-control": "no-store",
  "content-security-policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'",
};
// The main editor keeps a strict CSP. The separately navigated, sandboxed
// preview needs inline CSS because compiled MJML relies on <style> tags and
// style="..." attributes. Never enable inline scripts in the preview.
const PREVIEW_HEADERS = {
  ...COMMON_HEADERS,
  "content-type": "text/html; charset=utf-8",
  "content-security-policy": "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src https: data:; connect-src 'none'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'",
};
const PREVIEW_TTL_MS = 5 * 60_000;
const MAX_PREVIEWS = 24;
const MAX_PREVIEW_BYTES = 2_000_000;
function json(res, status, body) {
  res.writeHead(status, { ...COMMON_HEADERS, "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}
async function readJson(req) {
  if (!/^application\/json(?:;|$)/i.test(req.headers["content-type"] ?? "")) throw new Error("Expected Content-Type: application/json");
  let size = 0;
  const parts = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BYTES) throw new Error("JSON request exceeds 250 KB");
    parts.push(chunk);
  }
  let value;
  try { value = JSON.parse(Buffer.concat(parts).toString("utf8")); }
  catch { throw new Error("Invalid JSON request"); }
  return value;
}

// Load the already-built public API. Running `pnpm build` is required before `pnpm --filter @mailforge/playground dev`.
async function loadMailForge() {
  return import("../../packages/email/dist/index.js");
}

export function createPlaygroundServer(dependencies = {}) {
  const load = dependencies.loadMailForge ?? loadMailForge;
  const fixtures = dependencies.getTemplatePreviewData ?? getTemplatePreviewData;
  // Local-only, bounded, short-lived HTML snapshots. URLs contain random IDs.
  const previews = new Map();
  return createServer(async (req, res) => {
    try {
      const host = req.headers.host;
      if (!safeHost(host) || !verifySameOrigin(req.headers.origin, host)) {
        json(res, 403, { error: "Localhost-only application" });
        return;
      }
      const pathname = new URL(req.url ?? "/", `http://${host}`).pathname;
      if (req.method === "GET" && staticFiles.has(pathname)) {
        const [name, contentType] = staticFiles.get(pathname);
        const bytes = await readFile(join(here, "public", name));
        res.writeHead(200, { ...COMMON_HEADERS, "content-type": contentType });
        res.end(bytes);
        return;
      }
      if (req.method === "GET" && pathname === "/api/catalog") {
        const { createEmail } = await load();
        const engine = createEmail();
        const catalog = engine.listBuiltinCatalog();
        json(res, 200, { catalog, themes: engine.listThemes(), layouts: LAYOUTS, variants: VARIANTS });
        return;
      }
      if (req.method === "GET" && pathname === "/api/sample") {
        const { createEmail } = await load();
        const catalog = createEmail().listBuiltinCatalog();
        const id = new URL(req.url, `http://${host}`).searchParams.get("id");
        const match = catalog.find((entry) => entry.id === id);
        if (!match) { json(res, 404, { error: "Unknown template" }); return; }
        json(res, 200, { data: fixtures(match) });
        return;
      }
      if (req.method === "GET" && pathname.startsWith("/api/preview/")) {
        const token = pathname.slice("/api/preview/".length);
        const item = /^[a-f0-9]{32}$/.test(token) ? previews.get(token) : undefined;
        if (!item || item.expiresAt <= Date.now()) {
          previews.delete(token);
          json(res, 404, { error: "Preview not found or expired" });
          return;
        }
        res.writeHead(200, PREVIEW_HEADERS);
        res.end(item.html);
        return;
      }
      if (req.method === "POST" && pathname === "/api/render") {
        const body = await readJson(req);
        const { createEmail } = await load();
        const engine = createEmail();
        const catalog = engine.listBuiltinCatalog();
        const normalized = normalizePreviewRequest(body, new Set(catalog.map(entry => entry.id)), engine.listThemes());
        const result = await createEmail(normalized.engineConfig).render(normalized.templateId, normalized.options);
        if (typeof result.html !== "string" || Buffer.byteLength(result.html, "utf8") > MAX_PREVIEW_BYTES) {
          throw new Error("Rendered email HTML exceeds preview limits");
        }
        const now = Date.now();
        for (const [id, item] of previews) {
          if (item.expiresAt <= now) previews.delete(id);
        }
        while (previews.size >= MAX_PREVIEWS) {
          previews.delete(previews.keys().next().value);
        }
        const token = randomBytes(16).toString("hex");
        previews.set(token, { html: result.html, expiresAt: now + PREVIEW_TTL_MS });
        json(res, 200, { subject: result.subject, preheader: result.preheader ?? "", html: result.html, text: result.text, warnings: result.warnings ?? [], previewUrl: `/api/preview/${token}` });
        return;
      }
      json(res, 404, { error: "Not found" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      const status = /Cannot find module|ERR_MODULE_NOT_FOUND/i.test(message) ? 503 : 400;
      json(res, status, { error: status === 503 ? "Build the workspace first: corepack pnpm build" : message.slice(0, 300) });
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  createPlaygroundServer().listen(PORT, "127.0.0.1", () => {
    console.log(`MailForge Playground: http://127.0.0.1:${PORT}`);
  });
}
