/* global document, fetch, setTimeout, clearTimeout, Blob, URL */
const $ = (id) => document.getElementById(id);
const state = { catalog: [], selected: null, last: null, tab: "preview", device: "desktop", sequence: 0, timer: 0 };
const icons = { core: "✉", account: "👤", authentication: "🔐", billing: "💳", ecommerce: "📦", marketing: "📢", notifications: "🔔", events: "📅", saas: "▣", support: "🎧" };
const text = (node, value) => { node.textContent = value; };
function option(select, value, name = value) { const el = document.createElement("option"); el.value = value; text(el, name); select.append(el); }
async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  let body;
  try { body = await res.json(); } catch { throw new Error("Server did not return JSON"); }
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}
function status(message, error = false) { text($("status"), message); $("status").classList.toggle("error", error); }
function friendly(id) { return id.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "); }
function renderList() {
  const needle = $("search").value.trim().toLowerCase();
  const category = $("category").value;
  const list = $("templateList"); list.replaceChildren();
  for (const item of state.catalog) {
    if (category && category !== item.category) continue;
    if (needle && !`${item.title} ${item.id} ${item.category} ${item.description}`.toLowerCase().includes(needle)) continue;
    const button = document.createElement("button"); button.type = "button";
    button.className = `template${state.selected?.id === item.id ? " selected" : ""}`;
    button.setAttribute("role", "listitem");
    const marker = document.createElement("span"); marker.className = "template-icon"; text(marker, icons[item.category] || "✉");
    const group = document.createElement("span");
    const title = document.createElement("span"); title.className = "template-name"; text(title, item.title && item.title !== item.id ? item.title : friendly(item.id));
    const subtitle = document.createElement("span"); subtitle.className = "template-cat"; text(subtitle, item.category);
    group.append(title, subtitle); button.append(marker, group);
    button.addEventListener("click", () => selectTemplate(item));
    list.append(button);
  }
}
async function selectTemplate(item) {
  state.selected = item;
  renderList();
  text($("editorTitle"), friendly(item.id));
  text($("selectedVersion"), `v${item.version || "1.0.0"} · packaged`);
  text($("editorDescription"), item.description || "Customize this MailForge template.");
  $("subject").value = ""; $("preheader").value = "";
  try {
    const response = await fetchJSON(`/api/sample?id=${encodeURIComponent(item.id)}`);
    $("data").value = JSON.stringify(response.data, null, 2);
    $("hideIds").value = "";
    $("themeOverrides").value = "";
    $("patches").value = "";
    await generate();
  } catch (e) { status(String(e.message || e), true); }
}
function parseOptionalJSON(id, expected) {
  const input = $(id).value.trim();
  if (!input) return undefined;
  let value;
  try { value = JSON.parse(input); } catch (error) { throw new Error(`Invalid ${id} JSON: ${error.message}`, { cause: error }); }
  const valid = expected === "array" ? Array.isArray(value) : value !== null && typeof value === "object" && !Array.isArray(value);
  if (!valid) throw new Error(`${id} must contain a JSON ${expected}`);
  return value;
}
function collect() {
  if (!state.selected) throw new Error("Select a template first");
  let data;
  try { data = JSON.parse($("data").value); }
  catch (e) { throw new Error(`Invalid JSON: ${e.message}`, { cause: e }); }
  return {
    templateId: state.selected.id, data,
    theme: $("theme").value, layoutPreset: $("layout").value, variant: $("variant").value,
    brandName: $("brandName").value, brandColor: $("brandColor").value, locale: $("locale").value,
    subject: $("subject").value, preheader: $("preheader").value,
    hideIds: $("hideIds").value.split(",").map(s => s.trim()).filter(Boolean),
    themeOverrides: parseOptionalJSON("themeOverrides", "object"),
    patches: parseOptionalJSON("patches", "array"),
    display: {
      heading: $("showHeading").checked, headerTitle: $("showHeader").checked,
      eyebrow: $("showEyebrow").checked, primaryAction: $("showAction").checked,
      footer: $("showFooter").checked, copyright: $("showCopyright").checked,
    },
  };
}
async function generate() {
  const seq = ++state.sequence;
  try {
    const request = collect();
    status("Rendering with MailForge…");
    const result = await fetchJSON("/api/render", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
    if (seq !== state.sequence) return;
    state.last = result;
    text($("subjectResult"), result.subject);
    showTab(state.tab);
    status(result.warnings?.length ? `Rendered with ${result.warnings.length} warning(s)` : "Rendered successfully · actual MailForge HTML");
  } catch (e) { if (seq === state.sequence) status(e.message || String(e), true); }
}
function schedule() { clearTimeout(state.timer); state.timer = setTimeout(generate, 450); }
function showTab(tab) {
  state.tab = tab;
  document.querySelectorAll("[data-tab]").forEach(el => { const active = el.dataset.tab === tab; el.classList.toggle("active", active); el.setAttribute("aria-selected", String(active)); });
  const frame = $("emailFrame"), source = $("source");
  frame.hidden = tab !== "preview"; source.hidden = tab === "preview";
  if (!state.last) return;
  if (tab === "preview") frame.src = state.last.previewUrl;
  else text(source, state.last[tab]);
}
function device(mode) {
  state.device = mode;
  $("output").classList.toggle("mobile", mode === "mobile");
  for (const id of ["desktop", "mobile"]) { $(id).classList.toggle("active", id === mode); $(id).setAttribute("aria-pressed", String(id === mode)); }
}
function download(which) {
  if (!state.last || !state.selected) { status("Render a template before exporting.", true); return; }
  const filename = `${state.selected.id}-${$("theme").value}.${which === "html" ? "html" : "txt"}`;
  const blob = new Blob([state.last[which]], { type: which === "html" ? "text/html;charset=utf-8" : "text/plain;charset=utf-8" });
  const address = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = address; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(address), 1000);
}
async function setup() {
  try {
    const meta = await fetchJSON("/api/catalog");
    state.catalog = meta.catalog;
    text($("catalogCount"), `${meta.catalog.length} templates`);
    const categories = [...new Set(meta.catalog.map(item => item.category))].sort();
    for (const name of categories) option($("category"), name, friendly(name));
    for (const theme of meta.themes) option($("theme"), theme);
    for (const layout of meta.layouts) option($("layout"), layout);
    for (const variant of meta.variants) option($("variant"), variant);
    renderList();
    const first = meta.catalog.find(item => item.id === "welcome") ?? meta.catalog[0];
    if (first) await selectTemplate(first);
  } catch (e) { status(`${e.message}. Run corepack pnpm build before starting the playground.`, true); }
}
$("search").addEventListener("input", renderList);
$("category").addEventListener("change", renderList);
$("brandColor").addEventListener("input", () => { text($("colorValue"), $("brandColor").value); schedule(); });
for (const id of ["brandName", "theme", "layout", "variant", "locale", "showHeading", "showHeader", "showEyebrow", "showAction", "showFooter", "showCopyright", "subject", "preheader", "data", "hideIds", "themeOverrides", "patches"]) $(id).addEventListener("input", schedule);
$("render").addEventListener("click", generate);
$("reset").addEventListener("click", () => { if (state.selected) selectTemplate(state.selected); });
for (const mode of ["desktop", "mobile"]) $(mode).addEventListener("click", () => device(mode));
for (const tab of document.querySelectorAll("[data-tab]")) tab.addEventListener("click", () => showTab(tab.dataset.tab));
$("downloadHtml").addEventListener("click", () => download("html"));
$("downloadText").addEventListener("click", () => download("text"));
await setup();
