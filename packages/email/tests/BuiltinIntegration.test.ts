import {
    describe,
    expect,
    it,
} from "vitest";

import {
    createEmail,
    BuiltinTemplateDataError,
} from "../src/index.js";

describe("MailForge Built-in Template Integration", () => {
    it("1. lists built-ins separately from custom templates", () => {
        const email = createEmail();

        expect(email.listBuiltinTemplates()).toHaveLength(10);
        expect(email.listTemplates()).toEqual([]);
    });

    it("2. renders a branded welcome email", async () => {
        const email = createEmail({
            brand: {
                name: "Acme Technologies",
                supportEmail: "support@example.com",
            },
        });

        const result = await email.render("welcome", {
            data: {
                user: { firstName: "John" },
                actionUrl: "https://example.com/dashboard",
            },
        });

        expect(result.subject).toBe("Welcome, John!");
        expect(result.html).toContain("Acme Technologies");
        expect(result.html).toContain("Open Your Dashboard");
        expect(result.text).toContain("support@example.com");
    });

    it("3. rejects missing required built-in data", async () => {
        const email = createEmail();

        await expect(
            email.render("welcome"),
        ).rejects.toBeInstanceOf(BuiltinTemplateDataError);
    });

    it("4. preserves leading zeros in OTP codes", async () => {
        const email = createEmail();

        const result = await email.render("otp", {
            data: {
                code: "004271",
                expiresInMinutes: 5,
            },
        });

        expect(result.text).toContain("004271");
        expect(result.text).toContain("5 minutes");
        expect(result.subject).toBe("Your verification code");
    });

    it("renders a purpose-specific login email", async () => {
        const result = await createEmail().render("login", {
            data: {
                user: { firstName: "Maya" },
                loginUrl: "https://example.com/login/token",
                expiresInMinutes: 10,
            },
        });

        expect(result.subject).toBe("Sign in to your account");
        expect(result.html).toContain("Sign In Securely");
        expect(result.html).toContain("10 minutes");
        expect(result.text).toContain("Never share your sign-in link");
    });

    it("5. rejects invalid OTP codes", async () => {
        const email = createEmail();

        await expect(
            email.render("otp", {
                data: {
                    code: "12abc",
                    expiresInMinutes: 5,
                },
            }),
        ).rejects.toMatchObject({
            code: "EMAIL_BUILTIN_DATA_INVALID",
            field: "data.code",
        });
    });

    it("6. rejects invalid expiration periods", async () => {
        const email = createEmail();

        await expect(
            email.render("otp", {
                data: {
                    code: "123456",
                    expiresInMinutes: 0,
                },
            }),
        ).rejects.toMatchObject({
            field: "data.expiresInMinutes",
        });
    });

    it("7. renders a password-reset email", async () => {
        const email = createEmail();

        const result = await email.render("password-reset", {
            data: {
                user: { firstName: "Rahul" },
                resetUrl: "https://example.com/reset?id=abc",
                expiresInMinutes: 15,
            },
        });

        expect(result.html).toContain("Reset Password");
        expect(result.html).toContain(
            "https://example.com/reset?id=abc",
        );
        expect(result.text).toContain("15 minutes");
    });

    it("8. rejects insecure password-reset links", async () => {
        const email = createEmail();

        await expect(
            email.render("password-reset", {
                data: {
                    user: { firstName: "Rahul" },
                    resetUrl: "http://example.com/reset",
                    expiresInMinutes: 15,
                },
            }),
        ).rejects.toMatchObject({
            code: "EMAIL_BUILTIN_DATA_INVALID",
            field: "data.resetUrl",
        });
    });

    it("9. renders an organization invitation", async () => {
        const email = createEmail();

        const result = await email.render("invitation", {
            data: {
                invitee: { firstName: "Gopi" },
                inviterName: "Rahul",
                organizationName: "Acme",
                inviteUrl: "https://example.com/accept",
            },
        });

        expect(result.subject)
            .toBe("Invitation to Acme");

        expect(result.text).toContain("Gopi");
        expect(result.text).toContain("Rahul");
        expect(result.html).toContain("Accept Invitation");
    });

    it("10. escapes notification HTML values", async () => {
        const email = createEmail();

        const result = await email.render("notification", {
            data: {
                title: "Security Alert",
                message: "<script>alert(1)</script>",
                actionUrl: "https://example.com/security",
            },
        });

        expect(result.html).toContain("Security Alert");

        expect(result.html).not.toContain(
            "<script>alert(1)</script>",
        );
    });

    it("11. allows a custom template to override welcome", async () => {
        const email = createEmail();

        email.registerTemplate({
            schemaVersion: "1.0",
            id: "welcome",
            version: "1.0.0",
            subject: "Custom Welcome",
            body: [
                {
                    id: "custom-message",
                    type: "text",
                    props: { text: "Custom company template" },
                },
            ],
        });

        const result = await email.render("welcome");

        expect(result.subject).toBe("Custom Welcome");
        expect(result.html)
            .toContain("Custom company template");
        expect(email.listTemplates()).toEqual(["welcome"]);
    });

    it("12. renderBuiltin always uses the packaged version", async () => {
        const email = createEmail();

        email.registerTemplate({
            schemaVersion: "1.0",
            id: "welcome",
            version: "1.0.0",
            subject: "Custom Welcome",
            body: [
                {
                    id: "custom",
                    type: "text",
                    props: { text: "Custom" },
                },
            ],
        });

        const result = await email.renderBuiltin(
            "welcome",
            {
                user: { firstName: "John" },
                actionUrl: "https://example.com",
            },
        );

        expect(result.subject).toBe("Welcome, John!");
        expect(result.html).toContain("Open Your Dashboard");
    });

    it("13. supports patches on built-in templates", async () => {
        const email = createEmail();

        const result = await email.render("welcome", {
            data: {
                user: { firstName: "John" },
                actionUrl: "https://example.com",
            },
            patches: [
                {
                    op: "update",
                    target: "welcome-description",
                    props: {
                        text: "Your customized welcome message.",
                    },
                },
            ],
        });

        expect(result.html)
            .toContain("Your customized welcome message.");

        expect(
            email.getTemplate("welcome")
                .body[1]?.props?.text,
        ).not.toBe("Your customized welcome message.");
    });
});
