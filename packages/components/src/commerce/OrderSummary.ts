
import { z } from "zod";

import type {
    ReusableComponentDefinition,
} from "../contracts/ComponentRenderer.types.js";

import type {
    EmailNode,
} from "@mailforge/core";

import {
    centsSchema,
    currencySchema,
    orderItemSchema,
    calculateOrderTotal,
    formatMoney,
} from "./Money.js";

const schema = z.object({
    orderId: z.string().min(1).max(80),
    currency: currencySchema,
    items: z.array(orderItemSchema).min(1).max(20),
    shippingCents: centsSchema,
    discountCents: centsSchema,
}).strict();

export function createOrderSummaryDefinition():
    ReusableComponentDefinition {
    return {
        name: "mf-order-summary",
        version: "1.0.0",
        description: "Complete email order summary",
        allowChildren: false,
        schema,

        defaults: {
            currency: "USD",
            shippingCents: 0,
            discountCents: 0,
        },

        render: (props, context) => {
            const order = schema.parse(props);

            const output: EmailNode[] = [
                {
                    id: `${context.nodeId}-heading`,
                    type: "heading",
                    props: {
                        text: `Order #${order.orderId}`,
                    },
                },
            ];

            let subtotal = 0;

            order.items.forEach((item, index) => {
                const amount =
                    item.quantity * item.unitPriceCents;

                subtotal += amount;

                output.push({
                    id: `${context.nodeId}-item-${index}`,
                    type: "text",
                    attrs: { "data-mf-style": "body" },
                    props: {
                        text:
                            `${item.name} × ${item.quantity} — ` +
                            formatMoney(order.currency, amount),
                    },
                });
            });

            const total = calculateOrderTotal(
                subtotal,
                order.shippingCents,
                order.discountCents,
            );

            output.push({
                id: `${context.nodeId}-shipping`,
                type: "text",
                attrs: { "data-mf-style": "body" },
                props: {
                    text:
                        `Shipping — ` +
                        formatMoney(
                            order.currency,
                            order.shippingCents,
                        ),
                },
            });

            if (order.discountCents > 0) {
                output.push({
                    id: `${context.nodeId}-discount`,
                    type: "text",
                    attrs: { "data-mf-style": "body" },
                    props: {
                        text:
                            `Discount — ` +
                            formatMoney(
                                order.currency,
                                order.discountCents,
                            ),
                    },
                });
            }

            output.push({
                id: `${context.nodeId}-divider`,
                type: "divider",
                attrs: { "data-mf-style": "divider" },
            });

            output.push({
                id: `${context.nodeId}-total`,
                type: "text",
                attrs: { "data-mf-style": "body" },
                props: {
                    text:
                        `Total — ${formatMoney(
                            order.currency,
                            total,
                        )}`,
                },
                styles: {
                    fontWeight: "bold",
                },
            });

            return output;
        },
    };
}
