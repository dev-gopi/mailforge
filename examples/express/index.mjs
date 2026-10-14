import http from "node:http";
import { createEmail } from "../../packages/email/dist/index.js";
import { renderPreviewFrame, inspectEmailQuality } from "../../packages/preview/dist/index.js";

// Initialize MailForge email engine
export const emailEngine = createEmail({
  brand: {
    name: "Express MailService",
    primaryColor: "#2563eb",
    website: "https://express-example.mailforge.dev",
    supportEmail: "support@mailforge.dev",
  },
  footer: {
    message: "To manage your email preferences or unsubscribe, please visit your account.",
  },
  theme: "modern",
});

/**
 * Handles incoming Express-style request and dispatches response.
 */
export async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  // Set JSON headers by default
  const sendJson = (status, data) => {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(data, null, 2));
  };

  // Health check
  if (req.method === "GET" && pathname === "/health") {
    return sendJson(200, { status: "ok", service: "MailForge Express Example", timestamp: new Date().toISOString() });
  }

  // Preview endpoint: GET /preview/:template
  if (req.method === "GET" && pathname.startsWith("/preview/")) {
    const templateId = pathname.replace("/preview/", "").trim() || "welcome";
    try {
      const result = await emailEngine.render(templateId, {
        data: {
          user: { firstName: "Express User" },
          actionUrl: "https://example.com/onboarding",
        },
      });

      const frame = renderPreviewFrame({
        title: `Preview: ${templateId}`,
        subject: result.subject,
        html: result.html,
        text: result.text,
      });

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(frame);
    } catch (err) {
      return sendJson(400, { error: `Failed to render template "${templateId}": ${err.message}` });
    }
  }

  // Render endpoint: POST /api/render
  if (req.method === "POST" && pathname === "/api/render") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const template = payload.template || "welcome";
        const data = payload.data || { user: { firstName: "Valued Customer" }, actionUrl: "https://example.com" };

        const result = await emailEngine.render(template, { data });
        const quality = inspectEmailQuality(result.html);

        return sendJson(200, {
          success: true,
          template,
          subject: result.subject,
          html: result.html,
          text: result.text,
          quality: {
            sizeKb: quality.sizeKb,
            score: quality.score,
            exceedsGmailLimit: quality.exceedsGmailLimit,
          },
        });
      } catch (err) {
        return sendJson(400, { success: false, error: err.message });
      }
    });
    return;
  }

  // Send welcome email: POST /api/send-welcome
  if (req.method === "POST" && pathname === "/api/send-welcome") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const { recipientName = "New Member", recipientEmail = "user@example.com", actionUrl = "https://example.com" } = payload;

        const result = await emailEngine.render("welcome", {
          data: {
            user: { firstName: recipientName },
            actionUrl,
          },
        });

        // Simulated delivery receipt
        const messageId = `<msg-${Date.now()}@express.mailforge.dev>`;
        return sendJson(200, {
          success: true,
          messageId,
          to: recipientEmail,
          subject: result.subject,
          sentAt: new Date().toISOString(),
        });
      } catch (err) {
        return sendJson(400, { success: false, error: err.message });
      }
    });
    return;
  }

  // Root landing page
  if (req.method === "GET" && pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(`
      <h1>MailForge Express Server Example</h1>
      <p>Endpoints available:</p>
      <ul>
        <li><a href="/health">GET /health</a> - Health check</li>
        <li><a href="/preview/welcome">GET /preview/welcome</a> - Visual email preview frame</li>
        <li><code>POST /api/render</code> - Render template</li>
        <li><code>POST /api/send-welcome</code> - Personalize and send welcome email</li>
      </ul>
    `);
  }

  return sendJson(404, { error: "Route not found" });
}

// Create and export server
export const app = http.createServer(handleRequest);

// CLI start
if (import.meta.url === `file://${process.argv[1]}`) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`MailForge Express server running at http://localhost:${PORT}`);
  });
}
