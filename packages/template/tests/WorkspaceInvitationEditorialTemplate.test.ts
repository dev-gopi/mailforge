import { describe, expect, it } from "vitest";
import { DocumentValidator } from "@mailforge/core";
import { buildCatalogTemplate, isCatalogTemplateName, listCatalogTemplates } from "../src/catalog/CatalogTemplates.js";
import { buildWorkspaceInvitationEditorialTemplate, workspaceInvitationEditorialSchema,
    workspaceInvitationEditorialPreviewData } from "../src/account/WorkspaceInvitationEditorialTemplate.js";

describe("workspace-invitation-editorial (#105)", () => {
    it("registers a standalone template while preserving existing invitations", () => {
        expect(isCatalogTemplateName("workspace-invitation-editorial")).toBe(true);
        expect(listCatalogTemplates().filter(item => item.id === "workspace-invitation-editorial")).toHaveLength(1);
        expect(listCatalogTemplates()).toHaveLength(96);
        const doc = buildCatalogTemplate("workspace-invitation-editorial");
        expect(doc.id).toBe("workspace-invitation-editorial");
        expect(doc.subject).toContain("Fieldnotes");
        expect(new DocumentValidator().validate(doc).valid).toBe(true);
    });
    it("has outside-card branding and footer, an editable hero, workspace avatar and action", () => {
        const doc = buildWorkspaceInvitationEditorialTemplate();
        expect(doc.body.some(n => n.attrs?.["data-mf-placement"] === "before-shell")).toBe(true);
        expect(doc.body.some(n => n.attrs?.["data-mf-placement"] === "after-shell")).toBe(true);
        const serialized = JSON.stringify(doc.body);
        expect(serialized).toContain("invite-editorial-workspace-avatar");
        expect(serialized).toContain("invite-editorial-action");
        expect(serialized).toContain("Fieldnotes");
        expect(serialized).not.toContain("raw-html");
    });
    it("honors content, typography and palette overrides without changing defaults", () => {
        const custom = buildWorkspaceInvitationEditorialTemplate({ ...workspaceInvitationEditorialPreviewData,
            headingFirst: "Join", headingSecond: "the team", roleName: "Administrator",
            brandName: "Orbit", design: { plum: "#112233", coral: "#445566", bodyFont: "Verdana, Geneva, sans-serif" },
        });
        const serialized = JSON.stringify(custom);
        expect(serialized).toContain("the team");
        expect(serialized).toContain("Administrator");
        expect(serialized).toContain("#112233");
        expect(serialized).toContain("Verdana");
        expect(JSON.stringify(buildWorkspaceInvitationEditorialTemplate())).not.toContain("#112233");
    });
    it("rejects invalid links, fields, expiry and control characters", () => {
        const d = workspaceInvitationEditorialPreviewData;
        expect(() => workspaceInvitationEditorialSchema.parse({ ...d, invitationUrl: "http://example.com" })).toThrow();
        expect(() => workspaceInvitationEditorialSchema.parse({ ...d, supportUrl: "javascript:alert(1)" })).toThrow();
        expect(() => workspaceInvitationEditorialSchema.parse({ ...d, invitationUrl: "https://u:p@example.com" })).toThrow();
        expect(() => workspaceInvitationEditorialSchema.parse({ ...d, expiryDays: 0 })).toThrow();
        expect(() => workspaceInvitationEditorialSchema.parse({ ...d, workspaceInitial: "ZZ" })).toThrow();
        expect(() => workspaceInvitationEditorialSchema.parse({ ...d, inviterName: "Hi\nBcc:evil" })).toThrow();
        expect(() => workspaceInvitationEditorialSchema.parse({ ...d, unknown: "no" })).toThrow();
        expect(() => workspaceInvitationEditorialSchema.parse({ ...d, design: { coral: "expression(1)" } })).toThrow();
    });
    it("keeps generic catalog input compatible without relaxing the strict dedicated schema", () => {
        const document = buildCatalogTemplate("workspace-invitation-editorial", {
            recipientName: "Sam", actionUrl: "https://example.com/accept/sam",
        });
        expect(JSON.stringify(document)).toContain("Sam");
        expect(JSON.stringify(document)).toContain("https://example.com/accept/sam");
        expect(() => buildWorkspaceInvitationEditorialTemplate({ recipientName: "Sam" })).toThrow();
    });
});
