
import type {
    EmailDocument,
    EmailNode,
} from "@mailforge/core";

import type {
    ParsedDomainTemplateDataMap,
} from "../DomainTemplateData.js";

import {
    createTemplateDocument,
    heading,
    paragraph,
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
        heading(
            "security-heading",
            "Security Alert",
        ),
        paragraph(
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
            paragraph(
                "security-notice-preview",
                description,
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
        paragraph(
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
