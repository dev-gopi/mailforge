
import type {
    EmailDocument,
} from "@mailforge/core";

import type {
    DomainTemplateName,
    ParsedDomainTemplateDataMap,
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
 * Build a document from data already validated
 * by TemplateContractRegistry.
 *
 * Do not call this with untrusted raw input.
 */
export function buildParsedDomainTemplate(
    name: DomainTemplateName,
    data: ParsedDomainTemplateDataMap[DomainTemplateName],
): EmailDocument {
    switch (name) {
        case "invoice":
            return buildInvoiceTemplate(
                data as ParsedDomainTemplateDataMap["invoice"],
            );

        case "payment-receipt":
            return buildPaymentReceiptTemplate(
                data as ParsedDomainTemplateDataMap["payment-receipt"],
            );

        case "order-confirmation":
            return buildOrderConfirmationTemplate(
                data as ParsedDomainTemplateDataMap["order-confirmation"],
            );

        case "security-alert":
            return buildSecurityAlertTemplate(
                data as ParsedDomainTemplateDataMap["security-alert"],
            );
    }
}

/**
 * Backward-compatible public builder.
 *
 * This version still accepts untrusted input,
 * validates it, then builds the document.
 */
export function buildDomainTemplate(
    name: DomainTemplateName,
    input: unknown,
): EmailDocument {
    const parsed = parseDomainTemplateData(name, input);

    return buildParsedDomainTemplate(name, parsed);
}
