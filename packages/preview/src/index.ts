export type ViewportDevice = "desktop" | "tablet" | "mobile";

export interface PreviewUrlOptions {
  theme?: string;
  variant?: string;
  locale?: string;
  device?: ViewportDevice;
  basePath?: string;
}

export interface PreviewFrameOptions {
  title?: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  preheader?: string;
  html: string;
  text?: string;
  defaultDevice?: ViewportDevice;
}

export interface EmailQualityReport {
  sizeBytes: number;
  sizeKb: number;
  exceedsGmailLimit: boolean;
  linkCount: number;
  safeLinksCount: number;
  unsafeLinks: string[];
  imagesTotal: number;
  imagesMissingAlt: number;
  hasUnsubscribe: boolean;
  hasPreheader: boolean;
  score: number;
}

/**
 * Creates a clean preview URL for a given template ID and optional query parameters.
 */
export function createPreviewUrl(
  templateId: string,
  options: PreviewUrlOptions = {},
): string {
  const basePath = options.basePath ?? "/preview";
  const url = `${basePath}/${encodeURIComponent(templateId)}`;
  const params = new URLSearchParams();

  if (options.theme) params.set("theme", options.theme);
  if (options.variant) params.set("variant", options.variant);
  if (options.locale) params.set("locale", options.locale);
  if (options.device) params.set("device", options.device);

  const query = params.toString();
  return query ? `${url}?${query}` : url;
}

/**
 * Analyzes rendered email HTML for quality, responsiveness, deliverability, and accessibility issues.
 */
export function inspectEmailQuality(html: string): EmailQualityReport {
  const sizeBytes = new TextEncoder().encode(html || "").length;
  const sizeKb = Number((sizeBytes / 1024).toFixed(2));
  const exceedsGmailLimit = sizeBytes > 102 * 1024;

  const lower = (html || "").toLowerCase();

  // Links analysis
  const linkMatches = Array.from(html.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi));
  const linkCount = linkMatches.length;
  const unsafeLinks: string[] = [];

  for (const match of linkMatches) {
    const rawLink = match[1];
    if (typeof rawLink === "string") {
      const href = rawLink.trim().toLowerCase();
      if (
        href.startsWith("javascript:") ||
        href.startsWith("data:") ||
        href.startsWith("vbscript:")
      ) {
        unsafeLinks.push(rawLink);
      }
    }
  }
  const safeLinksCount = linkCount - unsafeLinks.length;

  // Images analysis
  const imgMatches = Array.from(html.matchAll(/<img\s+([^>]+)>/gi));
  const imagesTotal = imgMatches.length;
  let imagesMissingAlt = 0;
  for (const match of imgMatches) {
    const attrs = match[1] || "";
    if (!/alt\s*=\s*["'][^"']*["']/i.test(attrs)) {
      imagesMissingAlt += 1;
    }
  }

  // Unsubscribe and preheader checks
  const hasUnsubscribe =
    lower.includes("unsubscribe") ||
    lower.includes("opt-out") ||
    lower.includes("email preferences");
  const hasPreheader =
    lower.includes("class=\"preheader\"") ||
    lower.includes("class='preheader'") ||
    lower.includes("display:none");

  // Quality score out of 100
  let score = 100;
  if (exceedsGmailLimit) score -= 30;
  if (unsafeLinks.length > 0) score -= 40;
  if (imagesMissingAlt > 0) score -= Math.min(20, imagesMissingAlt * 5);
  if (!hasUnsubscribe) score -= 15;
  score = Math.max(0, score);

  return {
    sizeBytes,
    sizeKb,
    exceedsGmailLimit,
    linkCount,
    safeLinksCount,
    unsafeLinks,
    imagesTotal,
    imagesMissingAlt,
    hasUnsubscribe,
    hasPreheader,
    score,
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Wraps rendered email HTML inside a full interactive email client preview frame.
 */
export function renderPreviewFrame(options: PreviewFrameOptions): string {
  const title = options.title ?? options.subject ?? "Email Preview";
  const subject = options.subject ?? "No Subject";
  const from = options.from ?? "MailForge &lt;noreply@mailforge.dev&gt;";
  const to = options.to ?? "recipient@example.com";
  const date = options.date ?? new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const textContent = options.text ?? "(No plain text version provided)";
  const rawHtml = options.html;
  const quality = inspectEmailQuality(rawHtml);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} — MailForge Preview</title>
  <style>
    :root {
      --bg: #0f172a;
      --surface: #1e293b;
      --surface-border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #3b82f6;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }
    .preview-header {
      background: var(--surface);
      border-bottom: 1px solid var(--surface-border);
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .preview-title {
      font-weight: 600;
      font-size: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .badge {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 9999px;
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
    }
    .badge-success { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .badge-warning { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
    .controls { display: flex; align-items: center; gap: 8px; }
    .btn {
      background: #334155;
      color: var(--text);
      border: 1px solid #475569;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn:hover { background: #475569; }
    .btn.active { background: var(--primary); border-color: var(--primary); color: #fff; }
    .tab-bar {
      background: #182234;
      border-bottom: 1px solid var(--surface-border);
      display: flex;
      padding: 0 20px;
      gap: 16px;
    }
    .tab {
      padding: 10px 0;
      font-size: 13px;
      color: var(--text-muted);
      cursor: pointer;
      border-bottom: 2px solid transparent;
    }
    .tab.active { color: var(--text); border-bottom-color: var(--primary); font-weight: 500; }
    .email-envelope {
      background: var(--surface);
      border-bottom: 1px solid var(--surface-border);
      padding: 12px 20px;
      font-size: 13px;
      line-height: 1.6;
    }
    .envelope-row { display: flex; gap: 8px; }
    .envelope-label { color: var(--text-muted); min-width: 65px; }
    .viewport-container {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 24px;
      background: #090d16;
      overflow-y: auto;
    }
    .email-frame {
      background: #ffffff;
      border: 1px solid var(--surface-border);
      border-radius: 8px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
      transition: width 0.2s ease;
      width: 600px;
      min-height: 400px;
    }
    .email-frame.device-desktop { width: 680px; }
    .email-frame.device-tablet { width: 480px; }
    .email-frame.device-mobile { width: 375px; }
    iframe { width: 100%; border: none; height: 700px; border-radius: 8px; }
    .tab-content { display: none; width: 100%; height: 100%; }
    .tab-content.active { display: block; }
    pre {
      background: #0b1020;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid var(--surface-border);
      color: #e2e8f0;
      font-family: monospace;
      font-size: 12px;
      white-space: pre-wrap;
      overflow-x: auto;
    }
    .diag-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      padding: 16px 0;
    }
    .diag-card {
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: 8px;
      padding: 16px;
    }
    .diag-val { font-size: 24px; font-weight: bold; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="preview-header">
    <div class="preview-title">
      <span>✉️ ${escapeHtml(title)}</span>
      <span class="badge ${quality.exceedsGmailLimit ? 'badge-warning' : 'badge-success'}">
        ${quality.sizeKb} KB ${quality.exceedsGmailLimit ? '(Gmail clipping risk)' : ''}
      </span>
      <span class="badge badge-success">Quality: ${quality.score}/100</span>
    </div>
    <div class="controls">
      <button class="btn active" id="btnDesktop" onclick="setDevice('desktop')">🖥️ Desktop</button>
      <button class="btn" id="btnTablet" onclick="setDevice('tablet')">📱 Tablet</button>
      <button class="btn" id="btnMobile" onclick="setDevice('mobile')">📱 Mobile</button>
    </div>
  </div>

  <div class="tab-bar">
    <div class="tab active" onclick="switchTab('visual')">Visual Preview</div>
    <div class="tab" onclick="switchTab('text')">Plain Text</div>
    <div class="tab" onclick="switchTab('html')">Raw HTML</div>
    <div class="tab" onclick="switchTab('diagnostics')">Diagnostics</div>
  </div>

  <div id="tab-visual" class="tab-content active" style="flex: 1; display: flex; flex-direction: column;">
    <div class="email-envelope">
      <div class="envelope-row"><span class="envelope-label">Subject:</span><strong>${escapeHtml(subject)}</strong></div>
      <div class="envelope-row"><span class="envelope-label">From:</span><span>${from}</span></div>
      <div class="envelope-row"><span class="envelope-label">To:</span><span>${escapeHtml(to)}</span></div>
      <div class="envelope-row"><span class="envelope-label">Date:</span><span>${escapeHtml(date)}</span></div>
    </div>
    <div class="viewport-container">
      <div id="emailFrameWrapper" class="email-frame device-desktop">
        <iframe id="emailIframe" srcdoc="${escapeHtml(rawHtml)}"></iframe>
      </div>
    </div>
  </div>

  <div id="tab-text" class="tab-content" style="padding: 24px; overflow-y: auto;">
    <pre>${escapeHtml(textContent)}</pre>
  </div>

  <div id="tab-html" class="tab-content" style="padding: 24px; overflow-y: auto;">
    <pre>${escapeHtml(rawHtml)}</pre>
  </div>

  <div id="tab-diagnostics" class="tab-content" style="padding: 24px; overflow-y: auto;">
    <h2>Email Quality & Deliverability Diagnostics</h2>
    <div class="diag-grid">
      <div class="diag-card">
        <div style="color: var(--text-muted); font-size: 12px;">SIZE BUDGET</div>
        <div class="diag-val" style="color: ${quality.exceedsGmailLimit ? 'var(--warning)' : 'var(--success)'};">${quality.sizeKb} KB</div>
        <p style="font-size: 12px; margin-top: 4px; color: var(--text-muted);">Max safe: 102 KB (Gmail)</p>
      </div>
      <div class="diag-card">
        <div style="color: var(--text-muted); font-size: 12px;">LINKS CHECK</div>
        <div class="diag-val">${quality.linkCount} links</div>
        <p style="font-size: 12px; margin-top: 4px; color: ${quality.unsafeLinks.length > 0 ? 'var(--danger)' : 'var(--success)'};">
          ${quality.unsafeLinks.length > 0 ? `${quality.unsafeLinks.length} unsafe links detected` : 'All links secure'}
        </p>
      </div>
      <div class="diag-card">
        <div style="color: var(--text-muted); font-size: 12px;">IMAGE ACCESSIBILITY</div>
        <div class="diag-val">${quality.imagesTotal} images</div>
        <p style="font-size: 12px; margin-top: 4px; color: ${quality.imagesMissingAlt > 0 ? 'var(--warning)' : 'var(--success)'};">
          ${quality.imagesMissingAlt > 0 ? `${quality.imagesMissingAlt} missing alt tags` : 'All alt tags valid'}
        </p>
      </div>
      <div class="diag-card">
        <div style="color: var(--text-muted); font-size: 12px;">UNSUBSCRIBE LINK</div>
        <div class="diag-val" style="color: ${quality.hasUnsubscribe ? 'var(--success)' : 'var(--danger)'};">
          ${quality.hasUnsubscribe ? 'Present' : 'Missing'}
        </div>
        <p style="font-size: 12px; margin-top: 4px; color: var(--text-muted);">CAN-SPAM / GDPR requirement</p>
      </div>
    </div>
  </div>

  <script>
    function setDevice(device) {
      const frame = document.getElementById('emailFrameWrapper');
      frame.className = 'email-frame device-' + device;
      document.querySelectorAll('.controls .btn').forEach(b => b.classList.remove('active'));
      const activeBtn = document.getElementById('btn' + device.charAt(0).toUpperCase() + device.slice(1));
      if (activeBtn) activeBtn.classList.add('active');
    }

    function switchTab(tabId) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => {
        c.classList.remove('active');
        c.style.display = 'none';
      });
      event.target.classList.add('active');
      const target = document.getElementById('tab-' + tabId);
      target.classList.add('active');
      target.style.display = tabId === 'visual' ? 'flex' : 'block';
    }
  </script>
</body>
</html>`;
}
