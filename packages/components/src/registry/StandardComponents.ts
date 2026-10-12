
import type {
    ReusableComponentDefinition,
} from "../contracts/ComponentRenderer.types.js";

import {
    ComponentCatalog,
} from "./ComponentCatalog.js";

import {
    createStatusBadgeDefinition,
} from "../typography/StatusBadge.js";

import {
    createOtpCodeDefinition,
} from "../security/OtpCode.js";

import {
    createSecurityNoticeDefinition,
} from "../security/SecurityNotice.js";

import {
    createActionButtonDefinition,
} from "../actions/ActionButton.js";

import {
    createBrandLogoDefinition,
} from "../company/BrandLogo.js";

import {
    createImageCaptionDefinition,
} from "../media/ImageCaption.js";

export const STANDARD_COMPONENT_NAMES = [
    "mf-status-badge",
    "mf-otp-code",
    "mf-security-notice",
    "mf-action-button",
    "mf-brand-logo",
    "mf-image-caption",
] as const;

/**
 * Create fresh component definitions.
 *
 * This avoids sharing mutable definition
 * instances across email engines.
 */
export function getStandardComponentDefinitions():
    ReusableComponentDefinition[] {
    return [
        createStatusBadgeDefinition(),
        createOtpCodeDefinition(),
        createSecurityNoticeDefinition(),
        createActionButtonDefinition(),
        createBrandLogoDefinition(),
        createImageCaptionDefinition(),
    ];
}

/**
 * Register all six components in the existing
 * ComponentCatalog.
 *
 * Each catalog uses the core registry supplied
 * by its parent MailForgeEmail instance.
 */
export function registerStandardComponents(
    catalog: ComponentCatalog,
): void {
    for (
        const definition of
        getStandardComponentDefinitions()
    ) {
        catalog.register(definition);
    }
}
