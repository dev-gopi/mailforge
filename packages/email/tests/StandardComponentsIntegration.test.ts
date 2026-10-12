
import {
    describe,
    expect,
    it,
} from "vitest";

import {
    createEmail,
    type EmailDocument,
} from "../src/index.js";

function document(
    type: string,
    props: Record<string, string>,
): EmailDocument {
    return {
        schemaVersion: "1.0",
        id: "reusable-test",
        version: "1.0.0",
        subject: "Reusable component test",
        body: [
            {
                id: "component",
                type,
                props,
            },
        ],
    };
}

describe("MailForge Standard Component Integration", () => {
    it("1. makes six components available automatically", () => {
        const email = createEmail();

        const names = email.listComponents().map(
            (item) => item.name,
        );

        expect(names).toContain("mf-status-badge");
        expect(names).toContain("mf-otp-code");
        expect(names).toContain("mf-security-notice");
        expect(names).toContain("mf-action-button");
        expect(names).toContain("mf-brand-logo");
        expect(names).toContain("mf-image-caption");
    });

    it("2. renders status badges to HTML and text", async () => {
        const email = createEmail();

        const result = await email.renderDocument(
            document("mf-status-badge", {
                label: "Payment successful",
                status: "success",
            }),
        );

        expect(result.html)
            .toContain("Payment successful");

        expect(result.text)
            .toContain("Payment successful");

        expect(result.html).toContain("#15803d");
    });

    it("3. resolves dynamic OTP variables", async () => {
        const email = createEmail();

        const source = document("mf-otp-code", {
            code: "{{code}}",
        });

        email.registerTemplate(source);

        const result = await email.render(
            "reusable-test",
            {
                data: {
                    code: "004271",
                },
            },
        );

        expect(result.html).toContain("004271");
        expect(result.text).toContain("004271");
    });

    it("4. escapes untrusted security text", async () => {
        const email = createEmail();

        const result = await email.renderDocument(
            document("mf-security-notice", {
                message: "<script>alert(1)</script>",
                severity: "danger",
            }),
        );

        expect(result.html).not.toContain(
            "<script>alert(1)</script>",
        );

        expect(result.text).toContain("DANGER:");
    });

    it("5. applies theme color to primary actions", async () => {
        const email = createEmail({
            theme: {
                colors: {
                    primary: "#9333ea",
                },
            },
        });

        const result = await email.renderDocument(
            document("mf-action-button", {
                label: "Get Started",
                href: "https://example.com/start",
                variant: "primary",
            }),
        );

        expect(result.html).toContain("Get Started");
        expect(result.html).toContain("#9333ea");
    });

    it("6. renders company-name fallback", async () => {
        const email = createEmail();

        const result = await email.renderDocument(
            document("mf-brand-logo", {
                name: "Example Company",
            }),
        );

        expect(result.html)
            .toContain("Example Company");
    });

    it("7. renders an image with a visible caption", async () => {
        const email = createEmail();

        const source: EmailDocument = {
            schemaVersion: "1.0",
            id: "image-test",
            version: "1.0.0",
            subject: "Image",
            body: [
                {
                    id: "brand-image",
                    type: "mf-brand-logo",
                    props: {
                        name: "Acme",
                        src: "https://example.com/logo.png",
                    },
                },
                {
                    id: "captioned-image",
                    type: "mf-image-caption",
                    props: {
                        src: "https://example.com/product.png",
                        alt: "Product screenshot",
                        caption: "Our latest product",
                    },
                },
            ],
        };

        const result = await email.renderDocument(source);

        expect(result.html).toContain(
            "https://example.com/logo.png",
        );

        expect(result.html).toContain(
            "https://example.com/product.png",
        );

        expect(result.html).toContain("Our latest product");
        expect(result.text).toContain("Our latest product");
    });

    it("8. supports patches and custom attributes", async () => {
        const email = createEmail();

        const source = document("mf-status-badge", {
            label: "Pending",
            status: "warning",
        });

        source.body[0]!.attrs = {
            "data-status": "custom",
        };

        email.registerTemplate(source);

        const result = await email.render("reusable-test", {
            patches: [
                {
                    op: "update",
                    target: "component",
                    props: {
                        label: "Approved",
                        status: "success",
                    },
                },
            ],
        });

        expect(result.html).toContain("Approved");
        expect(result.html).toContain("data-status");

        expect(
            email.getTemplate("reusable-test")
                .body[0]?.props?.label,
        ).toBe("Pending");
    });

    it("9. preserves the built-in OTP template", async () => {
        const email = createEmail();

        const result = await email.render("otp", {
            data: {
                code: "004271",
                expiresInMinutes: 5,
            },
        });

        expect(result.subject)
            .toBe("Your verification code");

        expect(result.text).toContain("004271");
    });

    it("10. prevents overriding standard component names", () => {
        const email = createEmail();

        // Retrieve a valid standard definition, then
        // attempt to register it again.
        expect(() => {
            email.registerComponent({
                name: "mf-status-badge",
                version: "1.0.0",
                allowChildren: false,

                schema: {
                    safeParse: () => ({ success: true }),
                } as never,

                render: (_props, context) => ({
                    id: context.nodeId,
                    type: "text",
                    props: { text: "Replacement" },
                }),
            });
        }).toThrow("already registered");
    });
});
