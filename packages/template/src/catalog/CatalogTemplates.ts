import { z } from "zod";
import { DocumentValidator, type EmailDocument, type EmailNode } from "@mailforge/core";

import {
    actionButton,
    contentHeading,
    contentParagraph,
    mutedParagraph,
    panel,
    eyebrow,
    quietAction,
    divider,
} from "../shared/TemplateNodes.js";

export const CATALOG_TEMPLATE_DEFINITIONS = [
    // Account and authentication
    ["account-activated", "account", "Account activated", "Your account is now active", "Open account"],
    ["email-verified", "account", "Email verified", "Your email address was verified", "Open account"],
    ["profile-updated", "account", "Profile updated", "Your profile information was updated", "View profile"],
    ["account-closure", "account", "Account closure", "Your account closure was requested", "Review request"],
    ["magic-link", "authentication", "Magic sign-in link", "Use your secure link to sign in", "Sign in"],
    ["mfa-enabled", "authentication", "MFA enabled", "Two-factor authentication is enabled", "Security settings"],
    ["recovery-codes", "authentication", "Recovery codes ready", "Your recovery codes are ready", "Review codes"],
    ["suspicious-sign-in", "authentication", "New sign-in detected", "We noticed a new sign-in", "Review activity"],
    // Billing and commerce
    ["payment-failed", "billing", "Payment unsuccessful", "We could not process your payment", "Update payment"],
    ["subscription-renewed", "billing", "Subscription renewed", "Your subscription was renewed", "View subscription"],
    ["trial-expiring", "billing", "Trial ending soon", "Your free trial is ending", "Choose a plan"],
    ["refund-processed", "billing", "Refund processed", "Your refund has been processed", "View refund"],
    ["order-delivered", "ecommerce", "Order delivered", "Your order has been delivered", "View order"],
    ["order-cancelled", "ecommerce", "Order cancelled", "Your order was cancelled", "View order"],
    ["return-approved", "ecommerce", "Return approved", "Your return request was approved", "View return"],
    ["cart-reminder", "ecommerce", "Your cart is waiting", "You left items in your cart", "View cart"],
    // Marketing and announcements; unsubscribeUrl required by schema
    ["product-launch", "marketing", "New product launch", "Explore our latest launch", "Explore product"],
    ["feature-announcement", "marketing", "New feature", "Discover what's new", "Learn more"],
    ["seasonal-sale", "marketing", "Seasonal sale", "Discover limited-time offers", "See offers"],
    ["event-promotion", "marketing", "Upcoming event", "Join us for our next event", "Register now"],
    // Alerts, events, SaaS, support
    ["service-maintenance", "notifications", "Scheduled maintenance", "Planned maintenance is coming", "View status"],
    ["service-outage", "notifications", "Service status alert", "A service incident is in progress", "View status"],
    ["scheduled-reminder", "notifications", "Your reminder", "You have an upcoming reminder", "View details"],
    ["weekly-digest", "notifications", "Weekly digest", "See this week's highlights", "View digest"],
    ["event-invitation", "events", "Event invitation", "You're invited to an event", "RSVP"],
    ["event-registration", "events", "Registration confirmed", "Your event registration is confirmed", "View ticket"],
    ["event-reminder", "events", "Event reminder", "Your event is almost here", "Event details"],
    ["event-cancelled", "events", "Event cancelled", "An event you registered for was cancelled", "View event"],
    ["workspace-invitation", "saas", "Workspace invitation", "You've been invited to a workspace", "Join workspace"],
    ["usage-warning", "saas", "Usage approaching limit", "Your usage is approaching its limit", "Review usage"],
    ["plan-upgrade", "saas", "Plan upgraded", "Your subscription plan was updated", "View plan"],
    ["workspace-member-joined", "saas", "New teammate joined", "A teammate has joined your workspace", "View workspace"],
    ["support-ticket-opened", "support", "Support ticket received", "We've received your support request", "View ticket"],
    ["support-ticket-updated", "support", "Support ticket updated", "Your support request has an update", "View ticket"],
    ["support-ticket-resolved", "support", "Support ticket resolved", "Your support request has been resolved", "View resolution"],
    ["feedback-request", "support", "Share your feedback", "Tell us how we did", "Give feedback"],
] as const;

export type CatalogTemplateName = typeof CATALOG_TEMPLATE_DEFINITIONS[number][0];
export type CatalogTemplateCategory = typeof CATALOG_TEMPLATE_DEFINITIONS[number][1];
export interface CatalogTemplateInfo {
    readonly id: CatalogTemplateName;
    readonly category: CatalogTemplateCategory;
    readonly title: string;
    readonly description: string;
    readonly version: "1.0.0";
}

const httpLink = z.url().refine((value: string) => {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password;
}, "Only HTTP(S) links without credentials are allowed");

const textValue = z.string().trim().min(1).max(500).refine((value: string) => {
    for (const character of value) {
        const codePoint = character.codePointAt(0) ?? 0;
        if (codePoint <= 0x1f) return false;
    }
    return true;
}, "Control characters are not allowed");

export const catalogTemplateDataSchema = z.object({
    recipientName: textValue,
    actionUrl: httpLink,
    /** Optional secondary details, e.g. an order number, date or ticket ID. */
    detail: z.string().trim().max(1000).optional(),
    unsubscribeUrl: httpLink.optional(),
}).strict();
export type CatalogTemplateData = z.input<typeof catalogTemplateDataSchema>;

const definitions = new Map<string, typeof CATALOG_TEMPLATE_DEFINITIONS[number]>(
    CATALOG_TEMPLATE_DEFINITIONS.map(row => [row[0], row] as const),
);

export function isCatalogTemplateName(id: string): id is CatalogTemplateName {
    return definitions.has(id);
}

export function listCatalogTemplates(category?: CatalogTemplateCategory): CatalogTemplateInfo[] {
    return CATALOG_TEMPLATE_DEFINITIONS
        .filter(row => category === undefined || row[1] === category)
        .map(([id, group, title, description]) => ({ id, category: group, title, description, version: "1.0.0" }));
}

export function buildCatalogTemplate(id: CatalogTemplateName, input?: unknown): EmailDocument {
    const entry = definitions.get(id);
    if (!entry) throw new Error(`Unknown catalog template: ${id}`);
    const [, category, title, description, actionLabel] = entry;
    const data = input === undefined ? undefined : catalogTemplateDataSchema.parse(input);
    if (data !== undefined && category === "marketing" && data.unsubscribeUrl === undefined) {
        throw new Error(`Marketing template ${id} requires unsubscribeUrl`);
    }
    const recipient = data?.recipientName ?? "{{recipientName}}";
    const actionUrl = data?.actionUrl ?? "{{actionUrl}}";
    const categoryLabels: Record<CatalogTemplateCategory, string> = {
        account: "ACCOUNT UPDATE",
        authentication: "SECURITY & ACCESS",
        billing: "BILLING UPDATE",
        ecommerce: "ORDER UPDATE",
        marketing: "NEWS & OFFERS",
        notifications: "IMPORTANT NOTICE",
        events: "YOUR EVENTS",
        saas: "WORKSPACE UPDATE",
        support: "CUSTOMER SUPPORT",
    };
    const contextMessages: Record<CatalogTemplateCategory, string> = {
        account: "You can review the information below and manage your account whenever you need to.",
        authentication: "For your protection, only use security links that you were expecting.",
        billing: "Keep this message for your records. Your billing dashboard has the current details.",
        ecommerce: "You can track the latest order information from your account.",
        marketing: "Discover the latest updates and choose what matters to you.",
        notifications: "Please review this notification for any action you may need to take.",
        events: "Your event details and the most recent schedule are available through the link below.",
        saas: "Your workspace is ready to help your team stay informed and productive.",
        support: "Your support team is here to help; you can always review the status of this request.",
    };
    const body: EmailNode[] = [
        eyebrow(`${id}-eyebrow`, categoryLabels[category]),
        contentHeading(`${id}-title`, title),
        contentParagraph(`${id}-greeting`, `Hello ${recipient},`),
        contentParagraph(`${id}-message`, `${description}. ${contextMessages[category]}`),
    ];
    if (data?.detail) {
        body.push(panel(`${id}-detail`, [
            mutedParagraph(`${id}-detail-text`, data.detail),
        ]));
    }
    if (category === "billing" || category === "ecommerce" || category === "events" || category === "support") {
        body.push(divider(`${id}-divider`));
    }
    body.push(actionButton(`${id}-action`, actionLabel, actionUrl));
    if (category === "authentication" || id === "account-closure" || id === "suspicious-sign-in") {
        body.push(mutedParagraph(
            `${id}-security`,
            "If you did not request this, review your account security settings. Never share login links or verification codes.",
        ));
    } else if (category !== "marketing") {
        body.push(mutedParagraph(`${id}-note`,
            "This is an automated account message. If you need help, contact your support team.",
        ));
    }
    if (category === "marketing") {
        body.push(mutedParagraph(`${id}-subscription`,
            "You are receiving this email because you subscribed to these updates.",
        ));
        body.push(quietAction(
            `${id}-unsubscribe`,
            "Unsubscribe from marketing emails",
            data?.unsubscribeUrl ?? "{{unsubscribeUrl}}",
        ));
    }
    const document: EmailDocument = {
        schemaVersion: "1.0", id, version: "1.0.0", subject: title,
        preheader: description, body,
        metadata: { category, catalog: "builtin" },
    };
    new DocumentValidator().validateOrThrow(document);
    return document;
}
