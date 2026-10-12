
import type {
    EmailDocument,
    EmailNode,
} from "@mailforge/core";

import type {
    ParsedDomainTemplateDataMap,
} from "../DomainTemplateData.js";

import {
    createTemplateDocument,
    contentHeading,
    contentParagraph,
    mutedParagraph,
    actionButton,
    panel,
} from "../shared/TemplateNodes.js";

type OrderData =
    ParsedDomainTemplateDataMap["order-confirmation"];

export function buildOrderConfirmationTemplate(
    data?: OrderData,
): EmailDocument {
    const orderId = data?.order.id ?? "{{order.id}}";

    const firstName = data?.customer.firstName ??
        "{{customer.firstName}}";

    const placedOn = data?.order.placedOn ??
        "{{order.placedOn}}";

    const body: EmailNode[] = [
        contentHeading(
            "order-heading",
            "Your Order Is Confirmed",
        ),
        contentParagraph(
            "order-greeting",
            `Hello ${firstName}, thank you for your order.`,
        ),
        mutedParagraph(
            "order-date",
            `Order placed on ${placedOn}`,
        ),
    ];

    if (data) {
        body.push({
            id: "order-summary",
            type: "mf-order-summary",
            props: {
                orderId,
                currency: data.order.currency,
                items: data.order.items.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    unitPriceCents: item.unitPriceCents,
                })),
                shippingCents: data.order.shippingCents,
                discountCents: data.order.discountCents,
            },
        });
    } else {
        body.push(
            panel(
                "order-preview-panel",
                [{
                    id: "order-preview-message",
                    type: "text",
                    props: {
                        text: "Order items and totals are generated from " +
                            "validated data.",
                    },
                    styles: {
                        fontSize: 13,
                        color: "#64748b",
                        padding: "0",
                    },
                }],
            ),
        );
    }

    body.push(
        actionButton(
            "order-action",
            "View Your Order",
            data?.orderUrl ?? "{{orderUrl}}",
        ),
    );

    return createTemplateDocument(
        "order-confirmation",
        `Order ${orderId} confirmed`,
        "Your order has been successfully placed.",
        body,
    );
}
