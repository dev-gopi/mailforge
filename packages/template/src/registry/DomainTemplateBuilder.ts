
import type {
    EmailDocument,
} from "@mailforge/core";

import type {
    DomainTemplateName,
} from "../DomainTemplateData.js";

import {
    parseDomainTemplateData,
} from "../TemplateData.js";

import {
    buildInvoiceTemplate,
} from "../billing/InvoiceTemplate.js";

import {
    buildPaymentReceiptTemplate,
} from "../billing/PaymentReceiptTemplate.js";

import {
    buildOrderConfirmationTemplate,
} from "../ecommerce/OrderConfirmationTemplate.js";

import {
    buildSecurityAlertTemplate,
} from "../notifications/SecurityAlertTemplate.js";

/**
 * Validate the data and create a completed
 * structured document containing typed components.
 *
 * No network calls, database queries or email
 * delivery are performed here.
 */
export function buildDomainTemplate(
    name: DomainTemplateName,
    input: unknown,
): EmailDocument {
    switch (name) {
        case "invoice":
            return buildInvoiceTemplate(
                parseDomainTemplateData("invoice", input),
            );

        case "payment-receipt":
            return buildPaymentReceiptTemplate(
                parseDomainTemplateData("payment-receipt", input),
            );

        case "order-confirmation":
            return buildOrderConfirmationTemplate(
                parseDomainTemplateData("order-confirmation", input),
            );

        case "security-alert":
            return buildSecurityAlertTemplate(
                parseDomainTemplateData("security-alert", input),
            );
    }
}
