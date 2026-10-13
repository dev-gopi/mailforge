import { describe, expect, it } from "vitest";
import {
    createEmail,
    TemplateVersionError,
    type EmailDocument,
} from "../src/index.js";

function sample(version: string): EmailDocument {
    return {
        schemaVersion: "1.0",
        id: "versioned-announcement",
        version,
        subject: `Announcement ${version}`,
        body: [
            {
                id: "announcement-body",
                type: "text",
                props: { text: "Initial message" },
            },
        ],
    };
}

describe("Email engine template versions", () => {
    it("registers and resolves immutable versions", () => {
        const email = createEmail();
        const v1 = sample("1.0.0");
        email.registerTemplateVersion(v1)
            .registerTemplateVersion(sample("1.2.0"))
            .registerTemplateVersion(sample("2.0.0"));

        v1.subject = "External mutation";
        expect(email.getTemplateVersion(
            "versioned-announcement", "1.0.0",
        ).subject).toBe("Announcement 1.0.0");

        const retrieved = email.getTemplateVersion(
            "versioned-announcement", "1.0.0",
        );
        retrieved.subject = "Changed copy";
        expect(email.getTemplateVersion(
            "versioned-announcement", "1.0.0",
        ).subject).toBe("Announcement 1.0.0");

        expect(email.listTemplateVersions("versioned-announcement")
            .map(item => item.version)).toEqual([
                "2.0.0", "1.2.0", "1.0.0",
            ]);
        expect(email.resolveTemplateVersion(
            "versioned-announcement",
        ).version).toBe("2.0.0");
        expect(email.resolveTemplateVersion(
            "versioned-announcement", { compatibleWith: "1.0.0" },
        ).version).toBe("1.2.0");
    });

    it("deprecates versions without deleting them", () => {
        const email = createEmail();
        email.registerTemplateVersion(sample("1.0.0"))
            .registerTemplateVersion(sample("2.0.0"));
        email.deprecateTemplateVersion(
            "versioned-announcement", "2.0.0", "Use v1 for now",
        );

        expect(email.resolveTemplateVersion(
            "versioned-announcement",
        ).version).toBe("1.0.0");
        expect(email.listTemplateVersions("versioned-announcement")[0])
            .toMatchObject({
                version: "2.0.0",
                status: "deprecated",
                deprecationReason: "Use v1 for now",
            });
        expect(email.resolveTemplateVersion(
            "versioned-announcement",
            { version: "2.0.0", includeDeprecated: true },
        ).version).toBe("2.0.0");
        expect(() => email.resolveTemplateVersion(
            "versioned-announcement", { version: "2.0.0" },
        )).toThrow(TemplateVersionError);
    });

    it("isolates engines and rejects invalid requests", () => {
        const first = createEmail();
        const second = createEmail();
        first.registerTemplateVersion(sample("1.0.0"));

        expect(second.listTemplateVersions("versioned-announcement"))
            .toEqual([]);
        expect(() => second.getTemplateVersion(
            "versioned-announcement", "1.0.0",
        )).toThrow(TemplateVersionError);
        expect(() => first.registerTemplateVersion(sample("1.0.0")))
            .toThrow(TemplateVersionError);
        expect(() => first.registerTemplateVersion(sample("bad.version")))
            .toThrow();
        expect(() => first.resolveTemplateVersion(
            "versioned-announcement",
            { version: "1.0.0", compatibleWith: "1.0.0" },
        )).toThrow(TemplateVersionError);
    });

    it("does not change legacy registration or template lookup", () => {
        const email = createEmail();
        email.registerTemplateVersion(sample("1.0.0"));
        expect(email.listTemplates()).toEqual([]);
        expect(() => email.getTemplate("versioned-announcement"))
            .toThrow("Template not found");

        email.registerTemplate(sample("1.0.0"));
        expect(email.listTemplates()).toEqual(["versioned-announcement"]);
        expect(email.getTemplate("versioned-announcement").version)
            .toBe("1.0.0");
        expect(email.getTemplate("welcome").id).toBe("welcome");
    });
});
