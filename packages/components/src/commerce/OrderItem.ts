
import { z } from "zod";

import type {
    ReusableComponentDefinition,
} from "../contracts/ComponentRenderer.types.js";

import {
    currencySchema,
    orderItemSchema,
    formatMoney,
} from "./Money.js";

const schema = orderItemSchema.extend({
    currency: currencySchema,
}).strict();

export function createOrderItemDefinition():
    ReusableComponentDefinition {
    return {
        name: "mf-order-item",
        version: "1.0.0",
        description: "One product line with quantity and price",
        allowChildren: false,
        schema,

        defaults: {
            currency: "USD",
        },

        render: (props, context) => {
            const item = schema.parse(props);

            const lineTotal =
                item.quantity * item.unitPriceCents;

            return {
                id: context.nodeId,
                type: "text",

                props: {
                    text:
                        `${item.name} × ${item.quantity} — ` +
                        formatMoney(item.currency, lineTotal),
                },
            };
        },
    };
}
