
import {
    describe,
    expect,
    it,
} from "vitest";

import {
    createEmail,
    EmailVariableError,
    type EmailDocument,
} from "../src/index.js";

function template(): EmailDocument {
    return {
        schemaVersion: "1.0",
        id: "welcome",
        version: "1.0.0",
        subject: "Welcome, {{user.name}}",
        preheader: "Hello {{user.name}}",

        body: [
            {
                id: "greeting",
                type: "heading",
                props: {
                    text: "Hello {{user.name}}!",
                },
            },
            {
                id: "login-button",
                type: "button",
                props: {
                    text: "Log In",
                    href: "{{loginUrl}}",
                },
            },
        ],
    };
}

const validData = {
    user: {
        name: "John",
    },
    loginUrl: "https://example.com/login",
};

function simple(): EmailDocument {
    return {
        schemaVersion: "1.0",
        id: "simple",
        version: "1.0.0",
        subject: "Simple",
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

describe("MailForge Dynamic Variables", () => {
    it("1. registers templates with URL variables", () => {
        const email = createEmail();

        email.registerTemplate(template());

        expect(email.listTemplates()).toContain("welcome");

        expect(
            email.getTemplate("welcome")
                .body[1]?.props?.href,
        ).toBe("{{loginUrl}}");
    });

    it("2. interpolates subject and preheader", async () => {
        const email = createEmail();
        email.registerTemplate(template());

        const result = await email.render("welcome", {
            data: validData,
        });

        expect(result.subject).toBe("Welcome, John");
        expect(result.preheader).toBe("Hello John");
    });

    it("3. interpolates email body text", async () => {
        const email = createEmail();
        email.registerTemplate(template());

        const result = await email.render("welcome", {
            data: validData,
        });

        expect(result.html).toContain("Hello John!");
        expect(result.text).toContain("Hello John!");
    });

    it("4. resolves nested array values", async () => {
        const document = simple();

        document.body[0]!.props = {
            text: "Item: {{order.items[0].name}}",
        };

        const result = await createEmail().renderDocument(
            document,
            {
                data: {
                    order: {
                        items: [
                            { name: "Laptop" },
                        ],
                    },
                },
            },
        );

        expect(result.text).toContain("Item: Laptop");
    });

    it("5. supports number and boolean values", async () => {
        const document = simple();

        document.body[0]!.props = {
            text: "Count {{count}}, active {{active}}",
        };

        const result = await createEmail().renderDocument(
            document,
            {
                data: {
                    count: 42,
                    active: true,
                },
            },
        );

        expect(result.text)
            .toContain("Count 42, active true");
    });

    it("6. resolves complete HTTPS button URLs", async () => {
        const email = createEmail();
        email.registerTemplate(template());

        const result = await email.render("welcome", {
            data: validData,
        });

        expect(result.html)
            .toContain("https://example.com/login");
    });

    it("7. encodes partial URL path variables", async () => {
        const document = simple();

        document.body.push({
            id: "url-button",
            type: "button",
            props: {
                text: "Open",
                href: "https://example.com/u/{{slug}}",
            },
        });

        const result = await createEmail().renderDocument(
            document,
            {
                data: {
                    slug: "a/b?c",
                },
            },
        );

        expect(result.html)
            .toContain("a%2Fb%3Fc");
    });

    it("8. encodes partial URL query variables", async () => {
        const document = simple();

        document.body.push({
            id: "query-button",
            type: "button",
            props: {
                text: "Verify",
                href: "https://example.com/verify?code={{token}}",
            },
        });

        const result = await createEmail().renderDocument(
            document,
            {
                data: {
                    token: "x&admin=true",
                },
            },
        );

        expect(result.html)
            .toContain("x%26admin%3Dtrue");
    });

    it("9. supports dynamic image URLs", async () => {
        const document = simple();

        document.body.push({
            id: "avatar",
            type: "image",
            props: {
                src: "{{avatarUrl}}",
                alt: "Avatar for {{user.name}}",
            },
        });

        const result = await createEmail().renderDocument(
            document,
            {
                data: {
                    avatarUrl: "https://example.com/avatar.png",
                    user: {
                        name: "John",
                    },
                },
            },
        );

        expect(result.html)
            .toContain("https://example.com/avatar.png");

        expect(result.html).toContain("Avatar for John");
    });

    it("10. interpolates custom data attributes", async () => {
        const document = simple();

        document.body[0]!.attrs = {
            "data-user": "{{user.id}}",
        };

        const result = await createEmail().renderDocument(
            document,
            {
                data: {
                    user: {
                        id: 123,
                    },
                },
            },
        );

        expect(result.html).toContain("data-user");
        expect(result.html).toContain("123");
    });

    it("11. escapes HTML injected through text", async () => {
        const document = simple();

        document.body[0]!.props = {
            text: "Hello {{name}}",
        };

        const result = await createEmail().renderDocument(
            document,
            {
                data: {
                    name: "<script>alert(1)</script>",
                },
            },
        );

        expect(result.html)
            .not.toContain("<script>alert(1)</script>");
    });

    it("12. reports multiple missing variables", async () => {
        const document = simple();

        document.subject = "Hello {{user.name}}";
        document.body[0]!.props = {
            text: "{{user.email}}",
        };

        try {
            await createEmail().renderDocument(
                document,
                {
                    data: {},
                },
            );

            throw new Error("Expected missing variable error");
        } catch (error) {
            expect(error).toBeInstanceOf(EmailVariableError);

            const failure = error as EmailVariableError;

            expect(failure.code)
                .toBe("EMAIL_VARIABLE_MISSING");

            expect(failure.issues).toHaveLength(2);
        }
    });

    it("13. reports a missing URL variable", async () => {
        const email = createEmail();
        email.registerTemplate(template());

        await expect(
            email.render("welcome", {
                data: {
                    user: { name: "John" },
                },
            }),
        ).rejects.toMatchObject({
            code: "EMAIL_VARIABLE_MISSING",
        });
    });

    it("14. rejects unsafe URL protocols", async () => {
        const email = createEmail();
        email.registerTemplate(template());

        await expect(
            email.render("welcome", {
                data: {
                    user: { name: "John" },
                    loginUrl: "javascript:alert(1)",
                },
            }),
        ).rejects.toMatchObject({
            code: "EMAIL_VARIABLE_UNSAFE_URL",
        });
    });

    it("15. rejects URLs containing credentials", async () => {
        const email = createEmail();
        email.registerTemplate(template());

        await expect(
            email.render("welcome", {
                data: {
                    user: { name: "John" },
                    loginUrl: "https://user:pass@example.com/",
                },
            }),
        ).rejects.toMatchObject({
            code: "EMAIL_VARIABLE_UNSAFE_URL",
        });
    });

    it("16. rejects forbidden object paths", () => {
        const document = simple();

        document.body[0]!.props = {
            text: "{{user.__proto__}}",
        };

        expect(() => {
            createEmail().registerTemplate(document);
        }).toThrow(EmailVariableError);
    });

    it("17. rejects malformed variable expressions", () => {
        const document = simple();

        document.body[0]!.props = {
            text: "{{user.name.toUpperCase()}}",
        };

        expect(() => {
            createEmail().registerTemplate(document);
        }).toThrow(EmailVariableError);
    });

    it("18. rejects object values as text", async () => {
        const document = simple();

        document.body[0]!.props = {
            text: "{{user}}",
        };

        await expect(
            createEmail().renderDocument(
                document,
                {
                    data: {
                        user: {
                            name: "John",
                        },
                    },
                },
            ),
        ).rejects.toMatchObject({
            code: "EMAIL_VARIABLE_INVALID",
        });
    });

    it("19. prevents subject header injection", async () => {
        const document = simple();

        document.subject = "Hello {{name}}";

        await expect(
            createEmail().renderDocument(
                document,
                {
                    data: {
                        name: "John\r\nBcc: attacker@example.com",
                    },
                },
            ),
        ).rejects.toMatchObject({
            code: "EMAIL_VARIABLE_INVALID",
        });
    });

    it("20. disallows raw HTML interpolation", () => {
        const document = simple();

        document.body.push({
            id: "unsafe-raw-html",
            type: "raw-html",
            props: {
                html: "<div>{{user.content}}</div>",
            },
        });

        expect(() => {
            createEmail().registerTemplate(document);
        }).toThrow(EmailVariableError);
    });

    it("21. resolves patch variables without mutation", async () => {
        const email = createEmail();
        const original = simple();

        email.registerTemplate(original);

        const result = await email.render("simple", {
            data: {
                name: "Rahul",
            },

            patches: [
                {
                    op: "update",
                    target: "message",
                    props: {
                        text: "Hello {{name}}",
                    },
                },
            ],
        });

        expect(result.html).toContain("Hello Rahul");

        expect(
            email.getTemplate("simple")
                .body[0]?.props?.text,
        ).toBe("Hello");
    });
});
