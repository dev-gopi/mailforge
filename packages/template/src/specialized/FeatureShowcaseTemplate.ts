import { z } from "zod";

import type {
    EmailDocument,
} from "@mailforge/core";

import {
    createTemplateDocument,
    heading,
    paragraph,
} from "../shared/TemplateNodes.js";

const httpsUrl = z.url().refine(value => {
    const url = new URL(value);

    return url.protocol === "https:" &&
        url.username.length === 0 &&
        url.password.length === 0;
}, "Must be an HTTPS URL without credentials");

const item = z.object({
    name: z.string().min(1).max(160),
    quantity: z.number().int().min(1).max(100),
    unitPriceCents: z.number().int().min(0),
}).strict();

const designSchema = z.object({
    primary: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#2563eb"),
    surface: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#ffffff"),
    background: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#f3f6fa"),
    text: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#172033"),
    muted: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#64748b"),
    border: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#e2e8f0"),
}).strict();

/**
 * Data for the complete component showcase. It is also a practical
 * starting point for product launches, account summaries, or orders.
 */
export const featureShowcaseSchema = z.object({
    recipientName: z.string().min(1).max(120),
    title: z.string().min(1).max(160),
    summary: z.string().min(1).max(1_000),
    imageUrl: httpsUrl.optional(),
    imageAlt: z.string().min(1).max(300).optional(),
    primaryUrl: httpsUrl,
    secondaryUrl: httpsUrl,
    design: designSchema.optional(),
    order: z.object({
        id: z.string().min(1).max(80),
        currency: z.enum(["USD", "EUR", "GBP", "INR"]),
        items: z.array(item).min(1).max(20),
        shippingCents: z.number().int().min(0).default(0),
        discountCents: z.number().int().min(0).default(0),
    }).strict(),
    socialLinks: z.array(z.object({
        platform: z.enum([
            "twitter",
            "github",
            "linkedin",
            "discord",
            "youtube",
            "website",
        ]),
        url: httpsUrl,
        label: z.string().min(1).max(60).optional(),
    }).strict()).min(1).max(8),
}).strict().superRefine((value, context) => {
    if ((value.imageUrl === undefined) !== (value.imageAlt === undefined)) {
        context.addIssue({
            code: "custom",
            path: ["imageUrl"],
            message: "imageUrl and imageAlt must be provided together",
        });
    }
});

export type FeatureShowcaseData = z.input<typeof featureShowcaseSchema>;

/**
 * A complete, ready-to-render email demonstrating the component library:
 * media, status, callouts, cards, two-column content, commerce, actions,
 * metadata, dividers, and social links.
 *
 * Register the component definitions on the email engine before rendering
 * because this document uses the component library.
 */
export function buildFeatureShowcaseTemplate(
    input: FeatureShowcaseData,
): EmailDocument {
    const data = featureShowcaseSchema.parse(input);
    const design = data.design ?? designSchema.parse({});

    return createTemplateDocument(
        "feature-showcase",
        data.title,
        data.summary,
        [
            {
                id: "showcase-hero",
                type: "container",
                styles: {
                    backgroundColor: design.surface,
                    padding: "28px 32px 24px",
                },
                children: [
                    {
                        ...heading("showcase-title", data.title),
                        styles: {
                            color: design.text,
                            fontSize: 28,
                            lineHeight: "34px",
                            padding: "0 0 10px",
                        },
                    },
                    {
                        ...paragraph(
                            "showcase-greeting",
                            `Hello ${data.recipientName}, ${data.summary}`,
                        ),
                        styles: {
                            color: design.muted,
                            fontSize: 16,
                            lineHeight: "24px",
                            padding: "0 0 18px",
                        },
                    },
                    ...(data.imageUrl && data.imageAlt
                        ? [{
                            id: "showcase-image",
                            type: "mf-image-caption" as const,
                            props: {
                                src: data.imageUrl,
                                alt: data.imageAlt,
                                caption: "A closer look at what is new.",
                            },
                        }]
                        : []),
                    {
                        id: "showcase-status",
                        type: "mf-status-badge",
                        props: {
                            label: "Everything is ready",
                            status: "success",
                        },
                    },
                ],
            },
            {
                id: "showcase-callout",
                type: "mf-callout-box",
                props: {
                    title: "What you can do next",
                    message: "Review your order, explore the new features, or share feedback with our team.",
                    variant: "tip",
                },
            },
            {
                id: "showcase-card",
                type: "mf-content-card",
                props: {
                    title: "Designed for every inbox",
                    description: "Responsive layouts, safe links, validated content, and accessible plain-text alternatives are included.",
                    actionLabel: "Explore the dashboard",
                    actionUrl: data.primaryUrl,
                },
            },
            {
                id: "showcase-columns",
                type: "mf-two-column",
                props: {
                    leftTitle: "Flexible",
                    leftText: "Compose templates from reusable components and customize every section.",
                    rightTitle: "Reliable",
                    rightText: "Use validated data and predictable rendering for transactional messages.",
                },
            },
            {
                id: "showcase-divider",
                type: "mf-divider-with-text",
                props: { text: "ORDER SUMMARY" },
            },
            {
                id: "showcase-order-card",
                type: "container",
                styles: {
                    backgroundColor: design.surface,
                    padding: "18px 32px",
                },
                children: [{
                    id: "showcase-order",
                    type: "mf-order-summary",
                    props: {
                        orderId: data.order.id,
                        currency: data.order.currency,
                        items: data.order.items,
                        shippingCents: data.order.shippingCents,
                        discountCents: data.order.discountCents,
                    },
                }],
            },
            {
                id: "showcase-details",
                type: "mf-key-value-list",
                props: {
                    title: "Account details",
                    items: [
                        { key: "Recipient", value: data.recipientName },
                        { key: "Order", value: data.order.id },
                        { key: "Delivery", value: "Email confirmation" },
                    ],
                },
            },
            {
                id: "showcase-actions-card",
                type: "container",
                children: [
                    {
                        id: "showcase-actions",
                        type: "mf-button-group",
                        props: {
                            items: [
                                { label: "View order", href: data.primaryUrl },
                                {
                                    label: "Contact support",
                                    href: data.secondaryUrl,
                                    variant: "secondary",
                                },
                            ],
                        },
                    },
                    {
                        id: "showcase-security",
                        type: "mf-security-notice",
                        props: {
                            severity: "info",
                            message: "We will never ask for your password or payment details by email.",
                        },
                    },
                ],
            },
            {
                id: "showcase-social",
                type: "mf-social-links",
                props: {
                    links: data.socialLinks.map(link => ({
                        platform: link.platform,
                        url: link.url,
                        ...(link.label !== undefined
                            ? { label: link.label }
                            : {}),
                    })),
                },
            },
        ],
    );
}
