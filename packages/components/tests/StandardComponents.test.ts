
import {
    describe,
    expect,
    it,
} from "vitest";

import {
    ComponentRegistry,
    type EmailDocument,
    type EmailNode,
} from "@mailforge/core";

import {
    ComponentCatalog,
    ComponentExpander,
    STANDARD_COMPONENT_NAMES,
    registerStandardComponents,
} from "../src/index.js";

function setup() {
    const registry = new ComponentRegistry();
    const catalog = new ComponentCatalog(registry);

    registerStandardComponents(catalog);

    const expander = new ComponentExpander(
        registry,
        catalog,
    );

    return {
        registry,
        catalog,
        expander,
    };
}

function document(node: EmailNode): EmailDocument {
    return {
        schemaVersion: "1.0",
        id: "component-test",
        version: "1.0.0",
        subject: "Component test",
        body: [node],
    };
}

function expand(node: EmailNode): EmailNode {
    const { expander } = setup();

    return expander.expand(
        document(node),
    ).body[0]!;
}

describe("MailForge Standard Components", () => {
    it("1. registers all six components", () => {
        const { catalog, registry } = setup();

        expect(STANDARD_COMPONENT_NAMES).toHaveLength(6);

        for (const name of STANDARD_COMPONENT_NAMES) {
            expect(catalog.has(name)).toBe(true);
            expect(registry.has(name)).toBe(true);
        }
    });

    it("2. rejects duplicate standard registration", () => {
        const { catalog } = setup();

        expect(() => {
            registerStandardComponents(catalog);
        }).toThrow("already registered");
    });

    it("3. renders a successful status badge", () => {
        const result = expand({
            id: "status",
            type: "mf-status-badge",
            props: {
                label: "Payment successful",
            },
        });

        expect(result.type).toBe("text");
        expect(result.props?.text)
            .toBe("Payment successful");
        expect(result.styles?.color)
            .toBe("#15803d");
    });

    it("4. supports warning and error badges", () => {
        const warning = expand({
            id: "warning",
            type: "mf-status-badge",
            props: {
                label: "Pending",
                status: "warning",
            },
        });

        const error = expand({
            id: "error",
            type: "mf-status-badge",
            props: {
                label: "Failed",
                status: "error",
            },
        });

        expect(warning.styles?.color)
            .toBe("#a16207");

        expect(error.styles?.color)
            .toBe("#b91c1c");
    });

    it("5. preserves leading zeros in OTP", () => {
        const result = expand({
            id: "otp",
            type: "mf-otp-code",
            props: {
                code: "004271",
            },
        });

        expect(result.type).toBe("heading");
        expect(result.props?.text).toBe("004271");
    });

    it("6. rejects invalid OTP codes", () => {
        expect(() => expand({
            id: "otp",
            type: "mf-otp-code",
            props: {
                code: "AB1234",
            },
        })).toThrow("4 to 10 digits");
    });

    it("7. creates semantic security notices", () => {
        const result = expand({
            id: "notice",
            type: "mf-security-notice",
            props: {
                message: "New device detected",
                severity: "warning",
            },
        });

        expect(result.type).toBe("section");

        expect(result.children?.[0]?.children?.[0]?.props?.text)
            .toBe("⚠ WARNING: New device detected");

        expect(result.children?.[0]?.children?.[0]?.styles?.color)
            .toBe("#92400e");
    });

    it("8. allows primary buttons to inherit themes", () => {
        const result = expand({
            id: "button",
            type: "mf-action-button",
            props: {
                label: "Open",
                href: "https://example.com/dashboard",
            },
        });

        expect(result.type).toBe("button");
        expect(result.props?.text).toBe("Open");
        expect(result.styles?.backgroundColor)
            .toBeUndefined();
    });

    it("9. supports secondary buttons", () => {
        const result = expand({
            id: "button",
            type: "mf-action-button",
            props: {
                label: "Cancel",
                href: "https://example.com/cancel",
                variant: "secondary",
            },
        });

        expect(result.styles?.backgroundColor)
            .toBe("#475569");
    });

    it("10. rejects insecure action URLs", () => {
        expect(() => expand({
            id: "button",
            type: "mf-action-button",
            props: {
                label: "Open",
                href: "http://example.com",
            },
        })).toThrow("Invalid props");
    });

    it("11. renders brand-name fallback", () => {
        const result = expand({
            id: "brand",
            type: "mf-brand-logo",
            props: {
                name: "Acme Technologies",
            },
        });

        expect(result.type).toBe("heading");
        expect(result.props?.text)
            .toBe("Acme Technologies");
    });

    it("12. renders a brand image", () => {
        const result = expand({
            id: "brand",
            type: "mf-brand-logo",
            props: {
                name: "Acme Technologies",
                src: "https://example.com/logo.png",
            },
        });

        expect(result.type).toBe("image");
        expect(result.props?.alt)
            .toBe("Acme Technologies logo");
    });

    it("13. preserves image caption properties", () => {
        const result = expand({
            id: "photo",
            type: "mf-image-caption",
            props: {
                src: "https://example.com/photo.png",
                alt: "A product photograph",
                caption: "New product",
                captionColor: "#334155",
            },
        });

        expect(result.type).toBe("image");
        expect(result.props?.caption)
            .toBe("New product");
        expect(result.props?.captionColor)
            .toBe("#334155");
    });

    it("14. rejects unsafe image URLs", () => {
        expect(() => expand({
            id: "photo",
            type: "mf-image-caption",
            props: {
                src: "javascript:alert(1)",
                alt: "Unsafe image",
                caption: "Unsafe",
            },
        })).toThrow("Invalid props");
    });

    it("15. retains developer attributes and styles", () => {
        const result = expand({
            id: "status",
            type: "mf-status-badge",
            props: {
                label: "Approved",
            },
            attrs: {
                "data-status": "approved",
            },
            styles: {
                color: "#123456",
            },
        });

        expect(result.id).toBe("status");
        expect(result.attrs?.["data-status"])
            .toBe("approved");
        expect(result.styles?.color)
            .toBe("#123456");
    });

    it("16. does not mutate source documents", () => {
        const source = document({
            id: "notice",
            type: "mf-security-notice",
            props: {
                message: "Account updated",
            },
        });

        const snapshot = structuredClone(source);
        const { expander } = setup();

        const result = expander.expand(source);

        expect(source).toEqual(snapshot);
        expect(result.body[0]?.type).toBe("section");
    });
});
