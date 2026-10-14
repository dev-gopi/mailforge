import { describe, expect, it } from "vitest";
import { createEmail } from "../src/index.js";
import { workspaceInvitationEditorialPreviewData } from "@mailforge/templates";

describe("workspace-invitation-editorial public API", () => {
    it("renders escaped email HTML and text through the standard API", async () => {
        const message = await createEmail().render("workspace-invitation-editorial", { data: {
            ...workspaceInvitationEditorialPreviewData, inviterName: "Test <script>alert(1)</script>",
        } });
        expect(message.subject).toContain("Fieldnotes");
        expect(message.html).toContain("&lt;script&gt;");
        expect(message.html).not.toContain("<script>alert(1)</script>");
        expect(message.html).toContain("https://example.com/invitations/sample");
        expect(message.text).toContain("Fieldnotes");
    });
    it("applies per-render node customization, themes and content without state leaking", async () => {
        const email = createEmail();
        const changed = await email.render("workspace-invitation-editorial", { data: {
            ...workspaceInvitationEditorialPreviewData, design: { coral: "#112233" },
        }, themeName: "modern", overrides: { byId: {
            "invite-editorial-action": { props: { text: "Join workspace now" } },
        } } });
        const base = await email.render("workspace-invitation-editorial", { data: workspaceInvitationEditorialPreviewData });
        expect(changed.html).toContain("Join workspace now");
        expect(changed.html).toContain("#112233");
        expect(base.html).not.toContain("Join workspace now");
        expect(base.html).not.toContain("#112233");
    });
    it("renders the modern no-heading variant without a broken mobile column group", async () => {
        const email = createEmail();
        const data = workspaceInvitationEditorialPreviewData;
        const variant = await email.render("workspace-invitation-editorial", {
            data, themeName: "modern",
            display: { heading: false, headerTitle: false, eyebrow: false },
        });
        expect(variant.html).toContain("kindred");
        expect(variant.html).not.toContain("WORKSPACE INVITE");
        expect(variant.html).toContain("Fieldnotes");
        expect(variant.text.trim().length).toBeGreaterThan(0);
        const unchanged = await email.render("workspace-invitation-editorial", { data, themeName: "modern" });
        expect(unchanged.html).toContain("WORKSPACE INVITE");
    });
    it("rejects missing/unsafe data", async () => {
        await expect(createEmail().render("workspace-invitation-editorial", { data: {
            ...workspaceInvitationEditorialPreviewData, invitationUrl: "javascript:alert(1)",
        } })).rejects.toThrow();
        await expect(createEmail().render("workspace-invitation-editorial", { data: {
            ...workspaceInvitationEditorialPreviewData, unwanted: true,
        } })).rejects.toThrow();
    });
});
