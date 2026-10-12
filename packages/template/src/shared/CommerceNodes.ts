
import type {
    EmailNode,
} from "@mailforge/core";

import type {
    ParsedDomainTemplateDataMap,
} from "../DomainTemplateData.js";

type CommerceDetails = Pick<
    ParsedDomainTemplateDataMap["invoice"]["invoice"],
    "currency" | "items" | "shippingCents" | "discountCents"
>;

/**
 * Create item lines and a calculated price summary.
 *
 * Monetary values remain integers until the
 * existing commerce components format them.
 */
export function buildCommerceNodes(
    prefix: string,
    details: CommerceDetails,
): EmailNode[] {
    const subtotalCents = details.items.reduce(
        (sum, item) =>
            sum + item.quantity * item.unitPriceCents,
        0,
    );

    const rows: EmailNode[] = details.items.map(
        (item, index) => ({
            id: `${prefix}-item-${index}`,
            type: "mf-order-item",
            props: {
                name: item.name,
                quantity: item.quantity,
                unitPriceCents: item.unitPriceCents,
                currency: details.currency,
            },
        }),
    );

    rows.push({
        id: `${prefix}-pricing`,
        type: "mf-price-summary",
        props: {
            currency: details.currency,
            subtotalCents,
            shippingCents: details.shippingCents,
            discountCents: details.discountCents,
        },
    });

    return rows;
}
