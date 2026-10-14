import { createEmail } from "../../packages/email/dist/index.js";
import { inspectEmailQuality } from "../../packages/preview/dist/index.js";

/**
 * Creates an in-memory JSON/stream Nodemailer-compatible transport
 * for testing and local previewing without a live SMTP server.
 */
export function createPreviewTransport() {
  const sentMessages = [];

  return {
    async sendMail(mailOptions) {
      const messageId = `<mailforge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@mailforge.dev>`;
      const record = {
        messageId,
        ...mailOptions,
        sentAt: new Date().toISOString(),
      };
      sentMessages.push(record);

      return {
        messageId,
        accepted: Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to],
        rejected: [],
        response: `250 Message accepted: ${messageId}`,
        message: JSON.stringify(record, null, 2),
      };
    },
    getSentMessages() {
      return [...sentMessages];
    },
    clear() {
      sentMessages.length = 0;
    },
  };
}

/**
 * MailForge + Nodemailer Dispatcher.
 * Renders templates with MailForge and transmits them via any Nodemailer transport.
 */
export class MailForgeNodemailerSender {
  constructor(transport, emailEngine) {
    this.transport = transport || createPreviewTransport();
    this.emailEngine = emailEngine || createEmail({
      brand: {
        name: "Acme Logistics",
        primaryColor: "#0284c7",
        website: "https://acme.example.com",
        supportEmail: "support@acme.example.com",
      },
      footer: {
        message: "Thank you for using Acme Logistics. Tracking updates are sent automatically.",
      },
      theme: "modern",
    });
  }

  /**
   * Renders a MailForge template and sends it through Nodemailer transport.
   */
  async sendTemplateEmail({ to, from, template, data, subjectOverride }) {
    // 1. Render template with MailForge
    const rendered = await this.emailEngine.render(template, { data });

    // 2. Perform deliverability diagnostics
    const quality = inspectEmailQuality(rendered.html);

    // 3. Assemble Nodemailer payload
    const mailOptions = {
      from: from || "Acme Logistics <noreply@acme.example.com>",
      to,
      subject: subjectOverride || rendered.subject,
      html: rendered.html,
      text: rendered.text,
      headers: {
        "X-Mailer": "MailForge/1.0 (Nodemailer Adapter)",
        "X-Email-Score": String(quality.score),
      },
    };

    // 4. Send via transport
    const receipt = await this.transport.sendMail(mailOptions);

    return {
      messageId: receipt.messageId,
      accepted: receipt.accepted,
      subject: mailOptions.subject,
      sizeKb: quality.sizeKb,
      qualityScore: quality.score,
    };
  }
}

/**
 * Demonstrates sending both a Welcome email and a Shipping Update email via Nodemailer.
 */
export async function runNodemailerExample() {
  console.log("Initializing MailForge + Nodemailer Dispatcher...\n");
  const transport = createPreviewTransport();
  const sender = new MailForgeNodemailerSender(transport);

  // 1. Send Welcome Email
  console.log("1. Sending Welcome Email...");
  const welcomeReceipt = await sender.sendTemplateEmail({
    to: "customer@example.com",
    template: "welcome",
    data: {
      user: { firstName: "Jordan" },
      actionUrl: "https://acme.example.com/start",
    },
  });

  console.log(`   Message ID: ${welcomeReceipt.messageId}`);
  console.log(`   To: ${welcomeReceipt.accepted.join(", ")}`);
  console.log(`   Subject: "${welcomeReceipt.subject}"`);
  console.log(`   HTML Size: ${welcomeReceipt.sizeKb} KB | Quality: ${welcomeReceipt.qualityScore}/100\n`);

  // 2. Send Shipping Update Email
  console.log("2. Sending Shipping Notification Email...");
  const shippingReceipt = await sender.sendTemplateEmail({
    to: "customer@example.com",
    template: "shipping-update",
    data: {
      customer: { firstName: "Jordan" },
      order: { id: "ORD-99120" },
      shipment: {
        carrier: "FedEx",
        trackingNumber: "FDX-7749102",
        trackingUrl: "https://tracking.example.com/FDX-7749102",
        status: "shipped",
        estimatedDelivery: "2026-10-18",
        destinationCity: "Austin, TX",
      },
    },
  });

  console.log(`   Message ID: ${shippingReceipt.messageId}`);
  console.log(`   Subject: "${shippingReceipt.subject}"`);
  console.log(`   HTML Size: ${shippingReceipt.sizeKb} KB | Quality: ${shippingReceipt.qualityScore}/100\n`);

  console.log("Nodemailer transmission completed successfully. Total sent:", transport.getSentMessages().length);
}

// CLI Execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runNodemailerExample().catch((err) => {
    console.error("Nodemailer example error:", err);
    process.exit(1);
  });
}
