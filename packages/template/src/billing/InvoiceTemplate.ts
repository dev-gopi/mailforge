
import type { EmailDocument, EmailNode } from "@mailforge/core";

import type {
    ParsedDomainTemplateDataMap,
} from "../DomainTemplateData.js";

import {
    createTemplateDocument,
    contentHeading,
    contentParagraph,
    mutedParagraph,
    actionButton,
    panel,
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
        contentHeading(
            "invoice-heading",
            `Invoice #${number}`,
        ),
        contentParagraph(
            "invoice-customer",
            `Bill to: ${customer}`,
        ),
        mutedParagraph(
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
            panel(
                "invoice-preview-panel",
                [{
                    id: "invoice-preview-message",
                    type: "text",
                    props: {
                        text: "Invoice line items are generated from " +
                            "validated data.",
                    },
                    styles: {
                        fontSize: 13,
                        color: "#64748b",
                        padding: "0",
                    },
                }],
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
