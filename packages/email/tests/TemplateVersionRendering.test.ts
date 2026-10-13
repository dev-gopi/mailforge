import { describe, expect, it } from "vitest";
import {
    createEmail,
    TemplateVersionError,
    type EmailDocument,
} from "../src/index.js";

function announcement(version: string, message: string): EmailDocument {
    return {
        schemaVersion: "1.0",
        id: "versioned-render-demo",
        version,
        subject: `Announcement ${version}`,
        body: [
            {
                id: "announcement-body",
                type: "text",
                props: { text: message },
            },
        ],
    };
}

describe("Version-aware rendering", () => {
    it("renders an explicitly selected version", async () => {
        const email = createEmail();
        email.registerTemplateVersion(announcement("1.0.0", "Old content"));
        email.registerTemplateVersion(announcement("2.0.0", "New content"));

        const old = await email.render("versioned-render-demo", {
            templateVersion: { version: "1.0.0" },
        });
        const recent = await email.render("versioned-render-demo", {
            templateVersion: { version: "2.0.0" },
        });

        expect(old.subject).toBe("Announcement 1.0.0");
        expect(old.text).toContain("Old content");
        expect(recent.subject).toBe("Announcement 2.0.0");
        expect(recent.text).toContain("New content");
    });

    it("resolves the newest compatible or active version", async () => {
        const email = createEmail();
        email.registerTemplateVersion(announcement("1.0.0", "First"));
        email.registerTemplateVersion(announcement("1.2.0", "Compatible"));
        email.registerTemplateVersion(announcement("2.0.0", "Latest"));

        const compatible = await email.render("versioned-render-demo", {
            templateVersion: { compatibleWith: "1.0.0" },
        });
        const latest = await email.render("versioned-render-demo", {
            templateVersion: {},
        });

        expect(compatible.subject).toBe("Announcement 1.2.0");
        expect(latest.subject).toBe("Announcement 2.0.0");
    });

    it("excludes deprecated versions unless explicitly allowed", async () => {
        const email = createEmail();
        email.registerTemplateVersion(announcement("1.0.0", "Stable"));
        email.registerTemplateVersion(announcement("2.0.0", "Deprecated"));
        email.deprecateTemplateVersion("versioned-render-demo", "2.0.0");

        const active = await email.render("versioned-render-demo", {
            templateVersion: {},
        });
        expect(active.subject).toBe("Announcement 1.0.0");

        await expect(email.render("versioned-render-demo", {
            templateVersion: { version: "2.0.0" },
        })).rejects.toThrow(TemplateVersionError);

        const allowed = await email.render("versioned-render-demo", {
            templateVersion: {
                version: "2.0.0",
                includeDeprecated: true,
            },
        });
        expect(allowed.subject).toBe("Announcement 2.0.0");
    });

    it("fails closed for unknown versions and conflicting selectors", async () => {
        const email = createEmail();
        email.registerTemplate(announcement("1.0.0", "Current template"));

        await expect(email.render("versioned-render-demo", {
            templateVersion: { version: "1.0.0" },
        })).rejects.toThrow(TemplateVersionError);

        email.registerTemplateVersion(announcement("1.0.0", "Saved version"));
        await expect(email.render("versioned-render-demo", {
            templateVersion: {
                version: "1.0.0",
                compatibleWith: "1.0.0",
            },
        })).rejects.toThrow(TemplateVersionError);
    });

    it("uses the normal variable and display customization pipeline", async () => {
        const email = createEmail();
        const document = announcement("1.0.0", "Hello {{name}}!");
        document.body.unshift({
            id: "optional-heading",
            type: "heading",
            props: { text: "Optional heading" },
        });
        email.registerTemplateVersion(document);

        const rendered = await email.render("versioned-render-demo", {
            templateVersion: { version: "1.0.0" },
            data: { name: "Gopi" },
            display: { heading: false },
        });

        expect(rendered.text).toContain("Hello Gopi!");
        expect(rendered.html).not.toContain("Optional heading");
        expect(email.getTemplateVersion(
            "versioned-render-demo", "1.0.0",
        ).body).toHaveLength(2);
    });

    it("preserves legacy rendering and custom template precedence", async () => {
        const email = createEmail();
        email.registerTemplateVersion(announcement("2.0.0", "Saved history"));
        email.registerTemplate(announcement("1.0.0", "Current template"));

        const normal = await email.render("versioned-render-demo");
        const published = await email.render("versioned-render-demo", {
            templateVersion: {},
        });

        expect(normal.subject).toBe("Announcement 1.0.0");
        expect(normal.text).toContain("Current template");
        expect(published.subject).toBe("Announcement 2.0.0");
        expect(published.text).toContain("Saved history");
    });
});
