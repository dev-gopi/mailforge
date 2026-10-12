import { describe, expect, it } from "vitest";
import {
  createEmail, BuiltinTemplateDataError,
} from "../src/index.js";

const invoice=()=>({
  customer:{name:"Rahul"},
  invoice:{
    number:"INV-1001",issuedOn:"2026-10-12",dueOn:"2026-10-20",currency:"USD",
    items:[
      {name:"Notebook",quantity:2,unitPriceCents:2000},
      {name:"Pen",quantity:1,unitPriceCents:300},
    ],shippingCents:500,discountCents:200,
  },
  paymentUrl:"https://example.com/pay/INV-1001",
});
const receipt=()=>({
  customer:{name:"Rahul"},
  receipt:{
    number:"REC-1001",transactionId:"TXN-12345",paidOn:"2026-10-12",currency:"USD",
    items:[{name:"Notebook",quantity:1,unitPriceCents:2000}],
  },receiptUrl:"https://example.com/receipts/REC-1001",
});
const order=()=>({
  customer:{firstName:"Priya"},
  order:{
    id:"ORD-1042",placedOn:"2026-10-12",currency:"USD",
    items:[
      {name:"Notebook",quantity:2,unitPriceCents:2000},
      {name:"Pen",quantity:1,unitPriceCents:300},
    ],shippingCents:500,discountCents:200,
  },orderUrl:"https://example.com/orders/ORD-1042",
});
const alert=()=>({
  user:{firstName:"John"},
  alert:{kind:"new-device",occurredAt:"2026-10-12T12:00:00Z",device:"Chrome on Linux",location:"Kolkata",severity:"warning"},
  reviewUrl:"https://example.com/security",
});

describe("Task 7.8.1 end-to-end email integration", () => {
  it("01 lists ten built-in templates", () => {
    const email=createEmail();
    expect(email.listBuiltinTemplates()).toHaveLength(10);
    expect(email.listTemplateCatalog("billing").map(x=>x.id)).toEqual(["invoice","payment-receipt"]);
  });
  it("02 renders branded invoice with verified totals", async () => {
    const email=createEmail({brand:{name:"Acme Technologies",supportEmail:"support@example.com"}});
    const result=await email.render("invoice",{data:invoice()});
    expect(result.subject).toBe("Invoice INV-1001");
    expect(result.html).toContain("Acme Technologies");
    expect(result.text).toContain("USD 46.00");
  });
  it("03 renders receipt", async () => {
    const result=await createEmail().render("payment-receipt",{data:receipt()});
    expect(result.subject).toBe("Payment receipt REC-1001");
    expect(result.text).toContain("TXN-12345");
    expect(result.html).toContain("View Receipt");
  });
  it("04 renders order confirmation and order total", async () => {
    const result=await createEmail().render("order-confirmation",{data:order()});
    expect(result.subject).toBe("Order ORD-1042 confirmed");
    expect(result.text).toContain("Notebook");
    expect(result.text).toContain("USD 46.00");
  });
  it("05 renders security alert event", async () => {
    const result=await createEmail().render("security-alert",{data:alert()});
    expect(result.text).toContain("Chrome on Linux");
    expect(result.text).toContain("Kolkata");
    expect(result.html).toContain("Review Account Security");
  });
  it("06 rejects unsafe URLs before rendering", async () => {
    await expect(createEmail().render("invoice",{
      data:{...invoice(),paymentUrl:"javascript:alert(1)"},
    })).rejects.toBeInstanceOf(BuiltinTemplateDataError);
  });
  it("07 patches materialized invoice nodes", async () => {
    const result=await createEmail().render("invoice",{
      data:invoice(),
      patches:[{op:"update",target:"invoice-heading",props:{text:"Your Custom Invoice"}}],
    });
    expect(result.html).toContain("Your Custom Invoice");
  });
  it("08 interpolates patch values", async () => {
    const result=await createEmail().render("invoice",{
      data:invoice(),
      patches:[{op:"update",target:"invoice-heading",props:{text:"Invoice for {{customer.name}}"}}],
    });
    expect(result.html).toContain("Invoice for Rahul");
  });
  it("09 preserves custom template priority", async () => {
    const email=createEmail();
    email.registerTemplate({schemaVersion:"1.0",id:"invoice",version:"1.0.0",subject:"Custom Invoice",body:[
      {id:"custom",type:"text",props:{text:"Custom billing document"}},
    ]});
    const result=await email.render("invoice");
    expect(result.subject).toBe("Custom Invoice");
    expect(result.text).toContain("Custom billing document");
  });
  it("10 renderBuiltin ignores custom overrides", async () => {
    const email=createEmail();
    email.registerTemplate({schemaVersion:"1.0",id:"invoice",version:"1.0.0",subject:"Custom",body:[
      {id:"custom",type:"text",props:{text:"Custom"}},
    ]});
    const result=await email.renderBuiltin("invoice",invoice());
    expect(result.subject).toBe("Invoice INV-1001");
  });
  it("11 never reinterprets customer placeholders or raw HTML", async () => {
    const data=invoice();
    data.invoice.items[0]!.name="{{admin.secret}} <script>alert(1)</script>";
    const result=await createEmail().render("invoice",{data});
    expect(result.html).not.toContain("<script>alert(1)</script>");
    expect(result.text).toContain("{{admin.secret}}");
  });
  it("12 applies theme color to domain action buttons", async () => {
    const email=createEmail({theme:{colors:{primary:"#9333ea"}}});
    const result=await email.render("security-alert",{data:alert()});
    expect(result.html).toContain("#9333ea");
  });
});
