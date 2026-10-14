import http from "node:http";
import { createEmail } from "../../packages/email/dist/index.js";
import { renderPreviewFrame, inspectEmailQuality } from "../../packages/preview/dist/index.js";

// Initialize MailForge instance for Fastify service
export const fastifyEmailEngine = createEmail({
  brand: {
    name: "Fastify Cloud",
    primaryColor: "#059669",
    website: "https://fastify.mailforge.dev",
    supportEmail: "support@fastify.mailforge.dev",
  },
  theme: "modern",
  footer: {
    message: "High-performance transactional emails powered by MailForge and Fastify.",
  },
});

/**
 * Dispatches Fastify-style JSON or HTML responses.
 */
export async function fastifyHandler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  const replyJson = (statusCode, data) => {
    res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(data, null, 2));
  };

  if (req.method === "GET" && pathname === "/health") {
    return replyJson(200, {
      status: "ok",
      framework: "Fastify",
      service: "MailForge Email Microservice",
      uptime: process.uptime(),
    });
  }

  // GET /preview/:template
  if (req.method === "GET" && pathname.startsWith("/preview/")) {
    const template = pathname.replace("/preview/", "") || "welcome";
    try {
      const result = await fastifyEmailEngine.render(template, {
        data: {
          user: { firstName: "Fastify Developer" },
          actionUrl: "https://example.com/verify",
        },
      });

      const frame = renderPreviewFrame({
        title: `Fastify Preview: ${template}`,
        subject: result.subject,
        html: result.html,
        text: result.text,
      });

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(frame);
    } catch (err) {
      return replyJson(400, { error: err.message });
    }
  }

  // POST /api/email/welcome
  if (req.method === "POST" && pathname === "/api/email/welcome") {
    let raw = "";
    req.on("data", (c) => { raw += c; });
    req.on("end", async () => {
      try {
        const body = raw ? JSON.parse(raw) : {};
        const { recipientName = "Friend", actionUrl = "https://example.com" } = body;

        const rendered = await fastifyEmailEngine.render("welcome", {
          data: {
            user: { firstName: recipientName },
            actionUrl,
          },
        });

        const quality = inspectEmailQuality(rendered.html);

        return replyJson(200, {
          success: true,
          subject: rendered.subject,
          htmlSizeKb: quality.sizeKb,
          qualityScore: quality.score,
          previewUrl: `/preview/welcome`,
        });
      } catch (err) {
        return replyJson(400, { success: false, error: err.message });
      }
    });
    return;
  }

  // POST /api/email/invoice
  if (req.method === "POST" && pathname === "/api/email/invoice") {
    let raw = "";
    req.on("data", (c) => { raw += c; });
    req.on("end", async () => {
      try {
        const body = raw ? JSON.parse(raw) : {};
        const invoiceData = body.data || {
          customer: { name: "Acme Client" },
          invoice: {
            number: "INV-2026-901",
            issuedOn: "2026-10-14",
            dueOn: "2026-10-28",
            currency: "USD",
            items: [
              { name: "Fastify Cloud Hosting", quantity: 1, unitPriceCents: 2900 },
              { name: "SSL Certificate", quantity: 1, unitPriceCents: 1500 },
            ],
            shippingCents: 0,
            discountCents: 0,
          },
          paymentUrl: "https://billing.example.com/pay/INV-2026-901",
        };

        const rendered = await fastifyEmailEngine.render("invoice", { data: invoiceData });

        return replyJson(200, {
          success: true,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        });
      } catch (err) {
        return replyJson(400, { success: false, error: err.message });
      }
    });
    return;
  }

  // Default route
  if (req.method === "GET" && pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(`
      <h1>MailForge Fastify Service</h1>
      <p>Routes available:</p>
      <ul>
        <li><a href="/health">GET /health</a></li>
        <li><a href="/preview/welcome">GET /preview/welcome</a></li>
        <li><code>POST /api/email/welcome</code></li>
        <li><code>POST /api/email/invoice</code></li>
      </ul>
    `);
  }

  return replyJson(404, { error: "Route not found" });
}

export const app = http.createServer(fastifyHandler);

if (import.meta.url === `file://${process.argv[1]}`) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`MailForge Fastify example listening on http://localhost:${PORT}`);
  });
}
