
import {
    describe,
    expect,
    it,
} from "vitest";

import {
    createEmail,
    EmailConfigError,
    type EmailConfigOptions,
    type EmailDocument,
} from "../src/index.js";

describe("MailForge Global Branding", () => {
    it("1. creates default brand configuration", () => {
        const email = createEmail();

        expect(email.getBrand()).toEqual({
            name: "MailForge",
            primaryColor: "#2563eb",
        });
    });

    it("2. applies defaults to partial branding", () => {
        const email = createEmail({
            brand: {
                name: "Acme",
            },
        });

        expect(email.getBrand()).toEqual({
            name: "Acme",
            primaryColor: "#2563eb",
        });
    });

    it("3. accepts complete branding configuration", () => {
        const email = createEmail({
            brand: {
                name: "Acme Technologies",
                logo: "https://example.com/logo.png",
                website: "https://example.com",
                primaryColor: "#ff5500",
                supportEmail: "support@example.com",
            },
        });

        expect(email.getBrand()).toEqual({
            name: "Acme Technologies",
            logo: "https://example.com/logo.png",
            website: "https://example.com",
            primaryColor: "#ff5500",
            supportEmail: "support@example.com",
        });
    });

    it("4. normalizes whitespace and HEX colors", () => {
        const email = createEmail({
            brand: {
                name: "  Acme Company  ",
                primaryColor: "#AABBCC",
            },
        });

        expect(email.getBrand().name)
            .toBe("Acme Company");

        expect(email.getBrand().primaryColor)
            .toBe("#aabbcc");
    });

    it("5. protects against input object mutation", () => {
        const input = {
            brand: {
                name: "Original Company",
            },
        };

        const email = createEmail(input);

        input.brand.name = "Changed Company";

        expect(email.getBrand().name)
            .toBe("Original Company");
    });

    it("6. returns an isolated brand copy", () => {
        const email = createEmail({
            brand: {
                name: "Secure Company",
            },
        });

        const copy = email.getBrand();

        Object.assign(copy, {
            name: "Modified Company",
        });

        expect(email.getBrand().name)
            .toBe("Secure Company");
    });

    it("7. returns an isolated config copy", () => {
        const email = createEmail({
            brand: {
                name: "My Company",
            },
        });

        const config = email.getConfig();

        Object.assign(config.brand, {
            name: "Changed",
        });

        expect(email.getConfig().brand.name)
            .toBe("My Company");
    });

    it("8. isolates separate email instances", () => {
        const companyA = createEmail({
            brand: {
                name: "Company A",
            },
        });

        const companyB = createEmail({
            brand: {
                name: "Company B",
            },
        });

        expect(companyA.getBrand().name)
            .toBe("Company A");

        expect(companyB.getBrand().name)
            .toBe("Company B");
    });

    it("9. rejects an empty company name", () => {
        expect(() => {
            createEmail({
                brand: {
                    name: "   ",
                },
            });
        }).toThrow(EmailConfigError);
    });

    it("10. rejects control characters in names", () => {
        expect(() => {
            createEmail({
                brand: {
                    name: "Acme\nCompany",
                },
            });
        }).toThrow("control characters");
    });

    it("11. rejects invalid primary colors", () => {
        expect(() => {
            createEmail({
                brand: {
                    primaryColor: "red",
                },
            });
        }).toThrow("six-digit HEX");
    });

    it("12. rejects insecure brand URLs", () => {
        expect(() => {
            createEmail({
                brand: {
                    logo: "http://example.com/logo.png",
                },
            });
        }).toThrow("HTTPS URL");

        expect(() => {
            createEmail({
                brand: {
                    website: "javascript:alert(1)",
                },
            });
        }).toThrow("HTTPS URL");
    });

    it("13. rejects URL credentials", () => {
        expect(() => {
            createEmail({
                brand: {
                    logo: "https://user:pass@example.com/logo.png",
                },
            });
        }).toThrow("without credentials");
    });

    it("14. rejects invalid support emails", () => {
        expect(() => {
            createEmail({
                brand: {
                    supportEmail: "not-an-email",
                },
            });
        }).toThrow("valid email address");
    });

    it("15. rejects unknown configuration fields", () => {
        expect(() => {
            createEmail({
                brand: {
                    colour: "red",
                },
            } as unknown as EmailConfigOptions);
        }).toThrow("unknown option");

        expect(() => {
            createEmail({
                unknownSetting: true,
            } as unknown as EmailConfigOptions);
        }).toThrow("unknown option");
    });

    it("16. rejects invalid configuration objects", () => {
        expect(() => {
            createEmail(
                null as unknown as EmailConfigOptions,
            );
        }).toThrow("must be an object");

        expect(() => {
            createEmail({
                brand: [],
            } as unknown as EmailConfigOptions);
        }).toThrow("must be an object");
    });

    it("17. preserves existing email rendering", async () => {
        const email = createEmail({
            brand: {
                name: "Acme Technologies",
            },
        });

        const document: EmailDocument = {
            schemaVersion: "1.0",
            id: "hello",
            version: "1.0.0",
            subject: "Welcome",
            body: [
                {
                    id: "greeting",
                    type: "text",
                    props: {
                        text: "Hello from MailForge!",
                    },
                },
            ],
        };

        email.registerTemplate(document);

        const result = await email.render("hello");

        expect(result.subject).toBe("Welcome");

        expect(result.html)
            .toContain("Hello from MailForge!");

        expect(result.text)
            .toContain("Hello from MailForge!");
    });
});
