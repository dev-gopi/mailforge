import type { EmailNode } from "@mailforge/core";
import { getCatalogDesignFamily } from "./CatalogDesignFamilies.js";
import { z } from "zod";
import { contentParagraph, mutedParagraph, panel, quietAction, paragraph, withRole } from "../shared/TemplateNodes.js";

/** This is the 51-template expansion; category contracts remain in CatalogTemplates.ts. */
export const EXPANDED_CATALOG_TEMPLATE_DEFINITIONS = [
    ["account-suspended", "account", "Your account has been suspended", "Access to your account is temporarily restricted", "Review account"],
    ["account-restored", "account", "Your account access is restored", "You can sign in to your account again", "Open account"],
    ["email-change-request", "account", "Confirm your email change", "A request to change your email address was received", "Review request"],
    ["email-change-confirmed", "account", "Your email address has changed", "Your account contact email has been updated", "View account"],
    ["profile-review-required", "account", "Please review your profile", "Some account information needs your attention", "Review profile"],
    ["account-deletion-confirmed", "account", "Your account deletion is complete", "Your account deletion request has been processed", "View details"],
    ["new-device-verified", "authentication", "New device verified", "A device was successfully verified for your account", "Review devices"],
    ["password-changed", "authentication", "Your password was changed", "Your account password has been updated", "Review security"],
    ["mfa-disabled", "authentication", "Two-factor authentication was disabled", "An account security setting has changed", "Enable MFA"],
    ["session-revoked", "authentication", "A session was signed out", "An active sign-in session has been revoked", "View sessions"],
    ["login-attempt-blocked", "authentication", "Blocked sign-in attempt", "We blocked a sign-in attempt to your account", "Review activity"],
    ["invoice-overdue", "billing", "Invoice past due", "A scheduled payment is overdue", "View invoice"],
    ["invoice-reminder", "billing", "Upcoming invoice reminder", "Your next invoice needs attention", "Review invoice"],
    ["payment-method-expiring", "billing", "Payment method expiring soon", "Your saved payment method may need updating", "Update payment"],
    ["payment-method-updated", "billing", "Payment method updated", "Your saved billing method has been changed", "View billing"],
    ["subscription-cancelled", "billing", "Subscription cancelled", "Your subscription cancellation is confirmed", "View subscription"],
    ["trial-started", "billing", "Your free trial is ready", "Your trial access has started", "Explore features"],
    ["credit-note-issued", "billing", "Credit note issued", "A billing credit has been recorded", "View credit"],
    ["order-placed", "ecommerce", "We received your order", "Your order has been placed successfully", "View order"],
    ["order-processing", "ecommerce", "Your order is being processed", "We are preparing your order for fulfillment", "Track order"],
    ["order-packed", "ecommerce", "Your order is packed", "Your order is ready for its next delivery step", "View tracking"],
    ["order-out-for-delivery", "ecommerce", "Your order is out for delivery", "Your delivery is on its way", "Track delivery"],
    ["delivery-failed", "ecommerce", "Delivery attempt was unsuccessful", "Your package could not be delivered", "Review delivery"],
    ["return-requested", "ecommerce", "Return request received", "We have received your return request", "View return"],
    ["return-completed", "ecommerce", "Your return is complete", "Your return has been processed", "View return"],
    ["exchange-confirmed", "ecommerce", "Your exchange is confirmed", "Your replacement item has been approved", "Track exchange"],
    ["flash-sale", "marketing", "Flash sale starts now", "Your limited-time offers are available", "Shop sale"],
    ["abandoned-checkout", "marketing", "Pick up where you left off", "Items in your checkout are still waiting", "Complete checkout"],
    ["customer-winback", "marketing", "We would love to see you again", "Discover what is new since your last visit", "Explore updates"],
    ["referral-program", "marketing", "Invite a friend and share the benefits", "See how our referral program works", "View referrals"],
    ["loyalty-reward", "marketing", "A loyalty reward is waiting", "Thank you for being part of our community", "View rewards"],
    ["birthday-offer", "marketing", "A special birthday surprise", "Celebrate with an offer made for you", "View offer"],
    ["product-recommendation", "marketing", "Picked for you", "Explore products you may enjoy", "Explore products"],
    ["webinar-announcement", "marketing", "Join our upcoming webinar", "Learn with our team in the next live session", "Register now"],
    ["event-ticket-issued", "events", "Your event ticket is ready", "Your ticket details are available", "View ticket"],
    ["event-location-changed", "events", "Event location has changed", "Important venue information for your event", "View location"],
    ["event-rescheduled", "events", "Your event has a new date", "Updated scheduling information is available", "View schedule"],
    ["event-starting-soon", "events", "Your event begins soon", "Get ready for your upcoming event", "Join event"],
    ["event-follow-up", "events", "Thank you for joining us", "Resources and highlights from your event", "View resources"],
    ["event-feedback-request", "events", "How was your event experience?", "We would value your feedback", "Share feedback"],
    ["workspace-created", "saas", "Your workspace is ready", "Your new workspace has been created", "Open workspace"],
    ["workspace-role-changed", "saas", "Your workspace role changed", "Your workspace permissions have been updated", "Review permissions"],
    ["usage-limit-reached", "saas", "Usage limit reached", "Your workspace has reached a usage threshold", "Review usage"],
    ["api-key-created", "saas", "A new API key was created", "A developer credential was added to your workspace", "Review API keys"],
    ["integration-disconnected", "saas", "Integration disconnected", "A connected service is no longer linked", "Reconnect service"],
    ["ticket-assigned", "support", "Your support ticket is assigned", "An agent is now handling your request", "View ticket"],
    ["ticket-escalated", "support", "Your support ticket was escalated", "Your request is receiving additional attention", "View ticket"],
    ["ticket-awaiting-response", "support", "We are waiting for your reply", "Your support ticket needs a response", "Reply to ticket"],
    ["satisfaction-survey", "support", "Tell us about your support experience", "Your feedback helps us improve support", "Rate support"],
    ["compliance-notice", "notifications", "Important compliance notice", "An important policy or compliance update is available", "Read notice"],
    ["incident-resolved", "notifications", "Service incident resolved", "Service availability has been restored", "View incident"],
] as const;

export type ExpandedCatalogTemplateName = typeof EXPANDED_CATALOG_TEMPLATE_DEFINITIONS[number][0];
export const EXPANDED_CATALOG_TEMPLATE_NAMES: readonly ExpandedCatalogTemplateName[] = EXPANDED_CATALOG_TEMPLATE_DEFINITIONS.map(row => row[0]);

export type ExpandedTemplateTone = "success" | "warning" | "info" | "promotion";
export interface ExpandedTemplateStory {
    readonly tone: ExpandedTemplateTone;
    readonly intro: string;
    readonly highlights: readonly [string, string];
}

/** Purpose-written copy for every template, not duplicated generic placeholders. */
export const EXPANDED_TEMPLATE_STORIES: Readonly<Record<ExpandedCatalogTemplateName, ExpandedTemplateStory>> = {
    "account-suspended": { tone: "warning", intro: "Your account needs attention before you can use it again.", highlights: ["Check the reason for the restriction in your account portal.", "Follow the displayed recovery steps or contact support if you need help."] },
    "account-restored": { tone: "success", intro: "Good news: access to your account has been restored.", highlights: ["Review your recent account activity to make sure everything looks right.", "You can manage your account settings from your dashboard."] },
    "email-change-request": { tone: "warning", intro: "An email address change was requested for your account.", highlights: ["Only approve this change if you initiated it.", "If the request was unexpected, review your security settings immediately."] },
    "email-change-confirmed": { tone: "success", intro: "The email address on your account has been updated.", highlights: ["Future account notices will use the updated address.", "Review your profile if this change does not look familiar."] },
    "profile-review-required": { tone: "info", intro: "We need you to verify or complete your profile information.", highlights: ["Check your contact details and required profile fields.", "Save your changes so your account information stays up to date."] },
    "account-deletion-confirmed": { tone: "warning", intro: "Your account deletion request has been completed.", highlights: ["Keep this notice for your records if you need a reference later.", "Contact support if you believe this action was unexpected."] },
    "new-device-verified": { tone: "success", intro: "A new device has completed the verification process.", highlights: ["Check the device and location details shown below.", "Remove unfamiliar devices from your security settings."] },
    "password-changed": { tone: "success", intro: "Your password change was completed.", highlights: ["You can use your updated credentials the next time you sign in.", "If you did not make this change, secure your account immediately."] },
    "mfa-disabled": { tone: "warning", intro: "Two-factor authentication is no longer enabled.", highlights: ["Review when and where this change happened.", "Consider turning MFA back on to better protect your account."] },
    "session-revoked": { tone: "info", intro: "One of your existing sign-in sessions has ended.", highlights: ["You may need to sign in again on that device.", "Review all active sessions if this sign-out was unexpected."] },
    "login-attempt-blocked": { tone: "warning", intro: "A sign-in attempt did not meet your account security checks.", highlights: ["Confirm whether you recognize the device and location.", "Update your security settings if you did not try to sign in."] },
    "invoice-overdue": { tone: "warning", intro: "We have not received the payment for an invoice past its due date.", highlights: ["Review the invoice and its payment due date.", "If you have already paid, confirm the latest status in billing."] },
    "invoice-reminder": { tone: "info", intro: "This is a reminder about your upcoming invoice.", highlights: ["Review the amount and billing date in your account.", "Confirm the payment method before the due date."] },
    "payment-method-expiring": { tone: "warning", intro: "Your saved payment method is nearing its expiration date.", highlights: ["Check the expiration information in your billing portal.", "Update the payment method to avoid an interrupted subscription."] },
    "payment-method-updated": { tone: "success", intro: "Your saved payment method information was updated.", highlights: ["Future charges will use the payment method displayed in billing.", "Contact support if you did not authorize the change."] },
    "subscription-cancelled": { tone: "info", intro: "Your subscription has been cancelled as requested.", highlights: ["Check the account portal for the final access date.", "You can review available plans if you decide to return."] },
    "trial-started": { tone: "success", intro: "Welcome to your trial period.", highlights: ["Explore the features available in your trial plan.", "Visit billing to review your trial end date and next steps."] },
    "credit-note-issued": { tone: "success", intro: "A credit note has been issued for your account.", highlights: ["Review the credit reference and amount on your billing page.", "Your billing portal shows how this credit will be applied."] },
    "order-placed": { tone: "success", intro: "Thank you for placing your order.", highlights: ["Your order details and items are available from the order page.", "We will notify you when the order advances to the next stage."] },
    "order-processing": { tone: "info", intro: "Your order has moved into processing.", highlights: ["Your items are being prepared for shipment or pickup.", "You can follow any new status updates on the order page."] },
    "order-packed": { tone: "success", intro: "Your order has been packed and is nearly ready to travel.", highlights: ["Tracking information may appear when the carrier receives it.", "Check your order page for the latest delivery details."] },
    "order-out-for-delivery": { tone: "success", intro: "Your parcel is on its final delivery route.", highlights: ["Keep an eye on your tracking status for the arrival window.", "Check delivery instructions if you need to make changes."] },
    "delivery-failed": { tone: "warning", intro: "The delivery carrier was unable to complete an attempt.", highlights: ["Check the delivery notice and the latest tracking information.", "Arrange another attempt or update instructions if supported."] },
    "return-requested": { tone: "info", intro: "Your return request has been submitted.", highlights: ["Follow the instructions in the return portal for the next step.", "Keep any shipping label or reference for your records."] },
    "return-completed": { tone: "success", intro: "Your return has completed processing.", highlights: ["Check the return summary for item and reimbursement details.", "Your payment provider may need additional time to show a refund."] },
    "exchange-confirmed": { tone: "success", intro: "Your exchange request has been confirmed.", highlights: ["Review the replacement item and any shipping updates.", "Follow the exchange status page for the next delivery step."] },
    "flash-sale": { tone: "promotion", intro: "Discover special offers for a limited period.", highlights: ["Browse the eligible products and their current prices.", "Check the promotion terms and end date before ordering."] },
    "abandoned-checkout": { tone: "promotion", intro: "You can return to your checkout when you are ready.", highlights: ["Your cart may change if availability or prices are updated.", "Confirm the final order details before submitting payment."] },
    "customer-winback": { tone: "promotion", intro: "A lot can change between visits.", highlights: ["Explore newly available products, features and offers.", "Choose the updates most relevant to your interests."] },
    "referral-program": { tone: "promotion", intro: "Sharing your experience can benefit your friends.", highlights: ["Learn the eligibility requirements before sending invitations.", "Track qualifying referrals and rewards in your account."] },
    "loyalty-reward": { tone: "success", intro: "Your continued support deserves recognition.", highlights: ["Check which rewards are available to your account.", "Review expiration dates and redemption requirements."] },
    "birthday-offer": { tone: "promotion", intro: "Here is something special to celebrate your day.", highlights: ["Explore the eligible products or services in this offer.", "Check the terms and redeem before the promotion ends."] },
    "product-recommendation": { tone: "promotion", intro: "Discover items that may match your interests.", highlights: ["Compare their features and current availability.", "You can update your preferences at any time."] },
    "webinar-announcement": { tone: "info", intro: "We are hosting a session to share practical insights.", highlights: ["Find the topic, date and session details on the registration page.", "Reserve a place and watch for your confirmation email."] },
    "event-ticket-issued": { tone: "success", intro: "Your ticket has been issued for the event.", highlights: ["Review your event date, venue and entry instructions.", "Keep your ticket reference handy when you arrive."] },
    "event-location-changed": { tone: "warning", intro: "The location for your upcoming event has changed.", highlights: ["Review the updated venue and travel information.", "Check your ticket for any additional arrival instructions."] },
    "event-rescheduled": { tone: "warning", intro: "The event schedule has been updated.", highlights: ["Review the new date and start time carefully.", "Contact the organizer if the new time does not work for you."] },
    "event-starting-soon": { tone: "info", intro: "Your event will begin shortly.", highlights: ["Check the start time and access information before joining.", "Keep your ticket or confirmation nearby if required."] },
    "event-follow-up": { tone: "success", intro: "We appreciate you taking part in the event.", highlights: ["Explore the available materials and session highlights.", "Stay connected for related sessions and upcoming events."] },
    "event-feedback-request": { tone: "info", intro: "Your experience can help us make future events better.", highlights: ["Tell us which sessions were most useful.", "Share any suggestions you would like the organizers to hear."] },
    "workspace-created": { tone: "success", intro: "Your workspace is ready for your team.", highlights: ["Set up the key preferences that fit your organization.", "Invite teammates when you are ready to collaborate."] },
    "workspace-role-changed": { tone: "info", intro: "Your role or access level in a workspace has changed.", highlights: ["Review the available tools and permissions in your profile.", "Contact a workspace administrator if anything looks incorrect."] },
    "usage-limit-reached": { tone: "warning", intro: "Your workspace has reached its current usage limit.", highlights: ["Check which resources are using the available allowance.", "Review plans or usage options in the workspace dashboard."] },
    "api-key-created": { tone: "warning", intro: "A new API key has been created in your workspace.", highlights: ["Review who created the key and its access scope.", "Revoke unfamiliar keys and keep credentials out of messages."] },
    "integration-disconnected": { tone: "warning", intro: "One of your workspace integrations has been disconnected.", highlights: ["Check which workflows may be affected by the disconnection.", "Reconnect the service when you are ready to restore access."] },
    "ticket-assigned": { tone: "info", intro: "Your support request has been assigned to an agent.", highlights: ["Review the latest ticket activity for updates.", "You can reply with more context directly from the support portal."] },
    "ticket-escalated": { tone: "warning", intro: "Your support request has been escalated for further review.", highlights: ["The support team is reviewing the details of your request.", "Track its progress or supply additional information in the ticket."] },
    "ticket-awaiting-response": { tone: "info", intro: "The support team needs additional information from you.", highlights: ["Open the ticket to review the latest question.", "Reply in the support portal so work can continue."] },
    "satisfaction-survey": { tone: "info", intro: "We hope your recent support experience was helpful.", highlights: ["Rate the quality and clarity of the assistance you received.", "Share suggestions for improving future responses."] },
    "compliance-notice": { tone: "warning", intro: "Please review a new compliance-related notice.", highlights: ["Read the applicable policy details carefully.", "Contact your compliance team if clarification is required."] },
    "incident-resolved": { tone: "success", intro: "The previously reported service incident is resolved.", highlights: ["Review the incident timeline and restoration details.", "Watch the status page for any additional follow-up."] },
};

const expandedNames = new Set<string>(EXPANDED_CATALOG_TEMPLATE_NAMES);
export function isExpandedCatalogTemplateName(name: string): name is ExpandedCatalogTemplateName {
    return expandedNames.has(name);
}

const safeText = z.string().trim().min(1).max(500).refine(value =>
    !/\p{Cc}/u.test(value), "Control characters are not allowed");
const safeLink = z.url().refine(value => {
    const parsed = new URL(value);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && !parsed.username && !parsed.password;
}, "Use an HTTP(S) URL without credentials");

/** Optional additions to an already-validated category-specific data contract. */
export const expandedTemplatePresentationSchema = z.object({
    summary: safeText.optional(),
    facts: z.array(z.object({label: safeText, value: safeText}).strict()).max(6).optional(),
    nextSteps: z.array(safeText).max(4).optional(),
    secondaryAction: z.object({label: safeText, url: safeLink}).strict().optional(),
}).strict();
export type ExpandedTemplatePresentation = z.input<typeof expandedTemplatePresentationSchema>;

/** Extract presentation only for expansion IDs; old strict data contracts stay intact. */
export function extractExpandedTemplatePresentation(input: unknown): {
    readonly baseInput: Record<string, unknown>;
    readonly presentation: ExpandedTemplatePresentation | undefined;
} {
    if (input === null || typeof input !== "object" || Array.isArray(input) ||
        (Object.getPrototypeOf(input) !== Object.prototype && Object.getPrototypeOf(input) !== null)) {
        throw new Error("Expanded template data must be a plain object");
    }
    const attributes = Object.getOwnPropertyDescriptors(input);
    for (const [key, attr] of Object.entries(attributes)) {
        if (!Object.hasOwn(attr, "value")) throw new Error(`Getters are unsupported in template data: ${key}`);
        if (key === "__proto__" || key === "constructor" || key === "prototype") {
            throw new Error(`Unsafe template data key: ${key}`);
        }
    }
    const inputData = input as Record<string, unknown>;
    const { presentation: rawPresentation, ...baseInput } = inputData;
    const presentation = rawPresentation === undefined ? undefined : expandedTemplatePresentationSchema.parse(rawPresentation);
    return { baseInput, presentation };
}

/**
 * Purpose-first story treatments. These keep every old node ID and preserve
 * semantic highlight text; only the outer grouping changes. Plain editorial,
 * campaign, ticket and conversation copy should not look like a second card.
 * Use the existing design-family resolver rather than a parallel registry.
 */
const UNBOXED_STORY_FAMILIES = new Set([
    "editorial", "spotlight", "showcase", "ticket", "invitation",
    "conversation", "minimal",
]);
/** Email-client-safe nodes: layout, colors, spacing and buttons inherit active theme. */
export function buildExpandedTemplateContent(
    id: ExpandedCatalogTemplateName, presentation?: ExpandedTemplatePresentation,
): EmailNode[] {
    const story = EXPANDED_TEMPLATE_STORIES[id];
    const introRole = story.tone === "success" ? "success-note"
        : story.tone === "warning" ? "warning-note" : "body";
    const body: EmailNode[] = [
        withRole(paragraph(`${id}-intro`, presentation?.summary ?? story.intro), introRole),
    ];
    const category = EXPANDED_CATALOG_TEMPLATE_DEFINITIONS.find(row => row[0] === id)?.[1];
    if (!category) throw new Error(`Unknown expanded catalog category for ${id}`);
    const family = getCatalogDesignFamily(id, category);
    const highlights: EmailNode[] = [
        contentParagraph(`${id}-highlight-1`, story.highlights[0]),
        // A quieter follow-up suits conversational and minimal notifications.
        family === "conversation" || family === "minimal"
            ? mutedParagraph(`${id}-highlight-2`, story.highlights[1])
            : contentParagraph(`${id}-highlight-2`, story.highlights[1]),
    ];
    if (UNBOXED_STORY_FAMILIES.has(family)) {
        // Keep the existing highlights and highlights-column IDs so user patches
        // can still target them, while removing the repetitive nested card.
        body.push({
            id: `${id}-highlights`,
            type: "section",
            children: [{
                id: `${id}-highlights-column`,
                type: "column",
                children: highlights,
            }],
        });
    } else {
        // Structured finance, operational, delivery and security messages
        // benefit from the original, theme-controlled record/alert panel.
        body.push(panel(`${id}-highlights`, highlights));
    }
    if (presentation?.facts?.length) {
        body.push(panel(`${id}-facts`, [
            ...presentation.facts.map((fact, i) => mutedParagraph(`${id}-fact-${i}`, `${fact.label}: ${fact.value}`)),
        ]));
    }
    if (presentation?.nextSteps?.length) {
        body.push(panel(`${id}-steps`, [
            ...presentation.nextSteps.map((step, i) => contentParagraph(`${id}-step-${i}`, `${i + 1}. ${step}`)),
        ]));
    }
    if (presentation?.secondaryAction) {
        body.push(quietAction(`${id}-secondary`, presentation.secondaryAction.label, presentation.secondaryAction.url));
    }
    return body;
}
