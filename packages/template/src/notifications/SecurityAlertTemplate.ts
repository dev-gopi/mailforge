
import type {
    EmailDocument,
    EmailNode,
} from "@mailforge/core";

import type {
    ParsedDomainTemplateDataMap,
} from "../DomainTemplateData.js";

import {
    createTemplateDocument,
    contentHeading,
    contentParagraph,
    mutedParagraph,
    panel,
} from "../shared/TemplateNodes.js";

type AlertData =
    ParsedDomainTemplateDataMap["security-alert"];

const EVENT_LABELS = {
    "new-device": "A new device signed in",
    "password-changed": "Your password was changed",
    "suspicious-login": "A suspicious sign-in was detected",
} as const;

export function buildSecurityAlertTemplate(
    data?: AlertData,
): EmailDocument {
    const firstName = data?.user.firstName ??
        "{{user.firstName}}";

    const event = data
        ? EVENT_LABELS[data.alert.kind]
        : "An account security event occurred";

    const occurredAt = data?.alert.occurredAt ??
        "{{alert.occurredAt}}";

    const device = data?.alert.device ??
        "{{alert.device}}";

    const location = data?.alert.location;

    const description =
        `${event}. Time: ${occurredAt}. Device: ${device}.` +
        (location ? ` Location: ${location}.` : "");

    const body: EmailNode[] = [
        contentHeading(
            "security-heading",
            "Security Alert",
        ),
        contentParagraph(
            "security-greeting",
            `Hello ${firstName},`,
        ),
    ];

    if (data) {
        body.push({
            id: "security-notice",
            type: "mf-security-notice",
            props: {
                message: description,
                severity: data.alert.severity,
            },
        });

        body.push({
            id: "security-action",
            type: "mf-action-button",
            props: {
                label: "Review Account Security",
                href: data.reviewUrl,
                variant: "primary",
            },
        });
    } else {
        body.push(
            panel(
                "security-notice-preview",
                [paragraphNode(description)],
                "#fef2f2",
            ),
            contentParagraph(
                "security-notice-summary",
                "A recent security event was detected on your account.",
            ),
            {
                id: "security-action",
                type: "button",
                props: {
                    text: "Review Account Security",
                    href: "{{reviewUrl}}",
                },
            },
        );
    }

    body.push(
        mutedParagraph(
            "security-advice",
            "If you do not recognize this activity, " +
            "review your account and secure your credentials.",
        ),
    );

    return createTemplateDocument(
        "security-alert",
        "Security alert for your account",
        "Review recent account security activity.",
        body,
    );
}

function paragraphNode(text: string): EmailNode {
    return {
        id: "security-notice-message",
        type: "text",
        props: { text },
        styles: {
            color: "#991b1b",
            fontSize: 14,
            lineHeight: "22px",
            padding: "0",
        },
    };
}
