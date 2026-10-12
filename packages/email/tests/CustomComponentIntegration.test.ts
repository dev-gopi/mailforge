
import {
    describe,
    expect,
    it,
} from "vitest";

import { z } from "zod";

import {
    createEmail,
    type EmailDocument,
} from "../src/index.js";

function document(): EmailDocument {
    return {
        schemaVersion: "1.0",
        id: "custom-status-email",
        version: "1.0.0",
        subject: "Account notification",
        body: [
            {
                id: "custom-status",
                type: "status-badge",
                props: {
                    label: "Payment received",
                },
            },
        ],
    };
}

function engine() {
    const email = createEmail({
        brand: {
            name: "Acme Technologies",
        },
        theme: "modern",
    });

    email.registerComponent({
        name: "status-badge",
        version: "1.0.0",
        allowChildren: false,

        schema: z.object({
            label: z.string().min(1),
            status: z.enum(["success", "warning"]),
        }),

        defaults: {
            status: "success",
        },

        render: (props, context) => ({
            id: context.nodeId,
            type: "text",
            props: {
                text: String(props.label),
            },
            styles: {
                color: props.status === "success"
                    ? "#15803d"
                    : "#a16207",
            },
        }),
    });

    return email;
}

describe("MailForge Custom Component Integration", () => {
    it("1. registers and renders a custom component", async () => {
        const email = engine();

        email.registerTemplate(document());

        const result = await email.render(
            "custom-status-email",
        );

        expect(result.html)
            .toContain("Payment received");

        expect(result.text)
            .toContain("Payment received");

        expect(result.html)
            .toContain("Acme Technologies");
    });

    it("2. interpolates dynamic component properties", async () => {
        const email = engine();
        const input = document();

        input.body[0]!.props = {
            label: "Hello {{user.name}}",
        };

        email.registerTemplate(input);

        const result = await email.render(
            "custom-status-email",
            {
                data: {
                    user: {
                        name: "Rahul",
                    },
                },
            },
        );

        expect(result.text).toContain("Hello Rahul");
    });

    it("3. applies patches before expansion", async () => {
        const email = engine();

        email.registerTemplate(document());

        const result = await email.render(
            "custom-status-email",
            {
                patches: [
                    {
                        op: "update",
                        target: "custom-status",
                        props: {
                            label: "Refund completed",
                        },
                    },
                ],
            },
        );

        expect(result.text)
            .toContain("Refund completed");

        expect(
            email.getTemplate("custom-status-email")
                .body[0]?.props?.label,
        ).toBe("Payment received");
    });

    it("4. retains safe custom attributes", async () => {
        const email = engine();
        const input = document();

        input.body[0]!.attrs = {
            "data-status": "paid",
        };

        const result = await email.renderDocument(input);

        expect(result.html)
            .toContain("data-status");

        expect(result.html)
            .toContain("paid");
    });

    it("5. expands components added to built-in templates", async () => {
        const email = engine();

        const result = await email.render(
            "notification",
            {
                data: {
                    title: "Security Alert",
                    message: "A new login was detected.",
                    actionUrl:
                        "https://example.com/security",
                },

                patches: [
                    {
                        op: "slot",
                        slot: "body.end",
                        nodes: [
                            {
                                id: "priority-status",
                                type: "status-badge",
                                props: {
                                    label: "High priority",
                                    status: "warning",
                                },
                            },
                        ],
                    },
                ],
            },
        );

        expect(result.html)
            .toContain("High priority");

        expect(result.html)
            .toContain("Security Alert");
    });

    it("6. sanitizes handler-generated raw HTML", async () => {
        const email = createEmail();

        email.registerComponent({
            name: "rich-notice",
            version: "1.0.0",
            allowChildren: false,
            schema: z.object({}),

            render: (_props, context) => ({
                id: context.nodeId,
                type: "raw-html",
                props: {
                    html:
                        "<p>Safe notice</p>" +
                        "<script>alert(1)</script>",
                },
            }),
        });

        const input = document();

        input.body = [
            {
                id: "notice",
                type: "rich-notice",
            },
        ];

        const result = await email.renderDocument(
            input,
            { trust: "safe" },
        );

        expect(result.html).toContain("Safe notice");
        expect(result.html).not.toContain("<script");
    });

    it("7. rejects dangerous handler styles", async () => {
        const email = createEmail();

        email.registerComponent({
            name: "unsafe-style",
            version: "1.0.0",
            allowChildren: false,
            schema: z.object({}),

            render: (_props, context) => ({
                id: context.nodeId,
                type: "text",
                props: {
                    text: "Test",
                },
                styles: {
                    fontFamily: "url(javascript:alert(1))",
                },
            }),
        });

        const input = document();

        input.body = [
            {
                id: "unsafe-style-node",
                type: "unsafe-style",
            },
        ];

        await expect(
            email.renderDocument(input),
        ).rejects.toThrow("Unsafe style value");
    });

    it("8. keeps component registration per engine", async () => {
        const first = engine();
        const second = createEmail();

        expect(
            first.listComponents().some(
                item => item.name === "status-badge",
            ),
        ).toBe(true);

        expect(
            second.listComponents().some(
                item => item.name === "status-badge",
            ),
        ).toBe(false);

        await expect(
            second.renderDocument(document()),
        ).rejects.toThrow("Unknown component");
    });
});
