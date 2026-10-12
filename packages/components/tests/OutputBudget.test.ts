
import {
    describe,
    expect,
    it,
} from "vitest";

import {
    assertBoundedHandlerOutput,
} from "../src/security/OutputBudget.js";

describe("Component handler output budget", () => {
    it("1. accepts a valid leaf node", () => {
        expect(() => {
            assertBoundedHandlerOutput({
                id: "notice",
                type: "text",
                props: {
                    text: "Payment successful",
                },
            }, "test-component");
        }).not.toThrow();
    });

    it("2. accepts ordinary composite arrays", () => {
        expect(() => {
            assertBoundedHandlerOutput([
                {
                    id: "a",
                    type: "text",
                    props: { text: "A" },
                },
                {
                    id: "b",
                    type: "text",
                    props: { text: "B" },
                },
            ], "test-component");
        }).not.toThrow();
    });

    it("3. rejects excessive string output", () => {
        expect(() => {
            assertBoundedHandlerOutput({
                id: "large",
                type: "text",
                props: {
                    text: "x".repeat(300_000),
                },
            }, "test-component");
        }).toThrow("byte budget");
    });

    it("4. rejects oversized arrays", () => {
        expect(() => {
            assertBoundedHandlerOutput(
                Array.from({ length: 1001 }, () => null),
                "test-component",
            );
        }).toThrow("array item budget");
    });

    it("5. rejects circular objects", () => {
        const object: {
            value: string;
            self?: unknown;
        } = {
            value: "test",
        };

        object.self = object;

        expect(() => {
            assertBoundedHandlerOutput(
                object,
                "test-component",
            );
        }).toThrow("Cyclic handler output");
    });

    it("6. rejects getter properties", () => {
        const object = {
            type: "text",
            get props() {
                throw new Error("Getter must not execute");
            },
        };

        expect(() => {
            assertBoundedHandlerOutput(
                object,
                "test-component",
            );
        }).toThrow("accessor properties");
    });

    it("7. rejects non-finite values", () => {
        expect(() => {
            assertBoundedHandlerOutput({
                id: "amount",
                type: "text",
                props: {
                    value: Infinity,
                },
            }, "test-component");
        }).toThrow("non-finite number");
    });
});
