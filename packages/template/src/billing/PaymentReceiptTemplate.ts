
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

type ReceiptData =
    ParsedDomainTemplateDataMap["payment-receipt"];

export function buildPaymentReceiptTemplate(
    data?: ReceiptData,
): EmailDocument {
    const number = data?.receipt.number ??
        "{{receipt.number}}";

    const transactionId = data?.receipt.transactionId ??
        "{{receipt.transactionId}}";

    const paidOn = data?.receipt.paidOn ??
        "{{receipt.paidOn}}";

    const customer = data?.customer.name ??
        "{{customer.name}}";

    const body: EmailNode[] = [
        heading(
            "receipt-heading",
            "Payment Received",
        ),
        paragraph(
            "receipt-customer",
            `Thank you, ${customer}. Your payment was received.`,
        ),
        paragraph(
            "receipt-reference",
            `Receipt: ${number} | Transaction: ${transactionId}`,
        ),
        paragraph(
            "receipt-date",
            `Paid on: ${paidOn}`,
        ),
    ];

    if (data) {
        body.push(
            ...buildCommerceNodes(
                "receipt",
                data.receipt,
            ),
        );
    } else {
        body.push(
            paragraph(
                "receipt-preview",
                "Payment details are generated from validated data.",
            ),
        );
    }

    body.push(
        actionButton(
            "receipt-action",
            "View Receipt",
            data?.receiptUrl ?? "{{receiptUrl}}",
        ),
    );

    return createTemplateDocument(
        "payment-receipt",
        `Payment receipt ${number}`,
        "Your payment has been received.",
        body,
    );
}
