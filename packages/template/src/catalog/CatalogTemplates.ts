import { z } from "zod";
import { buildReportReadyTemplate, reportReadyPreviewData } from "../notifications/ReportReadyTemplate.js";
import { buildActivityNotificationTemplate } from "../notifications/ActivityNotificationTemplate.js";
import { buildOrderShippedTemplate, orderShippedPreviewData } from "../ecommerce/OrderShippedTemplate.js";
import { buildWorkspaceInvitationEditorialTemplate, workspaceInvitationEditorialPreviewData } from "../account/WorkspaceInvitationTemplate.js";
import { buildAppointmentConfirmationTemplate, appointmentConfirmationPreviewData } from "../events/AppointmentConfirmationTemplate.js";
import { buildNewDeviceLoginAlertTemplate, newDeviceLoginAlertPreviewData } from "../authentication/NewDeviceLoginAlertTemplate.js";
import { buildPasswordResetSecureTemplate, passwordResetSecurePreviewData } from "../authentication/PasswordResetSecureTemplate.js";
import { buildSubscriptionActivatedTemplate, subscriptionActivatedPreviewData } from "../billing/SubscriptionActivatedTemplate.js";
import { buildSupportTicketCreatedTemplate, supportTicketCreatedPreviewData } from "../support/SupportTicketCreatedTemplate.js";
import {
    EXPANDED_CATALOG_TEMPLATE_DEFINITIONS,
    isExpandedCatalogTemplateName,
    buildExpandedTemplateContent,
    extractExpandedTemplatePresentation,
    type ExpandedTemplatePresentation,
} from "./ExpandedCatalogTemplates.js";
import { DocumentValidator, type EmailDocument, type EmailNode } from "@mailforge/core";
import { composeCatalogDesign } from "./CatalogDesignFamilies.js";

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
    ["subscription-activated", "billing", "Subscription activated", "Your subscription is now active", "Manage subscription"],
    ["trial-expiring", "billing", "Trial ending soon", "Your free trial is ending", "Choose a plan"],
    ["refund-processed", "billing", "Refund processed", "Your refund has been processed", "View refund"],
    ["order-shipped-notice", "ecommerce", "Order shipped notice", "Your order is on its way", "Track package"],
    ["order-delivered", "ecommerce", "Order delivered", "Your order has been delivered", "View order"],
    ["order-cancelled", "ecommerce", "Order cancelled", "Your order was cancelled", "View order"],
    ["return-approved", "ecommerce", "Return approved", "Your return request was approved", "View return"],
    ["cart-reminder", "ecommerce", "Your cart is waiting", "You left items in your cart", "View cart"],
    // Marketing and announcements; unsubscribeUrl required by schema
    ["product-launch", "marketing", "New product launch", "Explore our latest launch", "Explore product"],
    ["feature-announcement", "marketing", "New feature", "Discover what's new", "Learn more"],
    ["seasonal-sale", "marketing", "Seasonal sale", "Discover limited-time offers", "See offers"],
    ["event-promotion", "marketing", "Upcoming event", "Join us for our next event", "Register now"],
    ["report-ready", "notifications", "Report ready", "Your report is ready to download", "Download report"],
    ["activity-notification", "notifications", "New comment notification", "A teammate left a comment", "View comment"],
    ["password-reset-secure", "authentication", "Secure password reset", "Reset your password with a time-limited link", "Reset password"],
    ["new-device-login-alert", "authentication", "New device sign-in", "A new device signed in to your account", "Secure account"],
    // Alerts, events, SaaS, support
    ["service-maintenance", "notifications", "Scheduled maintenance", "Planned maintenance is coming", "View status"],
    ["service-outage", "notifications", "Service status alert", "A service incident is in progress", "View status"],
    ["scheduled-reminder", "notifications", "Your reminder", "You have an upcoming reminder", "View details"],
    ["weekly-digest", "notifications", "Weekly digest", "See this week's highlights", "View digest"],
    ["event-invitation", "events", "Event invitation", "You're invited to an event", "RSVP"],
    ["event-registration", "events", "Registration confirmed", "Your event registration is confirmed", "View ticket"],
    ["appointment-confirmation", "events", "Appointment confirmed", "Your appointment is confirmed", "View appointment"],
    ["event-reminder", "events", "Event reminder", "Your event is almost here", "Event details"],
    ["event-cancelled", "events", "Event cancelled", "An event you registered for was cancelled", "View event"],
    ["workspace-invitation", "saas", "Workspace invitation", "You've been invited to a workspace", "Join workspace"],
    ["workspace-invitation-editorial", "saas", "Editorial workspace invitation", "An editorial invitation to join a workspace", "Accept invitation"],
    ["usage-warning", "saas", "Usage approaching limit", "Your usage is approaching its limit", "Review usage"],
    ["plan-upgrade", "saas", "Plan upgraded", "Your subscription plan was updated", "View plan"],
    ["workspace-member-joined", "saas", "New teammate joined", "A teammate has joined your workspace", "View workspace"],
    ["support-ticket-opened", "support", "Support ticket received", "We've received your support request", "View ticket"],
    ["support-ticket-created", "support", "Support ticket confirmation", "Confirmation of a new support ticket", "View ticket"],
    ["support-ticket-updated", "support", "Support ticket updated", "Your support request has an update", "View ticket"],
    ["support-ticket-resolved", "support", "Support ticket resolved", "Your support request has been resolved", "View resolution"],
    ["feedback-request", "support", "Share your feedback", "Tell us how we did", "Give feedback"],
    ...EXPANDED_CATALOG_TEMPLATE_DEFINITIONS,
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

/** Optional structured details for account events. Base fields remain unchanged. */
export const accountCatalogTemplateDataSchema = catalogTemplateDataSchema.extend({
    account: z.object({
        email: z.email().max(254).optional(),
        referenceId: z.string().trim().min(1).max(80)
            .regex(/^[A-Za-z0-9._-]+$/, "Invalid account reference").optional(),
    }).strict().optional(),
}).strict();
export type AccountCatalogTemplateData = z.input<typeof accountCatalogTemplateDataSchema>;

/** Optional sign-in context; do not put passwords, OTPs or recovery codes here. */
export const authenticationCatalogTemplateDataSchema = catalogTemplateDataSchema.extend({
    security: z.object({
        device: textValue.optional(),
        location: textValue.optional(),
        occurredAt: z.iso.datetime({ offset: true }).optional(),
    }).strict().optional(),
}).strict();
export type AuthenticationCatalogTemplateData = z.input<typeof authenticationCatalogTemplateDataSchema>;

/** Optional financial references for catalog notifications; no payment math. */
export const billingCatalogTemplateDataSchema = catalogTemplateDataSchema.extend({
    billing: z.object({
        referenceId: z.string().trim().min(1).max(80)
            .regex(/^[A-Za-z0-9._-]+$/, "Invalid billing reference").optional(),
        planName: textValue.optional(),
        amount: z.string().regex(/^(0|[1-9]\d{0,10})(\.\d{1,2})?$/, "Invalid decimal amount").optional(),
        currency: z.string().regex(/^[A-Z]{3}$/, "Currency must use a 3-letter uppercase code").optional(),
        billingDate: z.iso.date().optional(),
        // Prices and line totals are supplied by the caller, never calculated.
        lineItems: z.array(z.object({
            description: textValue,
            quantity: z.number().int().min(1).max(99999),
            unitPrice: z.string().regex(/^(0|[1-9]\d{0,10})(\.\d{1,2})?$/),
            lineTotal: z.string().regex(/^(0|[1-9]\d{0,10})(\.\d{1,2})?$/),
        }).strict()).min(1).max(20).optional(),
    }).strict().refine(
        value => (value.amount === undefined) === (value.currency === undefined),
        "Specify amount and currency together",
    ).refine(
        value => value.lineItems === undefined || value.amount !== undefined,
        "Invoice lines require an explicitly supplied total and currency",
    ).optional(),
}).strict();
export type BillingCatalogTemplateData = z.input<typeof billingCatalogTemplateDataSchema>;

/** Optional order/shipment details for catalog notifications. */
export const ecommerceCatalogTemplateDataSchema = catalogTemplateDataSchema.extend({
    ecommerce: z.object({
        orderId: z.string().trim().min(1).max(80)
            .regex(/^[A-Za-z0-9._-]+$/, "Invalid order ID").optional(),
        trackingNumber: z.string().trim().min(1).max(100)
            .regex(/^[A-Za-z0-9._-]+$/, "Invalid tracking number").optional(),
        carrier: textValue.optional(),
        estimatedDelivery: z.iso.date().optional(),
    }).strict().optional(),
}).strict();
export type EcommerceCatalogTemplateData = z.input<typeof ecommerceCatalogTemplateDataSchema>;

/** Optional campaign details. The existing unsubscribe URL remains mandatory for marketing. */
export const marketingCatalogTemplateDataSchema = catalogTemplateDataSchema.extend({
    marketing: z.object({
        campaignName: textValue.optional(),
        promotionCode: z.string().trim().min(1).max(48)
            .regex(/^[A-Za-z0-9_-]+$/, "Invalid promotion code").optional(),
        endsOn: z.iso.date().optional(),
        // A price label is display-only; MailForge never invents prices.
        products: z.array(z.object({
            name: textValue,
            priceLabel: textValue,
            description: textValue.optional(),
            imageUrl: httpLink.optional(),
            imageAlt: textValue.optional(),
        }).strict().refine(
            value => value.imageUrl === undefined || value.imageAlt !== undefined,
            "Product images require alternative text",
        )).min(1).max(4).optional(),
    }).strict().optional(),
}).strict();
export type MarketingCatalogTemplateData = z.input<typeof marketingCatalogTemplateDataSchema>;

/** Optional operational context for notification catalog templates. */
export const notificationCatalogTemplateDataSchema = catalogTemplateDataSchema.extend({
    notification: z.object({
        serviceName: textValue.optional(),
        referenceId: z.string().trim().min(1).max(80)
            .regex(/^[A-Za-z0-9._-]+$/, "Invalid notification reference").optional(),
        severity: z.enum(["info", "warning", "critical"]).optional(),
        eventAt: z.iso.datetime({ offset: true }).optional(),
    }).strict().optional(),
}).strict();
export type NotificationCatalogTemplateData = z.input<typeof notificationCatalogTemplateDataSchema>;

/** Structured event details; timestamps must contain an explicit UTC offset. */
export const eventCatalogTemplateDataSchema = catalogTemplateDataSchema.extend({
    event: z.object({
        name: textValue.optional(),
        startsAt: z.iso.datetime({ offset: true }).optional(),
        endsAt: z.iso.datetime({ offset: true }).optional(),
        venue: textValue.optional(),
        meetingUrl: httpLink.optional(),
        ticketCode: z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9._-]+$/).optional(),
        admission: textValue.optional(),
    }).strict().refine(value =>
        value.startsAt === undefined || value.endsAt === undefined ||
        Date.parse(value.endsAt) >= Date.parse(value.startsAt),
    { message: "Event end must not be before start", path: ["endsAt"] }).refine(value =>
        (value.ticketCode === undefined && value.admission === undefined) ||
        (value.ticketCode !== undefined && value.name !== undefined),
    { message: "A ticket requires the supplied event name and ticket code", path: ["ticketCode"] }).optional(),
}).strict();
export type EventCatalogTemplateData = z.input<typeof eventCatalogTemplateDataSchema>;

/** Metadata only: usage is a percentage, not a billable quantity. */
export const saasCatalogTemplateDataSchema = catalogTemplateDataSchema.extend({
    saas: z.object({
        workspaceName: textValue.optional(),
        memberName: textValue.optional(),
        planName: textValue.optional(),
        usagePercent: z.number().finite().min(0).max(100).optional(),
        metrics: z.array(z.object({ label: textValue, value: textValue }).strict())
            .min(1).max(12).optional(),
    }).strict().optional(),
}).strict();
export type SaasCatalogTemplateData = z.input<typeof saasCatalogTemplateDataSchema>;

/** Support ticket references; never store passwords or access tokens in metadata. */
export const supportCatalogTemplateDataSchema = catalogTemplateDataSchema.extend({
    support: z.object({
        ticketId: z.string().trim().min(1).max(80)
            .regex(/^[A-Za-z0-9._-]+$/, "Invalid ticket ID").optional(),
        status: z.enum(["open", "pending", "resolved", "closed"]).optional(),
        agentName: textValue.optional(),
    }).strict().optional(),
}).strict();
export type SupportCatalogTemplateData = z.input<typeof supportCatalogTemplateDataSchema>;

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
    if (id === "support-ticket-created") {
        if (input === undefined) return buildSupportTicketCreatedTemplate();
        if (typeof input === "object" && input !== null && "ticketUrl" in input) return buildSupportTicketCreatedTemplate(input);
        const common = supportCatalogTemplateDataSchema.parse(input);
        return buildSupportTicketCreatedTemplate({
            ...supportTicketCreatedPreviewData,
            customerName: common.recipientName,
            ticketUrl: common.actionUrl,
        });
    }
    if (id === "subscription-activated") {
        if (input === undefined) return buildSubscriptionActivatedTemplate();
        if (typeof input === "object" && input !== null && "manageSubscriptionUrl" in input) return buildSubscriptionActivatedTemplate(input);
        const common = billingCatalogTemplateDataSchema.parse(input);
        return buildSubscriptionActivatedTemplate({ ...subscriptionActivatedPreviewData,
            firstName: common.recipientName, manageSubscriptionUrl: common.actionUrl });
    }
    if (id === "new-device-login-alert") {
        if (input === undefined) return buildNewDeviceLoginAlertTemplate();
        if (typeof input === "object" && input !== null && "securityUrl" in input) return buildNewDeviceLoginAlertTemplate(input);
        const common = authenticationCatalogTemplateDataSchema.parse(input);
        return buildNewDeviceLoginAlertTemplate({ ...newDeviceLoginAlertPreviewData,
            firstName: common.recipientName, securityUrl: common.actionUrl });
    }
    if (id === "appointment-confirmation") {
        if (input === undefined) return buildAppointmentConfirmationTemplate();
        if (typeof input === "object" && input !== null && "appointmentUrl" in input) {
            return buildAppointmentConfirmationTemplate(input);
        }
        const common = eventCatalogTemplateDataSchema.parse(input);
        return buildAppointmentConfirmationTemplate({
            ...appointmentConfirmationPreviewData,
            firstName: common.recipientName, appointmentUrl: common.actionUrl,
        });
    }
    if (id === "workspace-invitation-editorial") {
        if (input === undefined) return buildWorkspaceInvitationEditorialTemplate();
        if (typeof input === "object" && input !== null && "invitationUrl" in input) {
            return buildWorkspaceInvitationEditorialTemplate(input);
        }
        // Compatibility: shared catalog recipients still work; dedicated callers remain strictly validated.
        const common = saasCatalogTemplateDataSchema.parse(input);
        return buildWorkspaceInvitationEditorialTemplate({
            ...workspaceInvitationEditorialPreviewData,
            recipientFirstName: common.recipientName, invitationUrl: common.actionUrl,
        });
    }
    if (id === "order-shipped-notice") {
        if (input === undefined) return buildOrderShippedTemplate();
        if (typeof input === "object" && input !== null && "trackingUrl" in input) {
            return buildOrderShippedTemplate(input);
        }
        // Existing generic catalog clients can still request every ID using
        // recipientName/actionUrl. Dedicated callers use the strict shipment schema.
        const common = ecommerceCatalogTemplateDataSchema.parse(input);
        return buildOrderShippedTemplate({
            ...orderShippedPreviewData,
            firstName: common.recipientName,
            trackingUrl: common.actionUrl,
        });
    }
    if (id === "activity-notification") return buildActivityNotificationTemplate(input);
    if (id === "password-reset-secure") {
        if (input === undefined) return buildPasswordResetSecureTemplate();
        if (typeof input === "object" && input !== null && "resetUrl" in input) {
            return buildPasswordResetSecureTemplate(input);
        }
        // Preserve generic catalog caller compatibility without weakening the dedicated schema.
        const common = authenticationCatalogTemplateDataSchema.parse(input);
        return buildPasswordResetSecureTemplate({
            ...passwordResetSecurePreviewData,
            firstName: common.recipientName, resetUrl: common.actionUrl,
        });
    }
    if (id === "report-ready") {
        // The dedicated report template has a richer contract than the common
        // catalog fields. Preserve that contract for direct callers, while
        // allowing catalog consumers to use the shared recipient/action shape.
        if (input === undefined) return buildReportReadyTemplate();
        if (typeof input === "object" && input !== null && "reportUrl" in input) {
            return buildReportReadyTemplate(input);
        }
        const data = notificationCatalogTemplateDataSchema.parse(input);
        return buildReportReadyTemplate({
            ...reportReadyPreviewData,
            recipientName: data.recipientName,
            reportUrl: data.actionUrl,
        });
    }
    const entry = definitions.get(id);
    if (!entry) throw new Error(`Unknown catalog template: ${id}`);
    const [, category, title, description, actionLabel] = entry;
    let presentation: ExpandedTemplatePresentation | undefined;
    if (isExpandedCatalogTemplateName(id) && input !== undefined) {
        const extracted = extractExpandedTemplatePresentation(input);
        input = extracted.baseInput;
        presentation = extracted.presentation;
    }
    // Keep the shared fields separate from category-specific details.
    // This avoids an ambiguous union of Zod schema outputs.
    let data: z.output<typeof catalogTemplateDataSchema> | undefined = undefined;
    let accountDetails: z.output<typeof accountCatalogTemplateDataSchema>["account"] = undefined;
    let securityDetails: z.output<typeof authenticationCatalogTemplateDataSchema>["security"] = undefined;
    let billingDetails: z.output<typeof billingCatalogTemplateDataSchema>["billing"] = undefined;
    let ecommerceDetails: z.output<typeof ecommerceCatalogTemplateDataSchema>["ecommerce"] = undefined;
    let marketingDetails: z.output<typeof marketingCatalogTemplateDataSchema>["marketing"] = undefined;
    let notificationDetails: z.output<typeof notificationCatalogTemplateDataSchema>["notification"] = undefined;
    let eventDetails: z.output<typeof eventCatalogTemplateDataSchema>["event"] = undefined;
    let saasDetails: z.output<typeof saasCatalogTemplateDataSchema>["saas"] = undefined;
    let supportDetails: z.output<typeof supportCatalogTemplateDataSchema>["support"] = undefined;

    if (input !== undefined) {
        if (category === "account") {
            const parsed = accountCatalogTemplateDataSchema.parse(input);
            data = parsed;
            accountDetails = parsed.account;
        } else if (category === "authentication") {
            const parsed = authenticationCatalogTemplateDataSchema.parse(input);
            data = parsed;
            securityDetails = parsed.security;
        } else if (category === "billing") {
            const parsed = billingCatalogTemplateDataSchema.parse(input);
            data = parsed;
            billingDetails = parsed.billing;
        } else if (category === "ecommerce") {
            const parsed = ecommerceCatalogTemplateDataSchema.parse(input);
            data = parsed;
            ecommerceDetails = parsed.ecommerce;
        } else if (category === "marketing") {
            const parsed = marketingCatalogTemplateDataSchema.parse(input);
            data = parsed;
            marketingDetails = parsed.marketing;
        } else if (category === "notifications") {
            const parsed = notificationCatalogTemplateDataSchema.parse(input);
            data = parsed;
            notificationDetails = parsed.notification;
        } else if (category === "events") {
            const parsed = eventCatalogTemplateDataSchema.parse(input);
            data = parsed;
            eventDetails = parsed.event;
        } else if (category === "saas") {
            const parsed = saasCatalogTemplateDataSchema.parse(input);
            data = parsed;
            saasDetails = parsed.saas;
        } else if (category === "support") {
            const parsed = supportCatalogTemplateDataSchema.parse(input);
            data = parsed;
            supportDetails = parsed.support;
        } else {
            data = catalogTemplateDataSchema.parse(input);
        }
    }
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
        // Expanded IDs already have their own purpose-written introduction.
        // Avoid repeating the same category-wide sentence in all 51 emails.
        contentParagraph(`${id}-message`, isExpandedCatalogTemplateName(id)
            ? `${description}.`
            : `${description}. ${contextMessages[category]}`),
    ];
    if (isExpandedCatalogTemplateName(id)) {
        body.push(...buildExpandedTemplateContent(id, presentation));
    }
    if (data?.detail) {
        body.push(panel(`${id}-detail`, [
            mutedParagraph(`${id}-detail-text`, data.detail),
        ]));
    }
    // Use existing semantic panel components so all styling comes from
    // the selected MailForge theme, not hardcoded per-template CSS.
    if (category === "account" && accountDetails) {
        const details: EmailNode[] = [];
        if (accountDetails.email !== undefined) {
            details.push(mutedParagraph(`${id}-account-email`, `Account email: ${accountDetails.email}`));
        }
        if (accountDetails.referenceId !== undefined) {
            details.push(mutedParagraph(`${id}-account-reference`, `Reference: ${accountDetails.referenceId}`));
        }
        if (details.length > 0) body.push(panel(`${id}-account-details`, details));
    }
    if (category === "authentication" && securityDetails) {
        const details: EmailNode[] = [];
        if (securityDetails.device !== undefined) {
            details.push(mutedParagraph(`${id}-security-device`, `Device: ${securityDetails.device}`));
        }
        if (securityDetails.location !== undefined) {
            details.push(mutedParagraph(`${id}-security-location`, `Location: ${securityDetails.location}`));
        }
        if (securityDetails.occurredAt !== undefined) {
            const timestamp = new Date(securityDetails.occurredAt).toUTCString();
            details.push(mutedParagraph(`${id}-security-time`, `Time (UTC): ${timestamp}`));
        }
        if (details.length > 0) body.push(panel(`${id}-security-details`, details));
    }
    // Billing and order panels reuse semantic nodes for theme consistency.
    // Display values are not calculated or converted by the template engine.
    if (category === "billing" && billingDetails) {
        const details: EmailNode[] = [];
        if (billingDetails.referenceId !== undefined) {
            details.push(mutedParagraph(`${id}-billing-reference`, `Reference: ${billingDetails.referenceId}`));
        }
        if (billingDetails.planName !== undefined) {
            details.push(mutedParagraph(`${id}-billing-plan`, `Plan: ${billingDetails.planName}`));
        }
        if (billingDetails.amount !== undefined && billingDetails.currency !== undefined) {
            details.push(mutedParagraph(`${id}-billing-amount`, `Amount: ${billingDetails.currency} ${billingDetails.amount}`));
        }
        if (billingDetails.billingDate !== undefined) {
            details.push(mutedParagraph(`${id}-billing-date`, `Billing date: ${billingDetails.billingDate}`));
        }
        if (details.length > 0) body.push(panel(`${id}-billing-details`, details));
        if (billingDetails.lineItems?.length) {
            body.push({
                id: `${id}-invoice-lines`, type: "table",
                props: {
                    headers: ["Item", "Qty", "Unit price", "Line total"],
                    rows: billingDetails.lineItems.map(item => [
                        item.description, String(item.quantity),
                        `${billingDetails.currency} ${item.unitPrice}`,
                        `${billingDetails.currency} ${item.lineTotal}`,
                    ]),
                    alignments: ["left", "right", "right", "right"],
                    caption: "Invoice line items",
                },
            });
        }
    }
    if (category === "ecommerce" && ecommerceDetails) {
        const details: EmailNode[] = [];
        if (ecommerceDetails.orderId !== undefined) {
            details.push(mutedParagraph(`${id}-order-id`, `Order: ${ecommerceDetails.orderId}`));
        }
        if (ecommerceDetails.trackingNumber !== undefined) {
            details.push(mutedParagraph(`${id}-order-tracking`, `Tracking: ${ecommerceDetails.trackingNumber}`));
        }
        if (ecommerceDetails.carrier !== undefined) {
            details.push(mutedParagraph(`${id}-order-carrier`, `Carrier: ${ecommerceDetails.carrier}`));
        }
        if (ecommerceDetails.estimatedDelivery !== undefined) {
            details.push(mutedParagraph(`${id}-order-delivery`, `Estimated delivery: ${ecommerceDetails.estimatedDelivery}`));
        }
        if (details.length > 0) body.push(panel(`${id}-ecommerce-details`, details));
    }
    // Optional marketing and notification panels use semantic MailForge styles.
    // No colors or layout constants are hardcoded in the templates.
    if (category === "marketing" && marketingDetails) {
        const details: EmailNode[] = [];
        if (marketingDetails.campaignName !== undefined) {
            details.push(mutedParagraph(`${id}-campaign-name`, `Campaign: ${marketingDetails.campaignName}`));
        }
        if (marketingDetails.promotionCode !== undefined) {
            details.push(mutedParagraph(`${id}-promotion-code`, `Promotion code: ${marketingDetails.promotionCode}`));
        }
        if (marketingDetails.endsOn !== undefined) {
            details.push(mutedParagraph(`${id}-campaign-ends`, `Offer ends: ${marketingDetails.endsOn}`));
        }
        if (details.length > 0) body.push(panel(`${id}-marketing-details`, details));
        for (const [index, product] of (marketingDetails.products ?? []).entries()) {
            const productId = `${id}-product-${index}`;
            const productNodes: EmailNode[] = [
                ...(product.imageUrl !== undefined ? [{
                    id: `${productId}-image`, type: "image",
                    props: { src: product.imageUrl, alt: product.imageAlt! },
                } satisfies EmailNode] : []),
                contentHeading(`${productId}-name`, product.name),
                contentParagraph(`${productId}-price`, product.priceLabel),
                ...(product.description !== undefined ? [
                    mutedParagraph(`${productId}-description`, product.description),
                ] : []),
            ];
            body.push(panel(productId, productNodes));
        }
    }
    if (category === "notifications" && notificationDetails) {
        const details: EmailNode[] = [];
        if (notificationDetails.serviceName !== undefined) {
            details.push(mutedParagraph(`${id}-notification-service`, `Service: ${notificationDetails.serviceName}`));
        }
        if (notificationDetails.referenceId !== undefined) {
            details.push(mutedParagraph(`${id}-notification-reference`, `Reference: ${notificationDetails.referenceId}`));
        }
        if (notificationDetails.severity !== undefined) {
            details.push(mutedParagraph(`${id}-notification-severity`, `Severity: ${notificationDetails.severity}`));
        }
        if (notificationDetails.eventAt !== undefined) {
            const timestamp = new Date(notificationDetails.eventAt).toUTCString();
            details.push(mutedParagraph(`${id}-notification-time`, `Event time (UTC): ${timestamp}`));
        }
        if (details.length > 0) body.push(panel(`${id}-notification-details`, details));
    }
    // Theme-aware panels. Stable node IDs make display.hideIds effective.
    if (category === "events" && eventDetails) {
        const details: EmailNode[] = [];
        if (eventDetails.name !== undefined) details.push(mutedParagraph(`${id}-event-name`, `Event: ${eventDetails.name}`));
        if (eventDetails.startsAt !== undefined) details.push(mutedParagraph(`${id}-event-start`, `Starts (UTC): ${new Date(eventDetails.startsAt).toUTCString()}`));
        if (eventDetails.endsAt !== undefined) details.push(mutedParagraph(`${id}-event-end`, `Ends (UTC): ${new Date(eventDetails.endsAt).toUTCString()}`));
        if (eventDetails.venue !== undefined) details.push(mutedParagraph(`${id}-event-venue`, `Venue: ${eventDetails.venue}`));
        if (eventDetails.meetingUrl !== undefined) details.push(quietAction(`${id}-event-meeting`, "Join event", eventDetails.meetingUrl));
        if (details.length > 0) body.push(panel(`${id}-event-details`, details));
        if (eventDetails.ticketCode !== undefined) {
            body.push({
                id: `${id}-event-ticket`, type: "table",
                props: {
                    headers: ["Ticket field", "Details"],
                    rows: [
                        ["Event", eventDetails.name!],
                        ["Attendee", recipient],
                        ["Ticket", eventDetails.ticketCode],
                        ...(eventDetails.admission !== undefined ? [
                            ["Admission", eventDetails.admission],
                        ] : []),
                    ],
                    caption: "Event ticket",
                },
            });
        }
    }
    if (category === "saas" && saasDetails) {
        const details: EmailNode[] = [];
        if (saasDetails.workspaceName !== undefined) details.push(mutedParagraph(`${id}-saas-workspace`, `Workspace: ${saasDetails.workspaceName}`));
        if (saasDetails.memberName !== undefined) details.push(mutedParagraph(`${id}-saas-member`, `Member: ${saasDetails.memberName}`));
        if (saasDetails.planName !== undefined) details.push(mutedParagraph(`${id}-saas-plan`, `Plan: ${saasDetails.planName}`));
        if (saasDetails.usagePercent !== undefined) details.push(mutedParagraph(`${id}-saas-usage`, `Usage: ${saasDetails.usagePercent}%`));
        if (details.length > 0) body.push(panel(`${id}-saas-details`, details));
        if (saasDetails.metrics?.length) {
            body.push({
                id: `${id}-saas-metrics`, type: "table",
                props: {
                    headers: ["Metric", "Value"],
                    rows: saasDetails.metrics.map(metric => [metric.label, metric.value]),
                    caption: "Workspace metrics",
                },
            });
        }
    }
    if (category === "support" && supportDetails) {
        const details: EmailNode[] = [];
        if (supportDetails.ticketId !== undefined) details.push(mutedParagraph(`${id}-ticket-id`, `Ticket: ${supportDetails.ticketId}`));
        if (supportDetails.status !== undefined) details.push(mutedParagraph(`${id}-ticket-status`, `Status: ${supportDetails.status}`));
        if (supportDetails.agentName !== undefined) details.push(mutedParagraph(`${id}-ticket-agent`, `Support agent: ${supportDetails.agentName}`));
        if (details.length > 0) body.push(panel(`${id}-support-details`, details));
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
    const designed = composeCatalogDesign(id, category, body);
    const document: EmailDocument = {
        schemaVersion: "1.0", id, version: "1.0.0", subject: title,
        preheader: description, body: designed.body,
        metadata: { category, catalog: "builtin", designFamily: designed.family },
    };
    new DocumentValidator().validateOrThrow(document);
    return document;
}
