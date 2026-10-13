import { describe, expect, it } from "vitest";
import {
    createEmail,
    EmailLocalizationError,
    EmailLocalizationRegistry,
    formatEmailCurrency,
    formatEmailDate,
    formatEmailNumber,
    normalizeEmailLocale,
    resolveEmailDirection,
} from "../src/index.js";

const welcomeData = { user: { firstName: "Priya" }, actionUrl: "https://example.com/home" };

describe("Task 8.1: email localization", () => {
    it("keeps legacy email rendering unchanged when localization is unused", async () => {
        const email = createEmail();
        const result = await email.render("welcome", { data: welcomeData });
        expect(result.subject).toBe("Welcome, Priya!");
        expect(result.html).toMatch(/lang="en"/);
    });

    it("translates subject, preheader, nested content and CTA with variables", async () => {
        const email = createEmail();
        email.registerTranslations("bn-IN", "welcome", {
            subject: "স্বাগতম, {{user.firstName}}!",
            preheader: "আপনার অ্যাকাউন্ট প্রস্তুত",
            nodes: {
                "welcome-heading": "আপনাকে স্বাগতম",
                "welcome-greeting": "নমস্কার {{user.firstName}}",
                "welcome-action": "ড্যাশবোর্ড খুলুন",
                "welcome-tip-body": "আপনার ড্যাশবোর্ড দেখুন",
            },
        });
        const out = await email.render("welcome", { data: welcomeData, locale: "bn-IN" });
        expect(out.subject).toContain("Priya");
        expect(out.subject).toContain("স্বাগতম");
        expect(out.preheader).toBe("আপনার অ্যাকাউন্ট প্রস্তুত");
        expect(out.html).toContain('lang="bn-IN"');
        expect(out.html).toContain('dir="ltr"');
        expect(out.text).toContain("ড্যাশবোর্ড খুলুন");
        expect(out.text).toContain("নমস্কার Priya");
    });

    it("merges fallback translations before language and regional overrides", async () => {
        const email = createEmail();
        email.registerTranslations("en", "welcome", { nodes: { "welcome-action": "Fallback action" }});
        email.registerTranslations("fr", "welcome", { subject: "Bienvenue {{user.firstName}}" });
        email.registerTranslations("fr-CA", "welcome", { nodes: { "welcome-heading": "Bonjour du Canada" }});
        const out = await email.render("welcome", { data: welcomeData, locale: "fr-CA", fallbackLocale: "en" });
        expect(out.subject).toBe("Bienvenue Priya");
        expect(out.text).toContain("Bonjour du Canada");
        expect(out.text).toContain("Fallback action");
    });

    it("adds RTL direction to Arabic emails without enabling trusted HTML", async () => {
        const email = createEmail();
        email.registerTranslations("ar", "welcome", { nodes: { "welcome-heading": "مرحبا" }});
        const result = await email.render("welcome", { locale: "ar", data: welcomeData });
        expect(result.html).toMatch(/lang="ar"/);
        expect(result.html).toMatch(/dir="rtl"/);
        expect(result.html).toContain("مرحبا");
        const forced = await email.render("welcome", { locale: "ar", direction: "ltr", data: welcomeData });
        expect(forced.html).toMatch(/dir="ltr"/);
    });

    it("isolates translations for each MailForgeEmail instance and clones data", () => {
        const a = createEmail();
        const b = createEmail();
        const entry = { nodes: { "welcome-heading": "My heading" }};
        a.registerTranslations("fr", "welcome", entry);
        entry.nodes["welcome-heading"] = "Changed later";
        expect(a.resolveTranslations("fr", "welcome").nodes?.["welcome-heading"]).toBe("My heading");
        expect(b.listTranslations()).toEqual([]);
    });

    it("rejects unsafe or invalid locale dictionaries and missing node IDs", async () => {
        const email = createEmail();
        expect(() => normalizeEmailLocale("en<script>")).toThrow(EmailLocalizationError);
        expect(() => email.registerTranslations("fr", "welcome", { nodes: { x: "" } })).toThrow(EmailLocalizationError);
        expect(() => email.registerTranslations("fr", "welcome", { subject: "bad\nsubject" })).toThrow(EmailLocalizationError);
        expect(() => email.registerTranslations("fr", "welcome", { nodes: { "welcome-heading": "duplicate" } })).not.toThrow();
        expect(() => email.registerTranslations("fr", "welcome", { subject: "already registered" })).toThrow(EmailLocalizationError);
        email.registerTranslations("de", "welcome", { nodes: { "missing-node-id": "Invalid" } });
        await expect(email.render("welcome", { data: welcomeData, locale: "de" })).rejects.toThrow(EmailLocalizationError);
    });

    it("keeps data-driven templates materialized without re-interpolation", async () => {
        const email = createEmail();
        email.registerTranslations("fr", "invoice", { subject: "Votre facture" });
        const translations = email.resolveTranslations("fr", "invoice");
        expect(translations.subject).toBe("Votre facture");
        // For materialized templates, unsafe unresolved variable tokens are forbidden.
        email.registerTranslations("it", "invoice", { subject: "Fattura {{invoice.number}}" });
        expect(email.resolveTranslations("it", "invoice").subject).toContain("{{");
    });

    it("formats dates, currencies and numbers via Intl", () => {
        expect(formatEmailDate("2026-10-13T00:00:00Z", "en-US", { year: "numeric", month: "long", day: "numeric" })).toContain("2026");
        expect(formatEmailCurrency(1299, "INR", "en-IN")).toContain("1,299");
        expect(formatEmailNumber(1234567.5, "en-US")).toBe("1,234,567.5");
        expect(() => formatEmailCurrency(Number.NaN, "USD", "en-US")).toThrow(EmailLocalizationError);
        expect(() => formatEmailDate("nonsense", "en-US")).toThrow(EmailLocalizationError);
        expect(resolveEmailDirection("ur-PK")).toBe("rtl");
    });

    it("uses registry fallback and rejects missing or duplicate definitions", () => {
        const translations = new EmailLocalizationRegistry();
        translations.register("en", "welcome", { subject: "Hello" });
        translations.register("es", "welcome", { nodes: { "welcome-heading": "Hola" } });
        expect(translations.resolve("es-MX", "welcome", "en").subject).toBe("Hello");
        expect(translations.resolve("es-MX", "welcome", "en").nodes?.["welcome-heading"]).toBe("Hola");
        expect(() => translations.register("en", "welcome", {})).toThrow(EmailLocalizationError);
    });
});
