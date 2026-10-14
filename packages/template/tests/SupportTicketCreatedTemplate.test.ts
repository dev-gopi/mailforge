import { describe, expect, it } from "vitest";
import { DocumentValidator } from "@mailforge/core";
import { buildCatalogTemplate, isCatalogTemplateName, listCatalogTemplates } from "../src/catalog/CatalogTemplates.js";
import { buildSupportTicketCreatedTemplate, supportTicketCreatedPreviewData, supportTicketCreatedSchema } from "../src/support/SupportTicketCreatedTemplate.js";

describe("support-ticket-created (#109)", () => {
    it("registers a standalone support ticket confirmation template with a valid document", () => {
        expect(isCatalogTemplateName("support-ticket-created")).toBe(true);
        expect(listCatalogTemplates().filter(item => item.id === "support-ticket-created")).toHaveLength(1);
        const document = buildCatalogTemplate("support-ticket-created");
        expect(document.metadata?.designFamily).toBe("conversation");
        expect(new DocumentValidator().validate(document).valid).toBe(true);
    });

    it("customizes ticket details, palette, and typography without leaking state", () => {
        const document = buildSupportTicketCreatedTemplate({
            ...supportTicketCreatedPreviewData,
            ticketNumber: "INC-9999",
            ticketSubject: "Server down",
            design: { banner: "#001122", bannerAccent: "#00AA99", canvas: "#F0F0F0" },
        });
        const output = JSON.stringify(document);
        expect(output).toContain("INC-9999");
        expect(output).toContain("Server down");
        expect(output).toContain("#001122");
        expect(output).toContain("#00AA99");
        expect(document.head?.bodyBackgroundColor).toBe("#F0F0F0");
        expect(JSON.stringify(buildSupportTicketCreatedTemplate())).not.toContain("INC-9999");
    });

    it("rejects unsafe URLs, invalid emails, and unknown fields while preserving generic catalog input", () => {
        const data = supportTicketCreatedPreviewData;
        expect(() => supportTicketCreatedSchema.parse({ ...data, ticketUrl: "http://example.com/ticket" })).toThrow();
        expect(() => supportTicketCreatedSchema.parse({ ...data, supportEmail: "not-an-email" })).toThrow();
        expect(() => supportTicketCreatedSchema.parse({ ...data, ticketNumber: "HD\nEvil" })).toThrow();
        expect(() => supportTicketCreatedSchema.parse({ ...data, unexpected: true })).toThrow();

        const generic = buildCatalogTemplate("support-ticket-created", {
            recipientName: "Jordan",
            actionUrl: "https://example.com/tickets/1",
        });
        expect(JSON.stringify(generic)).toContain("Jordan");
        expect(JSON.stringify(generic)).toContain("https://example.com/tickets/1");
    });
});

