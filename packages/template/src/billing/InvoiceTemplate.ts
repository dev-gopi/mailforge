
import type { EmailDocument, EmailNode } from "@mailforge/core";

import type {
    ParsedDomainTemplateDataMap,
} from "../DomainTemplateData.js";

import {
    createTemplateDocument,
    heading,
    paragraph,
    actionButton,
} from "../shared/TemplateNodes.js";

import {
    buildCommerceNodes,
} from "../shared/CommerceNodes.js";

type InvoiceData =
    ParsedDomainTemplateDataMap["invoice"];

export function buildInvoiceTemplate(
    data?: InvoiceData,
): EmailDocument {
    const number = data?.invoice.number ??
        "{{invoice.number}}";

    const issuedOn = data?.invoice.issuedOn ??
        "{{invoice.issuedOn}}";

    const dueOn = data?.invoice.dueOn ??
        "{{invoice.dueOn}}";

    const customer = data?.customer.name ??
        "{{customer.name}}";

    const body: EmailNode[] = [
        heading(
            "invoice-heading",
            `Invoice #${number}`,
        ),
        paragraph(
            "invoice-customer",
            `Bill to: ${customer}`,
        ),
        paragraph(
            "invoice-dates",
            `Issued: ${issuedOn} | Due: ${dueOn}`,
        ),
    ];

    if (data) {
        body.push(
            ...buildCommerceNodes(
                "invoice",
                data.invoice,
            ),
        );
    } else {
        body.push(
            paragraph(
                "invoice-preview",
                "Invoice line items are generated from validated data.",
            ),
        );
    }

    body.push(
        actionButton(
            "invoice-action",
            "View and Pay Invoice",
            data?.paymentUrl ?? "{{paymentUrl}}",
        ),
    );

    return createTemplateDocument(
        "invoice",
        `Invoice ${number}`,
        `Your invoice ${number} is available.`,
        body,
    );
}
