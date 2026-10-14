import type { EmailNode } from "@mailforge/core";

/** Twelve purpose-built compositions, independent of the active color theme. */
export const CATALOG_DESIGN_FAMILIES = [
    "editorial", "spotlight", "receipt", "ledger", "delivery", "showcase",
    "ticket", "invitation", "dashboard", "conversation", "security", "minimal",
] as const;
export type CatalogDesignFamily = typeof CATALOG_DESIGN_FAMILIES[number];

const CATEGORY_FAMILIES: Record<string, readonly CatalogDesignFamily[]> = {
    account: ["editorial", "minimal", "security"],
    authentication: ["security", "minimal"],
    billing: ["receipt", "ledger"],
    ecommerce: ["delivery", "showcase"],
    marketing: ["spotlight", "editorial", "showcase"],
    notifications: ["security", "dashboard", "minimal"],
    events: ["ticket", "invitation", "editorial"],
    saas: ["dashboard", "spotlight", "minimal"],
    support: ["conversation", "minimal", "dashboard"],
};

/** Curated flagship layouts; other IDs receive a stable category-appropriate family. */
const FEATURED: Readonly<Record<string, CatalogDesignFamily>> = {
    "flash-sale": "spotlight", "product-launch": "showcase",
    "newsletter": "editorial", "invoice-overdue": "ledger",
    "invoice-reminder": "receipt", "credit-note-issued": "receipt",
    "order-out-for-delivery": "delivery", "order-placed": "showcase",
    "event-ticket-issued": "ticket", "event-invitation": "invitation",
    "workspace-created": "dashboard", "ticket-escalated": "conversation",
    "login-attempt-blocked": "security", "account-restored": "minimal",
    "account-activated": "editorial", "event-feedback-request": "editorial",
    "trial-started": "spotlight", "report-ready": "minimal", "activity-notification": "conversation",
    "password-reset-secure": "security", "order-shipped-notice": "delivery",
    "new-device-login-alert": "security",
    "workspace-invitation-editorial": "invitation",
    "appointment-confirmation": "ticket",
};

/** Curate semantic exceptions rather than hashing their names. */
const PURPOSE_FAMILIES: Readonly<Record<string, CatalogDesignFamily>> = {
    "magic-link": "security",
    "mfa-enabled": "security",
    "recovery-codes": "security",
    "suspicious-sign-in": "security",
    "password-changed": "security",
    "mfa-disabled": "security",
    "new-device-verified": "security",
    "email-change-request": "security",
    "account-suspended": "security",
    "payment-failed": "ledger",
    "refund-processed": "receipt",
    "subscription-renewed": "receipt",
    "order-delivered": "delivery",
    "order-packed": "delivery",
    "delivery-failed": "delivery",
    "cart-reminder": "showcase",
    "seasonal-sale": "spotlight",
    "event-promotion": "invitation",
    "webinar-announcement": "invitation",
    "event-registration": "ticket",
    "event-reminder": "invitation",
    "event-rescheduled": "invitation",
    "event-starting-soon": "ticket",
    "workspace-role-changed": "dashboard",
    "usage-limit-reached": "dashboard",
    "api-key-created": "security",
    "integration-disconnected": "security",
    "support-ticket-opened": "conversation",
    "support-ticket-resolved": "conversation",
    "ticket-awaiting-response": "conversation",
    "service-outage": "security",
    "incident-resolved": "dashboard",
    "weekly-digest": "dashboard",
};
export function getCatalogDesignFamily(id: string, category: string): CatalogDesignFamily {
    if (FEATURED[id]) return FEATURED[id];
    if (PURPOSE_FAMILIES[id]) return PURPOSE_FAMILIES[id];
    const choices = CATEGORY_FAMILIES[category];
    if (!choices?.length) throw new Error(`Unsupported catalog category: ${category}`);
    const number = [...id].reduce((hash, char, index) => hash + char.charCodeAt(0) * (index + 1), 0);
    return choices[number % choices.length]!;
}

const FONT_FOR_FAMILY: Record<CatalogDesignFamily, string> = {
    editorial: "editorial", spotlight: "friendly", receipt: "corporate",
    ledger: "corporate", delivery: "friendly", showcase: "editorial",
    ticket: "editorial", invitation: "editorial", dashboard: "technical",
    conversation: "friendly", security: "technical", minimal: "modern",
};

/** Attach a font intent instead of overriding theme CSS with hardcoded inline styles. */
function annotateFont(node: EmailNode, font: string): EmailNode {
    const children = node.children?.map(child => annotateFont(child, font));
    return {
        ...node,
        ...(children ? { children } : {}),
        ...(["heading", "text", "button", "copyright"].includes(node.type)
            ? { attrs: { ...node.attrs, "data-mf-font": font } } : {}),
    };
}

/** Move a contiguous story into a real MJML section without changing its node IDs. */
function groupStory(
    body: EmailNode[], id: string,
    role: "design-record" | "design-ledger" | "design-route" | "design-conversation" | "design-alert" | "design-dashboard",
    nodes: EmailNode[], after: EmailNode,
): void {
    const positions = nodes.map(node => body.indexOf(node));
    if (positions.some(position => position === -1)) return;
    for (const position of [...positions].sort((a, b) => b - a)) body.splice(position, 1);
    const insertion = body.indexOf(after) + 1;
    body.splice(insertion, 0, {
        id: `${id}-${role}`,
        type: "section",
        children: [{
            id: `${id}-${role}-column`,
            type: "column",
            attrs: { "data-mf-style": role },
            children: nodes,
        }],
    });
}

/** Promote the main title and message to one full-width hero section. */
function promoteHero(body: EmailNode[], id: string, title: EmailNode, subtitle: EmailNode): void {
    const titleIndex = body.indexOf(title);
    const subtitleIndex = body.indexOf(subtitle);
    if (titleIndex === -1 || subtitleIndex === -1) return;
    const insertion = Math.min(titleIndex, subtitleIndex);
    for (const index of [titleIndex, subtitleIndex].sort((a, b) => b - a)) body.splice(index, 1);
    body.splice(insertion, 0, {
        id: `${id}-design-hero`, type: "section",
        attrs: { "data-mf-style": "design-hero" },
        children: [title, subtitle],
    });
}

/**
 * Preserve every existing content/node ID, unsubscribe link and security note.
 * Only compose category-appropriate structures and theme-driven visual roles.
 */
export function composeCatalogDesign(
    id: string, category: string, source: readonly EmailNode[],
): { family: CatalogDesignFamily; body: EmailNode[] } {
    const family = getCatalogDesignFamily(id, category);
    const font = FONT_FOR_FAMILY[family];
    const copied = source.map(node => annotateFont(node, font));
    const find = (suffix: string): EmailNode | undefined => copied.find(node => node.id === `${id}-${suffix}`);
    const title = find("title");
    const subtitle = find("message");
    const greeting = find("greeting");
    const topLabel = find("eyebrow");
    if (!title || !subtitle || !greeting || !topLabel) throw new Error(`Malformed catalog composition: ${id}`);

    // Category labels (for example, "ORDER UPDATE") add visual noise and are
    // redundant with the subject/title, so catalog emails omit them entirely.
    copied.splice(copied.indexOf(topLabel), 1);
    if (["editorial", "spotlight", "ticket", "invitation", "showcase"].includes(family)) {
        title.attrs = { ...title.attrs, "data-mf-style": "hero-title" };
        subtitle.attrs = { ...subtitle.attrs, "data-mf-style": "hero-subtitle" };
    } else if (["ledger", "receipt", "dashboard", "conversation"].includes(family)) {
        title.attrs = { ...title.attrs, "data-mf-style": "section-title" };
    }

    if (family === "security") {
        const intro = find("intro");
        if (intro) intro.attrs = { ...intro.attrs, "data-mf-style": "design-security-note" };
    }
    if (family === "minimal") {
        greeting.attrs = { ...greeting.attrs, "data-mf-style": "muted" };
    }
    if (family === "security") {
        title.attrs = { ...title.attrs, "data-mf-style": "section-title" };
        groupStory(copied, id, "design-alert", [greeting, subtitle], title);
    }
    if (family === "receipt") {
        groupStory(copied, id, "design-record", [title, greeting, subtitle], title);
    }
    if (family === "ledger") groupStory(copied, id, "design-ledger", [title, greeting, subtitle], title);
    if (family === "delivery") {
        groupStory(copied, id, "design-route", [greeting, subtitle], title);
    }
    if (family === "conversation") {
        groupStory(copied, id, "design-conversation", [greeting, subtitle], title);
    }
    if (family === "dashboard") groupStory(copied, id, "design-dashboard", [title, greeting, subtitle], title);
    // Editorial/campaign/event families use an intentional, full-width hero;
    // no family uses a side-by-side story layout.
    if (["editorial", "spotlight", "showcase", "ticket", "invitation"].includes(family)) {
        promoteHero(copied, id, title, subtitle);
    }
    return { family, body: copied };
}
