import type {
    EmailDocument,
} from "@mailforge/core";

import {
    buildNewsletterTemplate,
    newsletterSchema,
    type NewsletterData,
} from "../marketing/NewsletterTemplate.js";

import {
    buildPromotionTemplate,
    promotionSchema,
    type PromotionData,
} from "../marketing/PromotionTemplate.js";

import {
    buildShippingUpdateTemplate,
    shippingUpdateSchema,
    type ShippingUpdateData,
} from "../ecommerce/ShippingUpdateTemplate.js";

export const SPECIALIZED_TEMPLATE_NAMES = [
    "newsletter",
    "promotion",
    "shipping-update",
] as const;

export type SpecializedTemplateName = (typeof SPECIALIZED_TEMPLATE_NAMES)[number];

export interface SpecializedTemplateDataMap {
    newsletter: NewsletterData;
    promotion: PromotionData;
    "shipping-update": ShippingUpdateData;
}

export const SPECIALIZED_TEMPLATE_SCHEMAS = {
    newsletter: newsletterSchema,
    promotion: promotionSchema,
    "shipping-update": shippingUpdateSchema,
} as const;

export interface SpecializedTemplateInfo {
    readonly id: SpecializedTemplateName;
    readonly category: "marketing" | "ecommerce";
    readonly title: string;
    readonly description: string;
    readonly version: string;
}

const SPECIALIZED_CATALOG: Record<SpecializedTemplateName, SpecializedTemplateInfo> = {
    newsletter: {
        id: "newsletter",
        category: "marketing",
        title: "Weekly / Monthly Newsletter",
        description: "Content digest with featured story and article links",
        version: "1.0.0",
    },
    promotion: {
        id: "promotion",
        category: "marketing",
        title: "Promotional Sale / Discount",
        description: "Special offer with coupon code, discount percentage, and countdown",
        version: "1.0.0",
    },
    "shipping-update": {
        id: "shipping-update",
        category: "ecommerce",
        title: "Order Shipping Update",
        description: "Package tracking notification with status badge and carrier details",
        version: "1.0.0",
    },
};

export function listSpecializedTemplates(): SpecializedTemplateInfo[] {
    return SPECIALIZED_TEMPLATE_NAMES.map(name => ({ ...SPECIALIZED_CATALOG[name] }));
}

export function getSpecializedTemplateInfo(name: SpecializedTemplateName): SpecializedTemplateInfo {
    return { ...SPECIALIZED_CATALOG[name] };
}

export function getSpecializedTemplate<Name extends SpecializedTemplateName>(
    name: Name,
    data?: SpecializedTemplateDataMap[Name],
): EmailDocument {
    switch (name) {
        case "newsletter":
            return buildNewsletterTemplate(data as NewsletterData);
        case "promotion":
            return buildPromotionTemplate(data as PromotionData);
        case "shipping-update":
            return buildShippingUpdateTemplate(data as ShippingUpdateData);
        default:
            throw new Error(`Unknown specialized template: ${name}`);
    }
}

/**
 * Register all specialized templates into a MailForgeEmail engine instance
 * using its public registerTemplate method.
 */
export function registerSpecializedTemplates(
    engine: { registerTemplate: (doc: EmailDocument) => unknown },
): void {
    for (const name of SPECIALIZED_TEMPLATE_NAMES) {
        engine.registerTemplate(getSpecializedTemplate(name));
    }
}

