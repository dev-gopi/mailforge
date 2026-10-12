import { describe, expect, it } from "vitest";
import {
  BuiltinTemplateDataError,
  parseDomainTemplateData,
} from "../src/index.js";

const invoice = () => ({
  customer: { name: "Rahul" },
  invoice: {
    number: "INV-1001", issuedOn: "2026-10-12", dueOn: "2026-10-20",
    currency: "USD",
    items: [{ name: "Notebook", quantity: 2, unitPriceCents: 2000 }],
  },
  paymentUrl: "https://example.com/invoices/INV-1001",
});
const receipt = () => ({
  customer: { name: "Rahul" },
  receipt: {
    number: "REC-1", transactionId: "TXN-1", paidOn: "2026-10-12",
    currency: "INR",
    items: [{ name: "Subscription", quantity: 1, unitPriceCents: 19999 }],
  },
  receiptUrl: "https://example.com/receipt",
});
const order = () => ({
  customer: { firstName: "Priya" },
  order: {
    id: "ORD-1", placedOn: "2026-10-12", currency: "USD",
    items: [{ name: "Pen", quantity: 1, unitPriceCents: 300 }],
  },
  orderUrl: "https://example.com/orders/ORD-1",
});
const alert = () => ({
  user: { firstName: "John" },
  alert: { kind: "new-device", occurredAt: "2026-10-12T12:00:00Z", device: "Chrome" },
  reviewUrl: "https://example.com/security",
});

describe("Task 7.8.1 domain data contracts", () => {
  it("01 applies monetary defaults", () => {
    const data = parseDomainTemplateData("invoice", invoice());
    expect(data.invoice.shippingCents).toBe(0);
    expect(data.invoice.discountCents).toBe(0);
  });
  it("02 validates payment receipt", () => {
    expect(parseDomainTemplateData("payment-receipt", receipt()).receipt.currency).toBe("INR");
  });
  it("03 validates order confirmation", () => {
    expect(parseDomainTemplateData("order-confirmation", order()).order.id).toBe("ORD-1");
  });
  it("04 applies security severity default", () => {
    expect(parseDomainTemplateData("security-alert", alert()).alert.severity).toBe("warning");
  });
  it("05 rejects missing customer", () => {
    const missing: Record<string, unknown> = { ...invoice() };
    delete missing.customer;
    expect(() => parseDomainTemplateData("invoice", missing)).toThrow(BuiltinTemplateDataError);
  });
  it("06 rejects non-HTTPS links", () => {
    expect(() => parseDomainTemplateData("invoice", {
      ...invoice(), paymentUrl: "http://example.com/pay",
    })).toThrow(BuiltinTemplateDataError);
  });
  it("07 rejects invalid calendar dates", () => {
    const data = invoice(); data.invoice.issuedOn = "2026-02-30";
    expect(() => parseDomainTemplateData("invoice", data)).toThrow(BuiltinTemplateDataError);
  });
  it("08 rejects backwards due dates", () => {
    const data = invoice(); data.invoice.dueOn = "2026-10-01";
    expect(() => parseDomainTemplateData("invoice", data)).toThrow(BuiltinTemplateDataError);
  });
  it("09 rejects discounts exceeding charges", () => {
    expect(() => parseDomainTemplateData("invoice", {
      ...invoice(), invoice: { ...invoice().invoice, discountCents: 5000 },
    })).toThrow(BuiltinTemplateDataError);
  });
  it("10 rejects zero quantities", () => {
    const data = invoice(); data.invoice.items[0]!.quantity = 0;
    expect(() => parseDomainTemplateData("invoice", data)).toThrow(BuiltinTemplateDataError);
  });
  it("11 caps line items", () => {
    expect(() => parseDomainTemplateData("invoice", {
      ...invoice(), invoice: {
        ...invoice().invoice,
        items: Array.from({length:21}, (_,index) => ({name:`Item ${index}`,quantity:1,unitPriceCents:100})),
      },
    })).toThrow(BuiltinTemplateDataError);
  });
  it("12 rejects getters without invoking them", () => {
    let invoked = false;
    const data = {
      get customer() { invoked = true; throw new Error("getter should not run"); },
      invoice: invoice().invoice,
      paymentUrl: "https://example.com/pay",
    };
    expect(() => parseDomainTemplateData("invoice", data)).toThrow("getters are unsupported");
    expect(invoked).toBe(false);
  });
  it("13 rejects impossible UTC timestamps", () => {
    expect(() => parseDomainTemplateData("security-alert", {
      ...alert(), alert: { ...alert().alert, occurredAt: "2026-02-30T12:00:00Z" },
    })).toThrow(BuiltinTemplateDataError);
  });
  it("14 rejects future non-JSON business objects", () => {
    expect(() => parseDomainTemplateData("invoice", {
      ...invoice(), customer: new Date(),
    })).toThrow(BuiltinTemplateDataError);
  });
});
