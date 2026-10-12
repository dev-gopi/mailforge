import { describe, expect, it } from "vitest";
import { DocumentValidator } from "@mailforge/core";
import {
  buildDomainTemplate, getBuiltinTemplate,
  listBuiltinTemplates, listTemplateCatalog,
} from "../src/index.js";

const invoice = () => ({
  customer: { name: "Rahul" },
  invoice: {
    number: "INV-1001", issuedOn: "2026-10-12", dueOn: "2026-10-20",
    currency: "USD",
    items: [{name:"Notebook",quantity:2,unitPriceCents:2000}],
    shippingCents: 500, discountCents: 200,
  },
  paymentUrl: "https://example.com/pay",
});
const receipt = () => ({
  customer: {name:"Rahul"},
  receipt: {
    number:"REC-1001",transactionId:"TXN-1",paidOn:"2026-10-12",currency:"USD",
    items:[{name:"Notebook",quantity:1,unitPriceCents:2000}],
  },
  receiptUrl:"https://example.com/receipts/REC-1001",
});

describe("Task 7.8.1 domain document builders", () => {
  it("01 registers all nine built-ins", () => expect(listBuiltinTemplates()).toHaveLength(9));
  it("02 groups billing templates", () => {
    expect(listTemplateCatalog("billing").map(x=>x.id)).toEqual(["invoice","payment-receipt"]);
  });
  it("03 groups ecommerce templates", () => {
    expect(listTemplateCatalog("ecommerce").map(x=>x.id)).toEqual(["order-confirmation"]);
  });
  it("04 provides valid nine catalog blueprints", () => {
    const validator = new DocumentValidator();
    for (const name of listBuiltinTemplates()) {
      const doc = getBuiltinTemplate(name);
      expect(doc.id).toBe(name);
      expect(validator.validate(doc).valid).toBe(true);
    }
  });
  it("05 materializes invoice commerce nodes", () => {
    const doc=buildDomainTemplate("invoice",invoice());
    expect(doc.subject).toBe("Invoice INV-1001");
    expect(doc.body.some(x=>x.type==="mf-order-item")).toBe(true);
    expect(doc.body.some(x=>x.type==="mf-price-summary")).toBe(true);
  });
  it("06 materializes receipt commerce nodes", () => {
    const doc=buildDomainTemplate("payment-receipt",receipt());
    expect(doc.subject).toBe("Payment receipt REC-1001");
    expect(doc.body.some(x=>x.type==="mf-price-summary")).toBe(true);
  });
  it("07 uses the order-summary composite", () => {
    const doc=buildDomainTemplate("order-confirmation",{
      customer:{firstName:"John"},
      order:{id:"ORD-1",placedOn:"2026-10-12",currency:"USD",items:[{name:"Pen",quantity:1,unitPriceCents:300}]},
      orderUrl:"https://example.com/orders/ORD-1",
    });
    expect(doc.body.some(x=>x.type==="mf-order-summary")).toBe(true);
  });
  it("08 uses security reusable components", () => {
    const doc=buildDomainTemplate("security-alert",{
      user:{firstName:"Priya"},
      alert:{kind:"new-device",occurredAt:"2026-10-12T12:00:00Z",device:"Chrome"},
      reviewUrl:"https://example.com/security",
    });
    expect(doc.body.some(x=>x.type==="mf-security-notice")).toBe(true);
    expect(doc.body.some(x=>x.type==="mf-action-button")).toBe(true);
  });
  it("09 creates independent documents", () => {
    const a=buildDomainTemplate("invoice",invoice());
    const b=buildDomainTemplate("invoice",invoice());
    a.body[0]!.props!.text="Changed";
    expect(b.body[0]?.props?.text).toBe("Invoice #INV-1001");
  });
});
