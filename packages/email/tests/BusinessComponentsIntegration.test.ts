import { describe, expect, it } from "vitest";
import { createEmail } from "../src/index.js";
import { BUSINESS_COMPONENT_NAMES } from "@mailforge/components";
import type { EmailDocument, EmailNodeValue } from "@mailforge/core";

const samples: Record<string, Record<string, EmailNodeValue>> = {
    "mf-data-table": { headers: ["Item", "Value"], rows: [["Plan", "Pro"], ["Seats", "5"]], striped: true },
    "mf-invoice-table": { currency: "USD", lines: [{ description: "Pro", quantity: 2, unitPrice: "10.00", amount: "20.00" }], total: "20.00" },
    "mf-pricing-comparison": { plans: [{name:"Basic",price:"$9",features:["Email"]},{name:"Premium",price:"$29",features:["Email","Reports"]}] },
    "mf-transaction-summary": { items: [{ label: "Status", value: "Paid" }] },
    "mf-product-card": { name:"Notebook", price:"$15",description:"Lined pages" },
    "mf-product-grid": { products: [{name:"Notebook",price:"$15"},{name:"Pen",price:"$2"}] },
    "mf-coupon-code": { code:"WELCOME20",label:"Your discount" },
    "mf-discount-banner": { title:"Special offer",detail:"Save today" },
    "mf-event-card": {title:"Annual Meetup",date:"20 October 2026",location:"London"},
    "mf-ticket-card": {event:"Annual Meetup",attendee:"Gopi",ticketCode:"T-123"},
    "mf-avatar": {src:"https://example.com/avatar.png",alt:"Portrait of Gopi"},
    "mf-profile-card": {name:"Gopi",role:"Engineer",organization:"Northstar"},
    "mf-feature-grid": {features:[{title:"Fast",description:"Quick setup"},{title:"Safe",description:"Validated data"}]},
    "mf-metric-grid": {metrics:[{label:"Users",value:"250"}]},
    "mf-alert-banner": {severity:"warning",title:"Maintenance",message:"Scheduled downtime"},
    "mf-verification-panel": {title:"Verify",code:"123456",expiresIn:"Expires in 10 minutes"},
};
function document(type: string, props: Record<string, EmailNodeValue>): EmailDocument {
    return { schemaVersion:"1.0", id:"demo-business", version:"1.0.0", subject:"Business preview", body:[{id:"component",type,props}] };
}

describe("business component rendering", () => {
    it("registers exactly the promised new components", () => {
        expect(new Set(BUSINESS_COMPONENT_NAMES).size).toBe(16);
        for (const name of BUSINESS_COMPONENT_NAMES) expect(samples[name]).toBeDefined();
    });
    for (const name of BUSINESS_COMPONENT_NAMES) {
        it(`renders ${name} as real MJML HTML and plain text`, async () => {
            const result = await createEmail().renderDocument(document(name, samples[name]!));
            expect(result.html).toContain("<html");
            expect(result.html.toLowerCase()).toContain("<table");
            expect(result.text.length).toBeGreaterThan(0);
        });
    }
    it("escapes dangerous table contents and retains display text", async () => {
        const result = await createEmail().renderDocument(document("mf-data-table", {
            headers:["Input"], rows:[["<img src=x onerror=alert(1)> & details"]],
        }));
        expect(result.html).not.toContain("<img src=x onerror");
        expect(result.html).toContain("&lt;img");
    });
    it("rejects wrong row widths and excessive rows", async () => {
        const email = createEmail();
        await expect(email.renderDocument(document("mf-data-table",{headers:["One","Two"],rows:[["only-one"]]}))).rejects.toThrow();
        await expect(email.renderDocument(document("mf-data-table",{headers:["One"],rows:Array.from({length:81},()=>["x"])}))).rejects.toThrow();
    });
    it("rejects unsafe product images and unpaired actions", async () => {
        const email = createEmail();
        await expect(email.renderDocument(document("mf-product-card",{name:"X",price:"$2",imageUrl:"javascript:alert(1)",imageAlt:"X"}))).rejects.toThrow();
        await expect(email.renderDocument(document("mf-event-card",{title:"Meetup",date:"Tomorrow",location:"Online",actionText:"RSVP"}))).rejects.toThrow();
    });
    it("uses selected theme colors without changing the original table", async () => {
        const input = document("mf-data-table",{headers:["A"],rows:[["B"]]});
        const email = createEmail({ theme: { preset:"corporate" } });
        const result = await email.renderDocument(input, {theme:{colors:{primary:"#15803d",border:"#123456"}}});
        expect(result.html).toContain("#123456");
        expect(input.body[0]?.props?.borderColor).toBeUndefined();
    });
    it("supports hiding generated component headings", async () => {
        const result = await createEmail().renderDocument(document("mf-event-card",samples["mf-event-card"]!),{display:{heading:false}});
        expect(result.html).not.toContain("Annual Meetup");
        expect(result.text).toContain("London");
    });
});
