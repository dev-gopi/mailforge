import type {
    ReusableComponentDefinition,
} from "../contracts/ComponentRenderer.types.js";

import type {
    ComponentCatalog,
} from "./ComponentCatalog.js";

import {
    createBrandHeaderDefinition,
    createFullWidthButtonDefinition,
    createLegalFooterDefinition,
    createStatusCardDefinition,
} from "../marketing/WelcomeComponents.js";

export const MARKETING_COMPONENT_NAMES = [
    "mf-brand-header",
    "mf-status-card",
    "mf-full-width-button",
    "mf-legal-footer",
] as const;

export function getMarketingComponentDefinitions(): ReusableComponentDefinition[] {
    return [
        createBrandHeaderDefinition(),
        createStatusCardDefinition(),
        createFullWidthButtonDefinition(),
        createLegalFooterDefinition(),
    ];
}

export function registerMarketingComponents(catalog: ComponentCatalog): void {
    for (const definition of getMarketingComponentDefinitions()) {
        catalog.register(definition);
    }
}

