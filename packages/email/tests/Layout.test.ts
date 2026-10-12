
import {
    describe,
    expect,
    it,
} from "vitest";

import {
    createEmail,
    EmailLayoutError,
    type EmailConfigOptions,
    type EmailDocument,
} from "../src/index.js";

function template(): EmailDocument {
    return {
        schemaVersion: "1.0",
        id: "welcome",
        version: "1.0.0",
        subject: "Welcome",
        body: [
            {
                id: "message",
                type: "text",
                props: {
                    text: "Hello from MailForge",
                },
            },
        ],
    };
}

describe("MailForge Automatic Layout", () => {
    it("1. creates automatic header, footer and copyright", async () => {
        const email = createEmail({
            brand: {
                name: "Acme Technologies",
            },
        });

        const result = await email.renderDocument(template());

        expect(result.html).toContain("Acme Technologies");
        expect(result.html).toContain("Sent by");
        expect(result.text).toContain("All rights reserved");
    });

    it("2. adds company logo automatically", async () => {
        const email = createEmail({
            brand: {
                name: "Acme",
                logo: "https://example.com/logo.png",
            },
        });

        const result = await email.renderDocument(template());

        expect(result.html).toContain(
            "https://example.com/logo.png",
        );
    });

    it("3. accepts custom header title", async () => {
        const email = createEmail({
            header: {
                title: "Custom Company Header",
            },
        });

        const result = await email.renderDocument(template());

        expect(result.html).toContain(
            "Custom Company Header",
        );
    });

    it("4. accepts custom header logo", async () => {
        const email = createEmail({
            header: {
                logo: "https://example.com/custom.png",
            },
        });

        const result = await email.renderDocument(template());

        expect(result.html).toContain(
            "https://example.com/custom.png",
        );
    });

    it("5. adds support email to footer", async () => {
        const email = createEmail({
            brand: {
                supportEmail: "support@example.com",
            },
        });

        const result = await email.renderDocument(template());

        expect(result.text).toContain(
            "support@example.com",
        );
    });

    it("6. supports explicit copyright year", async () => {
        const email = createEmail({
            copyright: {
                text: "© {year} {brand}",
                year: 2025,
            },
        });

        const result = await email.renderDocument(template());

        expect(result.text).toContain("© 2025 MailForge");
    });

    it("7. uses current year for auto copyright", async () => {
        const email = createEmail();

        const result = await email.renderDocument(template());

        expect(result.text).toContain(
            String(new Date().getFullYear()),
        );
    });

    it("8. preserves an existing custom header", async () => {
        const document = template();

        document.header = {
            id: "custom-header",
            type: "header",
            children: [
                {
                    id: "custom-header-text",
                    type: "text",
                    props: {
                        text: "My Existing Header",
                    },
                },
            ],
        };

        const email = createEmail();

        const result = await email.renderDocument(document);

        expect(result.html).toContain("My Existing Header");
        expect(result.html).not.toContain("mf-auto-header-title");
    });

    it("9. removes sections when disabled", async () => {
        const email = createEmail({
            header: { enabled: false },
            footer: { enabled: false },
            copyright: { enabled: false },
        });

        const result = await email.renderDocument(template());

        expect(result.html).toContain("Hello from MailForge");
        expect(result.html).not.toContain("Sent by MailForge");
        expect(result.html).not.toContain("All rights reserved");
    });

    it("10. supports temporary layout overrides", async () => {
        const email = createEmail({
            footer: {
                message: "Default company footer",
            },
        });

        const result = await email.renderDocument(
            template(),
            {
                layout: {
                    footer: {
                        message: "Special campaign footer",
                    },
                },
            },
        );

        expect(result.html).toContain(
            "Special campaign footer",
        );

        expect(email.getLayout().footer.message)
            .toBe("Default company footer");
    });

    it("11. retains supported data attributes", async () => {
        const email = createEmail({
            header: {
                attrs: {
                    "data-section": "custom-header",
                    "aria-label": "Company header",
                },
            },
        });

        const result = await email.renderDocument(template());

        expect(result.html).toContain("data-section");
        expect(result.html).toContain("custom-header");
    });

    it("12. applies theme colors to buttons", async () => {
        const document = template();

        document.body.push({
            id: "action",
            type: "button",
            props: {
                text: "Get Started",
                href: "https://example.com/start",
            },
        });

        const email = createEmail({
            theme: {
                preset: "modern",
                colors: {
                    primary: "#9333ea",
                },
            },
        });

        const result = await email.renderDocument(document);

        expect(result.html).toContain("#9333ea");
        expect(result.html).toContain("Get Started");
    });

    it("13. applies theme page background", async () => {
        const email = createEmail({
            theme: {
                colors: {
                    background: "#abcdef",
                },
            },
        });

        const result = await email.renderDocument(template());

        expect(result.html).toContain("#abcdef");
    });

    it("14. preserves explicit component styles", async () => {
        const document = template();

        document.body[0]!.styles = {
            color: "#ff5500",
        };

        const email = createEmail({
            theme: "corporate",
        });

        const result = await email.renderDocument(document);

        expect(result.html).toContain("#ff5500");
    });

    it("15. patches automatically generated header", async () => {
        const email = createEmail();

        const result = await email.renderDocument(
            template(),
            {
                patches: [
                    {
                        op: "update",
                        target: "mf-auto-header-title",
                        props: {
                            text: "Patched Header",
                        },
                    },
                ],
            },
        );

        expect(result.html).toContain("Patched Header");
    });

    it("16. does not modify original documents", async () => {
        const email = createEmail();
        const document = template();

        await email.renderDocument(document);

        expect(document.header).toBeUndefined();
        expect(document.footer).toBeUndefined();
        expect(document.copyright).toBeUndefined();
        expect(document.body[0]?.styles).toBeUndefined();
    });

    it("17. rejects unsafe layout attributes", () => {
        expect(() => {
            createEmail({
                header: {
                    attrs: {
                        onclick: "alert(1)",
                    },
                },
            } as unknown as EmailConfigOptions);
        }).toThrow(EmailLayoutError);
    });

    it("18. keeps different company layouts isolated", async () => {
        const companyA = createEmail({
            brand: {
                name: "Company A",
            },
            header: {
                title: "Header A",
            },
        });

        const companyB = createEmail({
            brand: {
                name: "Company B",
            },
            header: {
                title: "Header B",
            },
        });

        const resultA = await companyA.renderDocument(template());
        const resultB = await companyB.renderDocument(template());

        expect(resultA.html).toContain("Header A");
        expect(resultB.html).toContain("Header B");

        expect(resultA.html).not.toContain("Header B");
    });
});
