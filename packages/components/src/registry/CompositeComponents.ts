
import type {
    ReusableComponentDefinition,
} from "../contracts/ComponentRenderer.types.js";

import {
    ComponentCatalog,
} from "./ComponentCatalog.js";

import {
    createContentCardDefinition,
} from "../layout/ContentCard.js";

import {
    createTwoColumnLayoutDefinition,
} from "../layout/TwoColumnLayout.js";

import {
    createButtonGroupDefinition,
} from "../actions/ButtonGroup.js";

import {
    createPriceSummaryDefinition,
} from "../commerce/PriceSummary.js";

import {
    createOrderItemDefinition,
} from "../commerce/OrderItem.js";

import {
    createOrderSummaryDefinition,
} from "../commerce/OrderSummary.js";

export const COMPOSITE_COMPONENT_NAMES = [
    "mf-content-card",
    "mf-button-group",
    "mf-price-summary",
    "mf-order-item",
    "mf-order-summary",
    "mf-two-column",
] as const;

export function getCompositeComponentDefinitions():
    ReusableComponentDefinition[] {
    return [
        createContentCardDefinition(),
        createButtonGroupDefinition(),
        createPriceSummaryDefinition(),
        createOrderItemDefinition(),
        createOrderSummaryDefinition(),
        createTwoColumnLayoutDefinition(),
    ];
}

export function registerCompositeComponents(
    catalog: ComponentCatalog,
): void {
    for (
        const definition of
        getCompositeComponentDefinitions()
    ) {
        catalog.register(definition);
    }
}
