import { z } from "zod";

import type {
    EmailDocument,
    EmailNode,
} from "@mailforge/core";

import {
    createTemplateDocument,
    contentHeading,
    contentParagraph,
    mutedParagraph,
    actionButton,
} from "../shared/TemplateNodes.js";

const text = (max: number) =>
    z.string().min(1).max(max).refine(
        (val) => val.trim().length > 0 && !/\p{Cc}/u.test(val),
        "Must contain valid non-empty text",
    );

const httpsUrl = z.string().min(1).max(2048).refine((val) => {
    try {
        const url = new URL(val);
        return (
            url.protocol === "https:" &&
            url.hostname.length > 0 &&
            !url.username &&
            !url.password
        );
    } catch {
        return false;
    }
}, "Must be an HTTPS URL without credentials");

const calendarDate = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .refine((value) => {
        const date = new Date(`${value}T00:00:00Z`);
        return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }, "Invalid calendar date");

export const shippingUpdateSchema = z.object({
    customer: z.object({
        firstName: text(80),
    }).strict(),
    order: z.object({
        id: text(80),
    }).strict(),
    shipment: z.object({
        carrier: text(80),
        trackingNumber: text(100),
        trackingUrl: httpsUrl,
        status: z.enum(["shipped", "out-for-delivery", "delivered"]).default("shipped"),
        estimatedDelivery: calendarDate,
        destinationCity: text(120).optional(),
    }).strict(),
}).strict();

export type ShippingUpdateData = z.infer<typeof shippingUpdateSchema>;

const STATUS_LABELS = {
    shipped: "Shipped & In Transit",
    "out-for-delivery": "Out For Delivery",
    delivered: "Delivered",
} as const;

export function buildShippingUpdateTemplate(
    data?: ShippingUpdateData,
): EmailDocument {
    if (data) {
        shippingUpdateSchema.parse(data);
    }

    const firstName = data?.customer.firstName ?? "{{customer.firstName}}";
    const orderId = data?.order.id ?? "{{order.id}}";
    const carrier = data?.shipment.carrier ?? "{{shipment.carrier}}";
    const trackingNumber = data?.shipment.trackingNumber ?? "{{shipment.trackingNumber}}";
    const estimatedDelivery = data?.shipment.estimatedDelivery ?? "{{shipment.estimatedDelivery}}";
    const status = data?.shipment.status ?? "shipped";
    const statusLabel = STATUS_LABELS[status];

    const body: EmailNode[] = [
        contentHeading("shipping-title", "Your Order is on the Way!"),
        {
            id: "shipping-status-badge",
            type: "mf-status-badge",
            props: {
                label: statusLabel,
                status: status === "delivered" ? "success" : "warning",
            },
        },
        contentParagraph(
            "shipping-greeting",
            `Hello ${firstName}, your package for order #${orderId} is moving.`,
        ),
        mutedParagraph(
            "shipping-eta",
            `Estimated delivery date: ${estimatedDelivery}`,
        ),
    ];

    if (data) {
        body.push({
            id: "shipping-details",
            type: "mf-content-card",
            props: {
                title: "Tracking Information",
                description: `Carrier: ${carrier}\nTracking #: ${trackingNumber}${data.shipment.destinationCity ? `\nDestination: ${data.shipment.destinationCity}` : ""}`,
                actionLabel: "Track Package Online",
                actionUrl: data.shipment.trackingUrl,
            },
        });
    } else {
        body.push(
            mutedParagraph("shipping-preview", `Carrier: ${carrier} — Tracking: ${trackingNumber}`),
            actionButton("shipping-action", "Track Package", "{{shipment.trackingUrl}}"),
        );
    }

    body.push(
        mutedParagraph("shipping-help", "If you have questions about your delivery, our support team is available 24/7."),
    );

    return createTemplateDocument(
        "shipping-update",
        `Shipping update for Order #${orderId}`,
        `Your order has shipped via ${carrier} with tracking #${trackingNumber}`,
        body,
    );
}

