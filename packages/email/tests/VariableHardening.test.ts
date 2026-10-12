
import {
    describe,
    expect,
    it,
} from "vitest";

import {
    createEmail,
    type EmailDocument,
    type TemplateData,
} from "../src/index.js";

function document(): EmailDocument {
    return {
        schemaVersion: "1.0",
        id: "hardening-test",
        version: "1.0.0",
        subject: "Test email",
        body: [
            {
                id: "message",
                type: "text",
                props: {
                    text: "Hello",
                },
            },
        ],
    };
}

describe("MailForge Variable Hardening", () => {
    it("rejects invalid Unicode in URL parameters", async () => {
        const input = document();

        input.body.push({
            id: "action",
            type: "button",
            props: {
                text: "Open",
                href: "https://example.com/u/{{slug}}",
            },
        });

        await expect(
            createEmail().renderDocument(input, {
                data: {
                    slug: "\uD800",
                },
            }),
        ).rejects.toMatchObject({
            code: "EMAIL_VARIABLE_INVALID",
        });
    });

    it("limits individual variable values", async () => {
        const input = document();

        input.body[0]!.props = {
            text: "{{value}}".repeat(9),
        };

        await expect(
            createEmail().renderDocument(input, {
                data: {
                    value: "x".repeat(4097),
                },
            }),
        ).rejects.toMatchObject({
            code: "EMAIL_VARIABLE_INVALID",
        });
    });

    it("rejects URL control characters", async () => {
        const input = document();

        input.body.push({
            id: "action",
            type: "button",
            props: {
                text: "Open",
                href: "{{loginUrl}}",
            },
        });

        await expect(
            createEmail().renderDocument(input, {
                data: {
                    loginUrl:
                        "https://example.com/a\r\nb",
                },
            }),
        ).rejects.toMatchObject({
            code: "EMAIL_VARIABLE_UNSAFE_URL",
        });
    });

    it("rejects explicitly null template data", async () => {
        const input = document();

        await expect(
            createEmail().renderDocument(input, {
                data: null as unknown as TemplateData,
            }),
        ).rejects.toMatchObject({
            code: "EMAIL_VARIABLE_INVALID",
        });
    });

    it("preserves successful interpolation and template data", async () => {
        const input = document();

        input.subject = "Welcome {{user.name}}";
        input.preheader = "Hello {{user.name}}";

        input.body[0]!.props = {
            text: "Hello {{user.name}}!",
        };

        input.body.push({
            id: "action",
            type: "button",
            props: {
                text: "Open dashboard",
                href: "{{loginUrl}}",
            },
        });

        const data = {
            user: {
                name: "Rahul",
            },
            loginUrl: "https://example.com/dashboard",
        };

        const engine = createEmail();

        engine.registerTemplate(input);

        const result = await engine.render(
            "hardening-test",
            { data },
        );

        expect(result.subject)
            .toBe("Welcome Rahul");

        expect(result.preheader)
            .toBe("Hello Rahul");

        expect(result.html)
            .toContain("Hello Rahul!");

        expect(result.html)
            .toContain(
                "https://example.com/dashboard",
            );

        expect(engine.getTemplate("hardening-test").subject)
            .toBe("Welcome {{user.name}}");

        expect(data.user.name)
            .toBe("Rahul");
    });
});
