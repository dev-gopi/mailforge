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
    quietAction,
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
    unsubscribeUrl: httpsUrl.optional(),
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
        contentHeading("promo-title", title),
        mutedParagraph("promo-badge", `SPECIAL OFFER: ${discountPercent}`),
        contentParagraph(
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
            attrs: { "data-mf-style": "promotional-code" },
        },
        actionButton(
            "promo-action",
            "Claim Your Discount",
            data?.actionUrl ?? "{{promotion.actionUrl}}",
        ),
        mutedParagraph("promo-expires", `Offer expires on ${expiresOn}.`),
    ];

    if (data?.terms) {
        body.push(mutedParagraph("promo-terms", `Terms & Conditions: ${data.terms}`));
    }
    body.push(mutedParagraph(
        "promo-subscription-note",
        "You are receiving this offer because you subscribed to marketing updates.",
    ));
    if (data?.unsubscribeUrl) {
        body.push(quietAction("promo-unsubscribe", "Unsubscribe", data.unsubscribeUrl));
    }

    return createTemplateDocument(
        "promotion",
        title,
        `Special offer: ${discountPercent} with code ${discountCode}`,
        body,
    );
}

