import {
    describe,
    expect,
    it,
} from "vitest";

import { EmailEngine } from "../src/index.js";

describe("EmailEngine", () => {
    it("creates an engine with a valid brand", () => {
        const engine = new EmailEngine({
            brand: {
                name: "Acme",
            },
        });

        expect(engine.getBrand().name).toBe("Acme");
    });

    it("rejects an empty brand name", () => {
        expect(() => {
            new EmailEngine({
                brand: {
                    name: "",
                },
            });
        }).toThrow(
            "EmailEngine: brand.name is required"
        );
    });

    it("returns the library version", () => {
        const engine = new EmailEngine({
            brand: {
                name: "Acme",
            },
        });

        expect(engine.getVersion()).toBe("0.1.0");
    });

    it("prevents external mutation of brand", () => {
        const engine = new EmailEngine({
            brand: {
                name: "Original Company",
            },
        });

        const brand = engine.getBrand();

        brand.name = "Changed Company";

        expect(engine.getBrand().name)
            .toBe("Original Company");
    });
});