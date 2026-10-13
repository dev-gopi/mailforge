import { describe, expect, it } from "vitest";
import { createEmail } from "../src/index.js";
import { EXPANDED_CATALOG_TEMPLATE_NAMES, listCatalogTemplates } from "@mailforge/templates";

const data = { recipientName:"Gopi", actionUrl:"https://example.com/action", unsubscribeUrl:"https://example.com/unsubscribe" };

describe("real MJML rendering and customization", () => {
    it("renders all 51 new templates with real HTML/text and their own subjects", async () => {
        const email = createEmail({brand:{name:"Northstar"},theme:"modern"});
        const catalog = listCatalogTemplates();
        for (const id of EXPANDED_CATALOG_TEMPLATE_NAMES) {
            const info = catalog.find(row => row.id === id);
            expect(info,id).toBeDefined();
            const result = await email.render(id, {data});
            expect(result.subject,id).toBe(info?.title);
            expect(result.html.toLowerCase(),id).toContain("<html");
            expect(result.text,id).toContain("Gopi");
            expect(result.html,id).toContain("https://example.com/action");
            expect(result.text.trim().length,id).toBeGreaterThan(60);
            if (info?.category === "marketing") expect(result.html,id).toContain("unsubscribe");
        }
    }, 90_000);
    it("keeps themes, display controls and secondary actions working", async () => {
        const email = createEmail({theme:"forest",brand:{name:"Northstar"}});
        const result = await email.render("event-ticket-issued", {
            data:{...data, event:{name:"Northstar Summit",venue:"Online",startsAt:"2026-11-05T10:00:00+05:30"},
                presentation:{summary:"Your ticket is ready",facts:[{label:"Seat",value:"A-12"}],
                nextSteps:["Bring your ticket"],secondaryAction:{label:"Venue map",url:"https://example.com/map"}}},
            display:{heading:false},
        });
        expect(result.html).toContain("#166534");
        expect(result.text).toContain("A-12");
        expect(result.text).toContain("Bring your ticket");
        expect(result.html).toContain("https://example.com/map");
        expect(result.html).not.toContain("Your event ticket is ready</");
    });
    it("escapes dangerous personalized text rather than outputting active markup", async () => {
        const email = createEmail();
        const result = await email.render("account-restored", {
            data:{...data, presentation:{summary:"<img src=x onerror=alert(1)>"}},
        });
        expect(result.html).not.toContain("<img src=x onerror");
        expect(result.html).toContain("&lt;img");
    });
    it("rejects missing marketing opt-out and invalid context before rendering", async () => {
        const email = createEmail();
        await expect(email.render("flash-sale", {data:{recipientName:"Gopi",actionUrl:data.actionUrl}})).rejects.toThrow();
        await expect(email.render("invoice-overdue", {data:{...data,billing:{amount:"20"}}})).rejects.toThrow();
    });
});
