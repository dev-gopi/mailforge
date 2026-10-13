import { describe, expect, it } from "vitest";
import {
    createEmail,
    TemplateVersionError,
    type EmailDocument,
} from "../src/index.js";

function custom(version: string, text: string): EmailDocument {
    return {
        schemaVersion: "1.0",
        id: "release-note",
        version,
        subject: `Release ${version}`,
        body: [{ id: "release-body", type: "text", props: { text } }],
    };
}

describe("Safe publication and migration", () => {
    it("publishes a core built-in without changing its normal rendering", async () => {
        const email = createEmail();
        email.publishTemplateVersion("welcome");
        expect(email.listTemplateVersions("welcome").map(item => item.version))
            .toEqual(["1.0.0"]);

        const data = {
            user: { firstName: "Gopi" },
            actionUrl: "https://example.com/dashboard",
        };
        const published = await email.render("welcome", {
            templateVersion: { version: "1.0.0" },
            data,
        });
        const original = await email.render("welcome", { data });
        expect(published.subject).toBe(original.subject);
        expect(published.text).toContain("Gopi");
        expect(original.text).toContain("Gopi");
    });

    it("saves custom overrides as immutable snapshots", async () => {
        const email = createEmail();
        email.registerTemplate(custom("1.0.0", "Old copy"));
        email.publishTemplateVersion("release-note");
        email.overrideTemplate(custom("2.0.0", "Current copy"));

        const historical = await email.render("release-note", {
            templateVersion: { version: "1.0.0" },
        });
        const current = await email.render("release-note");
        expect(historical.text).toContain("Old copy");
        expect(current.text).toContain("Current copy");
    });

    it("migrates from a detached source and optionally deprecates it", async () => {
        const email = createEmail();
        email.registerTemplateVersion(custom("1.0.0", "Original"));
        email.migrateTemplateVersion(
            "release-note", "1.0.0", "1.1.0",
            draft => {
                draft.subject = "Updated release";
                draft.body[0]!.props!.text = "Revised";
            },
            { deprecateSource: true, reason: "Use v1.1.0" },
        );
        expect(email.getTemplateVersion("release-note", "1.0.0").subject)
            .toBe("Release 1.0.0");
        expect(email.listTemplateVersions("release-note")).toEqual([
            { id: "release-note", version: "1.1.0", status: "active" },
            { id: "release-note", version: "1.0.0", status: "deprecated", deprecationReason: "Use v1.1.0" },
        ]);
        expect((await email.render("release-note", {
            templateVersion: {},
        })).text).toContain("Revised");
        await expect(email.render("release-note", {
            templateVersion: { version: "1.0.0" },
        })).rejects.toThrow(TemplateVersionError);
    });

    it("rejects unsafe catalog publication and duplicate versions", () => {
        const email = createEmail();
        expect(() => email.publishTemplateVersion("invoice"))
            .toThrow(TemplateVersionError);
        expect(() => email.publishTemplateVersion("newsletter"))
            .toThrow(TemplateVersionError);
        expect(() => email.publishTemplateVersion("not-found"))
            .toThrow(TemplateVersionError);
        email.publishTemplateVersion("welcome");
        expect(() => email.publishTemplateVersion("welcome"))
            .toThrow(TemplateVersionError);
    });

    it("rejects invalid migrations without altering source or deprecation", () => {
        const email = createEmail();
        email.registerTemplateVersion(custom("1.0.0", "Unchanged"));
        expect(() => email.migrateTemplateVersion(
            "release-note", "1.0.0", "0.9.0", draft => draft,
            { deprecateSource: true },
        )).toThrow(TemplateVersionError);
        expect(() => email.migrateTemplateVersion(
            "release-note", "1.0.0", "2.0.0", () => {
                throw new Error("customization failed");
            },
            { deprecateSource: true },
        )).toThrow("customization failed");
        expect(() => email.migrateTemplateVersion(
            "release-note", "1.0.0", "2.0.0", draft => {
                draft.id = "other-template";
            },
        )).toThrow(TemplateVersionError);
        expect(email.listTemplateVersions("release-note")).toEqual([
            { id: "release-note", version: "1.0.0", status: "active" },
        ]);
        expect(email.getTemplateVersion("release-note", "1.0.0")
            .body[0]!.props!.text).toBe("Unchanged");
    });
});
