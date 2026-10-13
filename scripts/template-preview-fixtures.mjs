/* global structuredClone */
/** Shared validated sample data, extracted from the existing gallery generator. */
const url = (suffix) => `https://example.com/${suffix}`;
const catalogData = {
  recipientName: "Gopi", actionUrl: url("dashboard"),
  unsubscribeUrl: url("unsubscribe"), detail: "Reference: MF-2026-1024",
};
const invoiceData = {
  customer: { name: "Gopi" },
  invoice: { number: "INV-2026-001", issuedOn: "2026-10-13", dueOn: "2026-10-20", currency: "USD",
    items: [{ name: "Pro subscription", quantity: 1, unitPriceCents: 4900 }, { name: "Storage add-on", quantity: 1, unitPriceCents: 1000 }],
    shippingCents: 0, discountCents: 0 },
  paymentUrl: url("billing/invoices/INV-2026-001"),
};
const receiptData = {
  customer: { name: "Gopi" },
  receipt: { number: "RCPT-2026-001", transactionId: "TXN-829102", paidOn: "2026-10-13", currency: "USD",
    items: [{ name: "Pro subscription", quantity: 1, unitPriceCents: 4900 }] },
  receiptUrl: url("billing/receipts/RCPT-2026-001"),
};
const orderData = {
  customer: { firstName: "Gopi" },
  order: { id: "ORDER-2301", placedOn: "2026-10-13", currency: "USD",
    items: [{ name: "Notebook", quantity: 2, unitPriceCents: 2000 }, { name: "Pen", quantity: 1, unitPriceCents: 500 }],
    shippingCents: 500, discountCents: 0 },
  orderUrl: url("orders/ORDER-2301"),
};
const byId = {
  welcome: { user: { firstName: "Gopi" }, actionUrl: url("dashboard") },
  otp: { code: "004271", expiresInMinutes: 10 },
  login: { user: { firstName: "Gopi" }, loginUrl: url("login-token"), expiresInMinutes: 10 },
  "password-reset": { user: { firstName: "Gopi" }, resetUrl: url("password-reset"), expiresInMinutes: 15 },
  invitation: { invitee: { firstName: "Gopi" }, inviterName: "Rahul", organizationName: "Acme", inviteUrl: url("invite/accept") },
  notification: { title: "Your report is ready", message: "Your October report is now available in your workspace.", actionUrl: url("reports") },
  invoice: invoiceData,
  "payment-receipt": receiptData,
  "order-confirmation": orderData,
  "security-alert": { user: { firstName: "Gopi" }, alert: { kind: "new-device", occurredAt: "2026-10-13T09:30:00Z",
    device: "Chrome on Ubuntu", location: "Kolkata", severity: "warning" }, reviewUrl: url("security") },
  newsletter: { issue: "October 2026", title: "The Acme Newsletter", summary: "Insights and product updates from our team.",
    featured: { title: "A better workspace", description: "Meet the improvements we made this month.", articleUrl: url("blog/better-workspace"), author: "Acme Team" },
    stories: [{ title: "Release highlights", description: "Updates across the platform", articleUrl: url("blog/releases") }],
    unsubscribeUrl: url("unsubscribe") },
  promotion: { title: "A special offer for you", description: "Save on your next order with this exclusive code.",
    discountCode: "WELCOME20", discountPercent: 20, expiresOn: "2026-11-13",
    actionUrl: url("offers"), unsubscribeUrl: url("unsubscribe"), terms: "One use per customer." },
  "shipping-update": { customer: { firstName: "Gopi" }, order: { id: "ORDER-2301" },
    shipment: { carrier: "BlueExpress", trackingNumber: "TRK-2026101301", trackingUrl: url("tracking/TRK-2026101301"),
      status: "shipped", estimatedDelivery: "2026-10-19", destinationCity: "Kolkata" } },
};
// Rich, valid fixtures for the three final catalog categories.
const categorySamples = {
  events: { event: { name: "Acme Summit", startsAt: "2026-11-05T10:00:00+05:30", endsAt: "2026-11-05T12:00:00+05:30", venue: "Online" } },
  saas: { saas: { workspaceName: "Acme Team", planName: "Pro", usagePercent: 82 } },
  support: { support: { ticketId: "TICKET-2026-103", status: "open", agentName: "Support Team" } },
};

export function getTemplatePreviewData(template) {
  const value = Object.hasOwn(byId, template.id)
    ? byId[template.id] : { ...catalogData, ...(categorySamples[template.category] ?? {}) };
  return structuredClone(value);
}
