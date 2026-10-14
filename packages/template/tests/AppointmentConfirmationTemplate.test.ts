import { describe, expect, it } from "vitest";
import { DocumentValidator } from "@mailforge/core";
import { buildCatalogTemplate, isCatalogTemplateName, listCatalogTemplates } from "../src/catalog/CatalogTemplates.js";
import { appointmentConfirmationPreviewData, appointmentConfirmationSchema, buildAppointmentConfirmationTemplate } from "../src/events/AppointmentConfirmationTemplate.js";

describe("appointment-confirmation (#106)", () => {
    it("is a distinct registered calendar-ticket template", () => {
        expect(isCatalogTemplateName("appointment-confirmation")).toBe(true);
        expect(listCatalogTemplates().filter(template => template.id === "appointment-confirmation")).toHaveLength(1);
        const document = buildCatalogTemplate("appointment-confirmation");
        expect(document.id).toBe("appointment-confirmation");
        expect(document.subject).toContain("northstar");
        expect(new DocumentValidator().validate(document).valid).toBe(true);
    });
    it("builds the responsive date ticket, safe actions and editable palette", () => {
        const document = buildAppointmentConfirmationTemplate({ ...appointmentConfirmationPreviewData,
            appointmentName: "Strategy session", design: { accent: "#112233", detailsText: "#445566", headingFont: "Georgia, Times New Roman, serif" },
        });
        const serialized = JSON.stringify(document);
        expect(serialized).toContain("appointment-date-day");
        expect(serialized).toContain("appointment-details-column");
        expect(serialized).toContain("Strategy session");
        expect(serialized).toContain("#112233");
        expect(serialized).toContain("Georgia");
        expect(JSON.stringify(buildAppointmentConfirmationTemplate())).not.toContain("#112233");
    });
    it("rejects unsafe appointment data and preserves generic catalog input", () => {
        const data = appointmentConfirmationPreviewData;
        expect(() => appointmentConfirmationSchema.parse({ ...data, appointmentUrl: "http://example.com/a" })).toThrow();
        expect(() => appointmentConfirmationSchema.parse({ ...data, manageUrl: "https://u:p@example.com/a" })).toThrow();
        expect(() => appointmentConfirmationSchema.parse({ ...data, monthShort: "October" })).toThrow();
        expect(() => appointmentConfirmationSchema.parse({ ...data, firstName: "Alex\nBcc: x" })).toThrow();
        expect(() => appointmentConfirmationSchema.parse({ ...data, unknown: true })).toThrow();
        const generic = buildCatalogTemplate("appointment-confirmation", { recipientName: "Sam", actionUrl: "https://example.com/a" });
        expect(JSON.stringify(generic)).toContain("Sam");
        expect(JSON.stringify(generic)).toContain("https://example.com/a");
    });
});
