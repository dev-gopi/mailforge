
import type {
    EmailDocument,
    EmailNode,
} from "@mailforge/core";

import type {
    ResolvedEmailBrand,
} from "../config/EmailConfig.js";

import type {
    ResolvedEmailLayout,
} from "./Layout.types.js";

/**
 * Collect IDs to avoid collisions between
 * user components and generated components.
 */
function collectIds(
    document: EmailDocument,
): Set<string> {
    const ids = new Set<string>();

    const walk = (node: EmailNode): void => {
        ids.add(node.id);
        node.children?.forEach(walk);
    };

    if (document.header) walk(document.header);
    document.body.forEach(walk);
    if (document.footer) walk(document.footer);
    if (document.copyright) walk(document.copyright);

    return ids;
}

function createId(
    ids: Set<string>,
    base: string,
): string {
    let id = base;
    let suffix = 1;

    while (ids.has(id)) {
        id = `${base}-${suffix++}`;
    }

    ids.add(id);
    return id;
}

function interpolateCopyright(
    text: string,
    year: number,
    brand: string,
): string {
    return text
        .replaceAll("{year}", String(year))
        .replaceAll("{brand}", brand);
}

/**
 * Add missing default layout sections.
 *
 * A supplied header/footer/copyright is preserved.
 * Disabled sections are removed for this render.
 */
export function applyDefaultLayout(
    source: EmailDocument,
    brand: ResolvedEmailBrand,
    layout: ResolvedEmailLayout,
): EmailDocument {
    const document = structuredClone(source);
    const ids = collectIds(document);

    // HEADER
    if (!layout.header.enabled) {
        delete document.header;
    } else if (!document.header) {
        const children: EmailNode[] = [];

        const logo = layout.header.logo ?? brand.logo;

        if (logo) {
            children.push({
                id: createId(ids, "mf-auto-header-logo"),
                type: "image",
                props: {
                    src: logo,
                    alt: `${brand.name} logo`,
                },
                styles: { textAlign: "center", padding: "4px 0 12px" },
            });
        }

        children.push({
            id: createId(ids, "mf-auto-header-title"),
            type: "heading",
            props: {
                text: layout.header.title ?? brand.name,
                level: 2,
            },
            attrs: { "data-mf-style": "brand-title" },
            styles: { textAlign: "center" },
        });

        children.push({
            id: createId(ids, "mf-auto-header-rule"),
            type: "divider",
            attrs: { "data-mf-style": "brand-rule" },
        });

        document.header = {
            id: createId(ids, "mf-auto-header"),
            type: "header",
            attrs: {
                "data-mailforge": "header",
                ...layout.header.attrs,
            },
            children,
        };
    }

    // FOOTER
    if (!layout.footer.enabled) {
        delete document.footer;
    } else if (!document.footer) {
        const children: EmailNode[] = [
            {
                id: createId(ids, "mf-auto-footer-divider"),
                type: "divider",
                attrs: { "data-mf-style": "divider" },
            },
        ];

        children.push({
            id: createId(ids, "mf-auto-footer-message"),
            type: "text",
            attrs: { "data-mf-style": "footer-note" },
            props: {
                text: layout.footer.message ??
                    `Sent by ${brand.name}`,
            },
            styles: {
                textAlign: "center",
            },
        });

        const email = layout.footer.supportEmail ??
            brand.supportEmail;

        if (email) {
            children.push({
                id: createId(ids, "mf-auto-footer-support"),
                type: "text",
                attrs: { "data-mf-style": "footer-note" },
                props: {
                    text: `Support: ${email}`,
                },
                styles: {
                    textAlign: "center",
                },
            });
        }

        document.footer = {
            id: createId(ids, "mf-auto-footer"),
            type: "footer",
            attrs: {
                "data-mailforge": "footer",
                ...layout.footer.attrs,
            },
            children,
        };
    }

    // COPYRIGHT
    if (!layout.copyright.enabled) {
        delete document.copyright;
    } else if (!document.copyright) {
        const year = layout.copyright.year === "auto"
            ? new Date().getFullYear()
            : layout.copyright.year;

        document.copyright = {
            id: createId(ids, "mf-auto-copyright"),
            type: "copyright",
            props: {
                text: interpolateCopyright(
                    layout.copyright.text,
                    year,
                    brand.name,
                ),
            },
            attrs: {
                "data-mailforge": "copyright",
                ...layout.copyright.attrs,
            },
        };
    }

    return document;
}
