
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
        contentHeading(
            "receipt-heading",
            "Payment Received",
        ),
        contentParagraph(
            "receipt-customer",
            `Thank you, ${customer}. Your payment was received.`,
        ),
        mutedParagraph(
            "receipt-reference",
            `Receipt: ${number} | Transaction: ${transactionId}`,
        ),
        mutedParagraph(
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
            panel(
                "receipt-preview-panel",
                [{
                    id: "receipt-preview-message",
                    type: "text",
                    props: {
                        text: "Payment details are generated from validated " +
                            "data.",
                    },
                    styles: {
                        fontSize: 13,
                        padding: "0",
                    },
                }],
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
