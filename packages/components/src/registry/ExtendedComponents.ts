import type {
    ReusableComponentDefinition,
} from "../contracts/ComponentRenderer.types.js";

import type {
    ComponentCatalog,
} from "./ComponentCatalog.js";

import {
    createCalloutBoxDefinition,
} from "../feedback/CalloutBox.js";

import {
    createKeyValueListDefinition,
} from "../layout/KeyValueList.js";

import {
    createDividerWithTextDefinition,
} from "../layout/DividerWithText.js";

import {
    createSocialLinksDefinition,
} from "../actions/SocialLinks.js";

import {
    registerStandardComponents,
} from "./StandardComponents.js";

import {
    registerCompositeComponents,
} from "./CompositeComponents.js";

/** Stable names exposed by the built-in extended component catalog. */
export const EXTENDED_COMPONENT_NAMES = [
    "mf-callout-box",
    "mf-key-value-list",
    "mf-divider-with-text",
    "mf-social-links",
] as const;

/** Return fresh definitions for the built-in extended component collection. */
export function getExtendedComponentDefinitions(): ReusableComponentDefinition[] {
    return [
        createCalloutBoxDefinition(),
        createKeyValueListDefinition(),
        createDividerWithTextDefinition(),
        createSocialLinksDefinition(),
    ];
}

/** Register every extended component with a caller-owned component catalog. */
export function registerExtendedComponents(
    catalog: ComponentCatalog,
): void {
    for (const definition of getExtendedComponentDefinitions()) {
        catalog.register(definition);
    }
}

/**
 * Register standard, composite, and extended components in one call.
 */
export function registerAllComponents(
    catalog: ComponentCatalog,
): void {
    registerStandardComponents(catalog);
    registerCompositeComponents(catalog);
    registerExtendedComponents(catalog);
}

