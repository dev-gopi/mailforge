/* global URL */
/** Strict, dependency-free request validation for the localhost playground. */
export const LAYOUTS = ["transactional", "marketing", "billing", "notification"];
export const VARIANTS = ["default", "compact", "premium", "branded"];
const DISPLAY_KEYS = ["heading", "headerTitle", "eyebrow", "primaryAction", "footer", "copyright"];
const TEXT_LIMIT = 200;
const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function text(value, label, max = TEXT_LIMIT) {
  if (typeof value !== "string" || value.length > max || value.split("").some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  })) {
    throw new Error(`${label} must be a short, printable string`);
  }
  return value;
}

export function normalizePreviewRequest(raw, knownTemplates, themes) {
  if (!isObject(raw)) throw new Error("Request must be an object");
  const allowed = new Set(["templateId", "data", "theme", "layoutPreset", "variant", "brandName", "brandColor", "locale", "display", "subject", "preheader", "hideIds", "themeOverrides", "patches"]);
  for (const key of Object.keys(raw)) if (!allowed.has(key)) throw new Error(`Unknown option: ${key}`);
  const id = text(raw.templateId, "templateId", 100);
  if (!knownTemplates.has(id)) throw new Error("Unknown template");
  if (!isObject(raw.data)) throw new Error("Template data must be a JSON object");
  const preset = text(raw.theme ?? "modern", "theme", 40);
  if (!themes.includes(preset)) throw new Error("Unknown theme preset");
  const brandName = text(raw.brandName ?? "Acme", "brandName", 100).trim();
  if (!brandName) throw new Error("Brand name is required");
  const brandColor = raw.brandColor ?? "#2563eb";
  if (typeof brandColor !== "string" || !/^#[0-9a-fA-F]{6}$/.test(brandColor)) throw new Error("Brand color must be a six-digit hex color");
  const options = { data: raw.data };
  if (raw.layoutPreset !== undefined && raw.layoutPreset !== "") {
    if (!LAYOUTS.includes(raw.layoutPreset)) throw new Error("Unknown layout preset");
    options.layoutPreset = raw.layoutPreset;
  }
  if (raw.variant !== undefined && raw.variant !== "") {
    if (!VARIANTS.includes(raw.variant)) throw new Error("Unknown visual variant");
    options.variant = raw.variant;
  }
  if (raw.locale !== undefined && raw.locale !== "") {
    const locale = text(raw.locale, "locale", 35);
    if (!/^[a-z]{2,3}(?:-[a-zA-Z0-9]{2,8}){0,4}$/i.test(locale)) throw new Error("Invalid locale");
    options.locale = locale;
  }
  if (raw.display !== undefined) {
    if (!isObject(raw.display)) throw new Error("Display options must be an object");
    const display = {};
    for (const [key, value] of Object.entries(raw.display)) {
      if (!DISPLAY_KEYS.includes(key) || typeof value !== "boolean") throw new Error(`Invalid display option: ${key}`);
      display[key] = value;
    }
    options.display = display;
  }
  if (raw.hideIds !== undefined) {
    if (!Array.isArray(raw.hideIds) || raw.hideIds.length > 100 || raw.hideIds.some(id => typeof id !== "string" || id.length > 100 || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(id))) throw new Error("Invalid hideIds");
    options.display ??= {};
    options.display.hideIds = raw.hideIds;
  }
  if (raw.themeOverrides !== undefined) {
    if (!isObject(raw.themeOverrides)) throw new Error("Theme overrides must be an object");
    options.theme = raw.themeOverrides;
  }
  if (raw.patches !== undefined) {
    if (!Array.isArray(raw.patches) || raw.patches.length > 100) throw new Error("Document patches must be an array with at most 100 entries");
    options.patches = raw.patches;
  }
  if (raw.subject !== undefined && raw.subject !== "") {
    options.display ??= {};
    options.display.subject = text(raw.subject, "subject", 200);
  }
  if (raw.preheader !== undefined && raw.preheader !== "") {
    options.display ??= {};
    options.display.preheader = text(raw.preheader, "preheader", 300);
  }
  return {
    templateId: id,
    engineConfig: { brand: { name: brandName, primaryColor: brandColor, supportEmail: "support@example.com" }, theme: { preset } },
    options,
  };
}

export function safeHost(host) {
  return typeof host === "string" && /^(?:127\.0\.0\.1|localhost)(?::[0-9]{1,5})?$/.test(host);
}
export function verifySameOrigin(origin, host) {
  if (!safeHost(host)) return false;
  if (!origin) return true; // Browser GETs may omit Origin; POST additionally needs JSON Content-Type.
  try { const url = new URL(origin); return (url.protocol === "http:" && url.host === host); }
  catch { return false; }
}
