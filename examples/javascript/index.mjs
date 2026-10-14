import { createEmail } from "../../packages/email/dist/index.js";
import { inspectEmailQuality } from "../../packages/preview/dist/index.js";

/**
 * Creates a configured MailForge email client for vanilla JavaScript applications.
 */
export function createMailClient(customBrand = {}) {
  const brand = {
    name: customBrand.name || "MailForge JS",
    primaryColor: customBrand.primaryColor || "#3b82f6",
    website: customBrand.website || "https://mailforge.dev",
    supportEmail: customBrand.supportEmail || "support@mailforge.dev",
  };

  const email = createEmail({
    brand,
    theme: "modern",
    footer: {
      message: "You are receiving this email because you created an account with MailForge.",
    },
  });

  return {
    async sendWelcome(recipientName, actionUrl) {
      return email.render("welcome", {
        data: {
          user: { firstName: recipientName },
          actionUrl,
        },
      });
    },

    async sendOtp(code, expiresInMinutes = 10) {
      return email.render("otp", {
        data: {
          code,
          expiresInMinutes,
        },
      });
    },

    async sendOrderConfirmation(orderData) {
      return email.render("order-confirmation", {
        data: orderData,
      });
    },

    async renderCustom(templateId, data, options = {}) {
      return email.render(templateId, { data, ...options });
    },
  };
}

/**
 * Demonstrates rendering multiple email templates in vanilla JavaScript.
 */
export async function runExample() {
  console.log("Initializing MailForge JavaScript Client...");
  const mailClient = createMailClient({ name: "JavaScript Starter" });

  // 1. Render Welcome Email
  console.log("\n1. Rendering Welcome Email...");
  const welcome = await mailClient.sendWelcome("Taylor", "https://example.com/start");
  const welcomeQuality = inspectEmailQuality(welcome.html);
  console.log(`   Subject: "${welcome.subject}"`);
  console.log(`   HTML Size: ${welcomeQuality.sizeKb} KB | Quality Score: ${welcomeQuality.score}/100`);

  // 2. Render OTP Verification Email
  console.log("\n2. Rendering OTP Verification Email...");
  const otp = await mailClient.sendOtp("849201", 15);
  console.log(`   Subject: "${otp.subject}"`);
  console.log(`   Text Snippet: ${otp.text.slice(0, 80).replace(/\n/g, " ")}...`);

  // 3. Render Order Confirmation Email
  console.log("\n3. Rendering Order Confirmation Email...");
  const order = await mailClient.sendOrderConfirmation({
    customer: { firstName: "Taylor" },
    order: {
      id: "ORD-2026-8812",
      placedOn: "2026-10-14",
      currency: "USD",
      items: [
        { name: "Wireless Headphones", quantity: 1, unitPriceCents: 9900 },
        { name: "USB-C Fast Charger", quantity: 1, unitPriceCents: 2500 },
      ],
      shippingCents: 0,
      discountCents: 1000,
    },
    orderUrl: "https://shop.example.com/orders/ORD-2026-8812",
  });
  console.log(`   Subject: "${order.subject}"`);
  console.log(`   HTML Length: ${order.html.length} characters`);

  console.log("\nAll email templates rendered successfully!");
  return { welcome, otp, order };
}

// CLI Execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runExample().catch((err) => {
    console.error("JavaScript example failed:", err);
    process.exit(1);
  });
}
