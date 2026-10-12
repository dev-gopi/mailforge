import { z } from "zod";

import type {
    EmailDocument,
    EmailNode,
} from "@mailforge/core";

import {
    createTemplateDocument,
    heading,
    paragraph,
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

export const promotionSchema = z.object({
    title: text(160),
    description: text(1000),
    discountCode: z.string().min(3).max(30).regex(/^[A-Z0-9_-]+$/, "Alphanumeric uppercase promo code"),
    discountPercent: z.number().int().min(1).max(100),
    expiresOn: calendarDate,
    actionUrl: httpsUrl,
    terms: text(500).optional(),
}).strict();

export type PromotionData = z.infer<typeof promotionSchema>;

export function buildPromotionTemplate(
    data?: PromotionData,
): EmailDocument {
    if (data) {
        promotionSchema.parse(data);
    }

    const title = data?.title ?? "{{promotion.title}}";
    const discountCode = data?.discountCode ?? "{{promotion.discountCode}}";
    const discountPercent = data?.discountPercent !== undefined ? `${data.discountPercent}% OFF` : "{{promotion.discountPercent}}% OFF";
    const expiresOn = data?.expiresOn ?? "{{promotion.expiresOn}}";

    const body: EmailNode[] = [
        heading("promo-title", title),
        paragraph("promo-badge", `SPECIAL OFFER: ${discountPercent}`),
        paragraph(
            "promo-description",
            data?.description ?? "{{promotion.description}}",
        ),
        {
            id: "promo-code-box",
            type: "heading",
            props: {
                text: discountCode,
                level: 2,
            },
            styles: {
                textAlign: "center",
                fontSize: 28,
                fontWeight: "bold",
                color: "#1d4ed8",
                padding: "12px",
            },
        },
        actionButton(
            "promo-action",
            "Claim Your Discount",
            data?.actionUrl ?? "{{promotion.actionUrl}}",
        ),
        paragraph("promo-expires", `Offer expires on ${expiresOn}.`),
    ];

    if (data?.terms) {
        body.push(paragraph("promo-terms", `Terms & Conditions: ${data.terms}`));
    }

    return createTemplateDocument(
        "promotion",
        title,
        `Special offer: ${discountPercent} with code ${discountCode}`,
        body,
    );
}

