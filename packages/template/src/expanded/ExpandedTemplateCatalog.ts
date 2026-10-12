import { z } from "zod";
import { DocumentValidator, type EmailDocument, type EmailNode } from "@mailforge/core";

export const EXPANDED_TEMPLATE_CATALOG = [
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
    ["workspace-invitation", "saas", "Workspace invitation", "You've been invited to a workspace", "Join workspace"],
    ["usage-warning", "saas", "Usage approaching limit", "Your usage is approaching its limit", "Review usage"],
    ["plan-upgrade", "saas", "Plan upgraded", "Your subscription plan was updated", "View plan"],
    ["support-ticket-opened", "support", "Support ticket received", "We've received your support request", "View ticket"],
    ["support-ticket-updated", "support", "Support ticket updated", "Your support request has an update", "View ticket"],
    ["support-ticket-resolved", "support", "Support ticket resolved", "Your support request has been resolved", "View resolution"],
    ["feedback-request", "support", "Share your feedback", "Tell us how we did", "Give feedback"],
] as const;

export type ExpandedTemplateName = typeof EXPANDED_TEMPLATE_CATALOG[number][0];
export type ExpandedTemplateCategory = typeof EXPANDED_TEMPLATE_CATALOG[number][1];
export interface ExpandedTemplateInfo {
    readonly id: ExpandedTemplateName;
    readonly category: ExpandedTemplateCategory;
    readonly title: string;
    readonly description: string;
    readonly version: "1.0.0";
}

const httpLink = z.url().refine((value: string) => {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password;
}, "Only HTTP(S) links without credentials are allowed");

const textValue = z.string().trim().min(1).max(500).refine((value: string) => !/[\r\n\u0000-\u001f]/.test(value), "Control characters are not allowed");

export const expandedTemplateDataSchema = z.object({
    recipientName: textValue,
    actionUrl: httpLink,
    /** Optional secondary details, e.g. an order number, date or ticket ID. */
    detail: z.string().trim().max(1000).optional(),
    unsubscribeUrl: httpLink.optional(),
}).strict();
export type ExpandedTemplateData = z.input<typeof expandedTemplateDataSchema>;

const definitions = new Map<string, typeof EXPANDED_TEMPLATE_CATALOG[number]>(
    EXPANDED_TEMPLATE_CATALOG.map(row => [row[0], row] as const),
);

export function isExpandedTemplateName(id: string): id is ExpandedTemplateName {
    return definitions.has(id);
}

export function listExpandedTemplates(category?: ExpandedTemplateCategory): ExpandedTemplateInfo[] {
    return EXPANDED_TEMPLATE_CATALOG
        .filter(row => category === undefined || row[1] === category)
        .map(([id, group, title, description]) => ({ id, category: group, title, description, version: "1.0.0" }));
}

export function buildExpandedTemplate(id: ExpandedTemplateName, input?: unknown): EmailDocument {
    const entry = definitions.get(id);
    if (!entry) throw new Error(`Unknown expanded template: ${id}`);
    const [, category, title, description, actionLabel] = entry;
    const data = input === undefined ? undefined : expandedTemplateDataSchema.parse(input);
    if (data !== undefined && category === "marketing" && data.unsubscribeUrl === undefined) {
        throw new Error(`Marketing template ${id} requires unsubscribeUrl`);
    }
    const recipient = data?.recipientName ?? "{{recipientName}}";
    const actionUrl = data?.actionUrl ?? "{{actionUrl}}";
    const body: EmailNode[] = [
        { id: `${id}-title`, type: "heading", props: { text: title } },
        { id: `${id}-greeting`, type: "text", props: { text: `Hello ${recipient},` } },
        { id: `${id}-message`, type: "text", props: { text: description + "." } },
    ];
    if (data?.detail) {
        body.push({ id: `${id}-detail`, type: "text", props: { text: data.detail } });
    }
    body.push({ id: `${id}-action`, type: "button", props: { text: actionLabel, href: actionUrl } });
    if (category === "authentication") {
        body.push({ id: `${id}-security`, type: "text", props: { text: "If you did not request this, review your account security settings." } });
    }
    if (category === "marketing") {
        body.push({ id: `${id}-unsubscribe`, type: "button", props: {
            text: "Unsubscribe", href: data?.unsubscribeUrl ?? "{{unsubscribeUrl}}",
        } });
    }
    const document: EmailDocument = {
        schemaVersion: "1.0", id, version: "1.0.0", subject: title,
        preheader: description, body,
        metadata: { category, catalog: "expanded" },
    };
    new DocumentValidator().validateOrThrow(document);
    return document;
}
