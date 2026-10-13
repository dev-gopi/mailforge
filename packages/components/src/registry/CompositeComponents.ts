
import type {
    ReusableComponentDefinition,
} from "../contracts/ComponentRenderer.types.js";

import type {
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

/** Stable names exposed by the built-in composite component catalog. */
export const COMPOSITE_COMPONENT_NAMES = [
    "mf-content-card",
    "mf-button-group",
    "mf-price-summary",
    "mf-order-item",
    "mf-order-summary",
    "mf-two-column",
] as const;

/** Return fresh definitions for components that expand into multiple email nodes. */
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

/** Register every composite component with a caller-owned component catalog. */
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
