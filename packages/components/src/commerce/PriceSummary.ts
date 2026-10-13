
import { z } from "zod";

import type {
    ReusableComponentDefinition,
} from "../contracts/ComponentRenderer.types.js";

import {
    centsSchema,
    currencySchema,
    calculateOrderTotal,
    formatMoney,
} from "./Money.js";

const schema = z.object({
    currency: currencySchema,
    subtotalCents: centsSchema,
    shippingCents: centsSchema,
    discountCents: centsSchema,
}).strict();

export function createPriceSummaryDefinition():
    ReusableComponentDefinition {
    return {
        name: "mf-price-summary",
        version: "1.0.0",
        description: "Subtotal, shipping, discount and total",
        allowChildren: false,
        schema,

        defaults: {
            currency: "USD",
            shippingCents: 0,
            discountCents: 0,
        },

        render: (props, context) => {
            const value = schema.parse(props);

            const total = calculateOrderTotal(
                value.subtotalCents,
                value.shippingCents,
                value.discountCents,
            );

            const lines = [
                {
                    id: `${context.nodeId}-subtotal`,
                    type: "text",
                    attrs: { "data-mf-style": "body" },
                    props: {
                        text:
                            `Subtotal — ` +
                            formatMoney(
                                value.currency,
                                value.subtotalCents,
                            ),
                    },
                },
                {
                    id: `${context.nodeId}-shipping`,
                    type: "text",
                    attrs: { "data-mf-style": "body" },
                    props: {
                        text:
                            `Shipping — ` +
                            formatMoney(
                                value.currency,
                                value.shippingCents,
                            ),
                    },
                },
            ];

            if (value.discountCents > 0) {
                lines.push({
                    id: `${context.nodeId}-discount`,
                    type: "text",
                    attrs: { "data-mf-style": "body" },
                    props: {
                        text:
                            `Discount — ` +
                            formatMoney(
                                value.currency,
                                value.discountCents,
                            ),
                    },
                });
            }

            return [
                ...lines,
                {
                    id: `${context.nodeId}-divider`,
                    type: "divider",
                    attrs: { "data-mf-style": "divider" },
                },
                {
                    id: `${context.nodeId}-total`,
                    type: "text",
                    attrs: { "data-mf-style": "body" },
                    props: {
                        text:
                            `Total — ${formatMoney(
                                value.currency,
                                total,
                            )}`,
                    },
                    styles: {
                        fontWeight: "bold",
                    },
                },
            ];
        },
    };
}
