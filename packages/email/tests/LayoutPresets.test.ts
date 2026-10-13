import { describe, expect, it } from "vitest";
import {
    createEmail,
    EmailLayoutPresetError,
    getLayoutPreset,
    listLayoutPresets,
    type EmailDocument,
} from "../src/index.js";

const source: EmailDocument = {
    schemaVersion: "1.0",
    id: "layout-preset-fixture",
    version: "1.0.0",
    subject: "Layout test",
    body: [
        { id: "title", type: "heading", props: { text: "Your update" } },
        { id: "message", type: "text", props: { text: "Hello from MailForge" } },
        { id: "action", type: "button", props: {
            text: "Continue", href: "https://example.com/dashboard",
        } },
    ],
};

describe("professional layout presets", () => {
    it("lists four named visual profiles", () => {
        const email = createEmail();
        expect(listLayoutPresets()).toEqual([
            "transactional", "marketing", "billing", "notification",
        ]);
        expect(email.listLayoutPresets()).toEqual(listLayoutPresets());
    });

    it("provides independent snapshots of preset definitions", () => {
        const copy = getLayoutPreset("marketing");
        copy.theme.appearance!.containerWidth = 480;
        copy.layout.header = { enabled: false };
        expect(getLayoutPreset("marketing").theme.appearance?.containerWidth).toBe(640);
        expect(getLayoutPreset("marketing").layout.header).toBeUndefined();
    });

    it("rejects unknown names at render time", async () => {
        const email = createEmail();
        expect(() => getLayoutPreset("unknown" as "marketing")).toThrow(EmailLayoutPresetError);
        await expect(email.renderDocument(source, {
            layoutPreset: "unknown" as "marketing",
        })).rejects.toThrow(EmailLayoutPresetError);
    });

    it("renders all four layouts through the existing MJML pipeline", async () => {
        const email = createEmail({ brand: { name: "Acme" } });
        for (const name of listLayoutPresets()) {
            const rendered = await email.renderDocument(source, { layoutPreset: name });
            expect(rendered.html).toContain("Hello from MailForge");
            expect(rendered.text).toContain("Hello from MailForge");
            expect(rendered.html).toContain("Acme");
        }
    });

    it("changes layout appearance while preserving source and plain text", async () => {
        const email = createEmail();
        const marketing = await email.renderDocument(source, { layoutPreset: "marketing" });
        const notification = await email.renderDocument(source, { layoutPreset: "notification" });
        expect(marketing.html).not.toBe(notification.html);
        expect(marketing.text).toBe(notification.text);
        expect(source.body[0]?.styles).toBeUndefined();
    });

    it("respects explicit layout overrides and display settings", async () => {
        const email = createEmail({ brand: { name: "Acme" } });
        const rendered = await email.renderDocument(source, {
            layoutPreset: "marketing",
            layout: { header: { enabled: false } },
            display: { heading: false },
            theme: { appearance: { containerWidth: 520 } },
        });
        expect(rendered.html).not.toContain("Your update");
        expect(rendered.html).toContain("Sent by Acme");
        expect(rendered.html).toContain("Hello from MailForge");
        expect(rendered.html).toMatch(/520px/);
    });

    it("keeps existing default rendering unchanged after using a preset", async () => {
        const email = createEmail({ brand: { name: "Acme" } });
        const before = await email.renderDocument(source);
        await email.renderDocument(source, { layoutPreset: "billing" });
        const after = await email.renderDocument(source);
        expect(after.html).toBe(before.html);
        expect(after.text).toBe(before.text);
    });
});
