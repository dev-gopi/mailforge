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

export const EXTENDED_TEMPLATE_NAMES = [
    "newsletter",
    "promotion",
    "shipping-update",
] as const;

export type ExtendedTemplateName = (typeof EXTENDED_TEMPLATE_NAMES)[number];

export interface ExtendedTemplateDataMap {
    newsletter: NewsletterData;
    promotion: PromotionData;
    "shipping-update": ShippingUpdateData;
}

export const EXTENDED_TEMPLATE_SCHEMAS = {
    newsletter: newsletterSchema,
    promotion: promotionSchema,
    "shipping-update": shippingUpdateSchema,
} as const;

export interface ExtendedTemplateInfo {
    readonly id: ExtendedTemplateName;
    readonly category: "marketing" | "ecommerce";
    readonly title: string;
    readonly description: string;
    readonly version: string;
}

const EXTENDED_CATALOG: Record<ExtendedTemplateName, ExtendedTemplateInfo> = {
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

export function listExtendedTemplates(): ExtendedTemplateInfo[] {
    return EXTENDED_TEMPLATE_NAMES.map(name => ({ ...EXTENDED_CATALOG[name] }));
}

export function getExtendedTemplateInfo(name: ExtendedTemplateName): ExtendedTemplateInfo {
    return { ...EXTENDED_CATALOG[name] };
}

export function getExtendedTemplate<Name extends ExtendedTemplateName>(
    name: Name,
    data?: ExtendedTemplateDataMap[Name],
): EmailDocument {
    switch (name) {
        case "newsletter":
            return buildNewsletterTemplate(data as NewsletterData);
        case "promotion":
            return buildPromotionTemplate(data as PromotionData);
        case "shipping-update":
            return buildShippingUpdateTemplate(data as ShippingUpdateData);
        default:
            throw new Error(`Unknown extended template: ${name}`);
    }
}

/**
 * Register all extended templates into a MailForgeEmail engine instance
 * using its public registerTemplate method.
 */
export function registerExtendedTemplates(
    engine: { registerTemplate: (doc: EmailDocument) => unknown },
): void {
    for (const name of EXTENDED_TEMPLATE_NAMES) {
        engine.registerTemplate(getExtendedTemplate(name));
    }
}

