
import {
    describe,
    expect,
    it,
} from "vitest";

import {
    createEmail,
    EmailThemeError,
    type EmailConfigOptions,
} from "../src/index.js";

describe("MailForge Theme Management", () => {
    it("1. uses modern theme by default", () => {
        const email = createEmail();

        expect(email.getTheme().preset).toBe("modern");
        expect(email.getTheme().colors.primary)
            .toBe("#2563eb");
    });

    it("2. lists all built-in themes", () => {
        const email = createEmail();

        expect(email.listThemes()).toEqual([
            "modern",
            "minimal",
            "corporate",
            "dark",
            "premium",
            "ocean",
            "forest",
            "sunset",
            "elegant",
            "playful",
        ]);
    });

    it("3. supports minimal theme", () => {
        const email = createEmail({
            theme: "minimal",
        });

        expect(email.getTheme().preset).toBe("minimal");
        expect(email.getTheme().colors.primary)
            .toBe("#111827");
    });

    it("4. supports corporate theme", () => {
        const email = createEmail({
            theme: "corporate",
        });

        expect(email.getTheme().preset).toBe("corporate");
        expect(email.getTheme().colors.primary)
            .toBe("#0f4c81");
    });

    it("5. accepts preset as an object", () => {
        const email = createEmail({
            theme: {
                preset: "modern",
            },
        });

        expect(email.getTheme().preset).toBe("modern");
    });

    it("6. applies explicit brand primary color", () => {
        const email = createEmail({
            brand: {
                primaryColor: "#ff5500",
            },
            theme: "corporate",
        });

        expect(email.getTheme().colors.primary)
            .toBe("#ff5500");
    });

    it("7. preserves preset without explicit brand color", () => {
        const email = createEmail({
            brand: {
                name: "Acme",
            },
            theme: "minimal",
        });

        expect(email.getTheme().colors.primary)
            .toBe("#111827");
    });

    it("8. gives theme overrides highest priority", () => {
        const email = createEmail({
            brand: {
                primaryColor: "#ff5500",
            },
            theme: {
                preset: "corporate",
                colors: {
                    primary: "#9333ea",
                },
            },
        });

        expect(email.getTheme().colors.primary)
            .toBe("#9333ea");
    });

    it("9. preserves colors not explicitly overridden", () => {
        const email = createEmail({
            theme: {
                preset: "modern",
                colors: {
                    primary: "#9333ea",
                },
            },
        });

        expect(email.getTheme().colors.primary)
            .toBe("#9333ea");

        expect(email.getTheme().colors.surface)
            .toBe("#ffffff");

        expect(email.getTheme().colors.text)
            .toBe("#0f172a");
    });

    it("10. normalizes HEX colors", () => {
        const email = createEmail({
            theme: {
                colors: {
                    primary: "#AABBCC",
                },
            },
        });

        expect(email.getTheme().colors.primary)
            .toBe("#aabbcc");
    });

    it("11. supports typography overrides", () => {
        const email = createEmail({
            theme: {
                typography: {
                    fontFamily: "Georgia, serif",
                    baseSize: 16,
                    headingSize: 32,
                    lineHeight: 1.6,
                },
            },
        });

        const typography = email.getTheme().typography;

        expect(typography.fontFamily)
            .toBe("Georgia, serif");

        expect(typography.baseSize).toBe(16);
        expect(typography.headingSize).toBe(32);
        expect(typography.lineHeight).toBe(1.6);
    });

    it("12. supports spacing overrides", () => {
        const email = createEmail({
            theme: {
                spacing: {
                    md: 20,
                    lg: 28,
                },
            },
        });

        expect(email.getTheme().spacing).toEqual({
            xs: 4,
            sm: 8,
            md: 20,
            lg: 28,
            xl: 32,
        });
    });

    it("13. returns an isolated theme copy", () => {
        const email = createEmail();

        const copy = email.getTheme();

        Object.assign(copy.colors, {
            primary: "#ff0000",
        });

        expect(email.getTheme().colors.primary)
            .toBe("#2563eb");
    });

    it("14. returns an isolated config copy", () => {
        const email = createEmail();

        const config = email.getConfig();

        Object.assign(config.theme.spacing, {
            md: 64,
        });

        expect(email.getConfig().theme.spacing.md)
            .toBe(16);
    });

    it("15. isolates multiple engines", () => {
        const companyA = createEmail({
            theme: "minimal",
        });

        const companyB = createEmail({
            theme: "corporate",
        });

        expect(companyA.getTheme().preset)
            .toBe("minimal");

        expect(companyB.getTheme().preset)
            .toBe("corporate");
    });

    it("16. supports temporary overrides", () => {
        const email = createEmail({
            theme: "modern",
        });

        const temporary = email.resolveTheme({
            colors: {
                primary: "#9333ea",
            },
            spacing: {
                md: 20,
            },
        });

        expect(temporary.colors.primary)
            .toBe("#9333ea");

        expect(temporary.spacing.md).toBe(20);

        expect(email.getTheme().colors.primary)
            .toBe("#2563eb");

        expect(email.getTheme().spacing.md)
            .toBe(16);
    });

    it("17. rejects unknown theme presets", () => {
        expect(() => {
            createEmail({
                theme: "unknown",
            } as unknown as EmailConfigOptions);
        }).toThrow(EmailThemeError);
    });

    it("18. rejects invalid HEX colors", () => {
        expect(() => {
            createEmail({
                theme: {
                    colors: {
                        primary: "red",
                    },
                },
            });
        }).toThrow("theme.colors.primary");
    });

    it("19. rejects unsafe font-family input", () => {
        expect(() => {
            createEmail({
                theme: {
                    typography: {
                        fontFamily: "Arial; color:red",
                    },
                },
            });
        }).toThrow("theme.typography.fontFamily");
    });

    it("20. rejects invalid font sizes", () => {
        expect(() => {
            createEmail({
                theme: {
                    typography: {
                        baseSize: 500,
                    },
                },
            });
        }).toThrow("theme.typography.baseSize");
    });

    it("21. rejects invalid spacing order", () => {
        expect(() => {
            createEmail({
                theme: {
                    spacing: {
                        md: 50,
                    },
                },
            });
        }).toThrow("theme.spacing");
    });

    it("22. rejects unknown design tokens", () => {
        expect(() => {
            createEmail({
                theme: {
                    colors: {
                        unknownColor: "#ff0000",
                    },
                },
            } as unknown as EmailConfigOptions);
        }).toThrow("unknown theme option");
    });

    it("23. rejects invalid configuration shapes", () => {
        expect(() => {
            createEmail({
                theme: [],
            } as unknown as EmailConfigOptions);
        }).toThrow("must be an object");

        expect(() => {
            createEmail({
                theme: {
                    colors: null,
                },
            } as unknown as EmailConfigOptions);
        }).toThrow("must be an object");
    });

    it("24. preserves existing email rendering", async () => {
        const email = createEmail({
            theme: "corporate",
        });

        email.registerTemplate({
            schemaVersion: "1.0",
            id: "theme-test",
            version: "1.0.0",
            subject: "Theme Test",
            body: [
                {
                    id: "message",
                    type: "text",
                    props: {
                        text: "Hello from MailForge",
                    },
                },
            ],
        });

        const result = await email.render("theme-test");

        expect(result.subject).toBe("Theme Test");

        expect(result.html)
            .toContain("Hello from MailForge");

        expect(result.text)
            .toContain("Hello from MailForge");
    });
});
