import { z } from "zod";

import type {
    EmailNode,
} from "@mailforge/core";

import type {
    ReusableComponentDefinition,
} from "../contracts/ComponentRenderer.types.js";

import {
    httpsUrlSchema,
} from "../contracts/SafeValue.js";

const brandHeaderSchema = z.object({
    name: z.string().min(1).max(120),
    label: z.string().min(1).max(80),
    backgroundColor: z.string().regex(/^#[0-9a-f]{6}$/i).default("#172a46"),
}).strict();

const statusCardSchema = z.object({
    icon: z.string().min(1).max(8).default("✉"),
    title: z.string().min(1).max(160),
    message: z.string().min(1).max(500),
    backgroundColor: z.string().regex(/^#[0-9a-f]{6}$/i).default("#eef4ff"),
}).strict();

const fullWidthButtonSchema = z.object({
    label: z.string().min(1).max(120),
    href: httpsUrlSchema,
    backgroundColor: z.string().regex(/^#[0-9a-f]{6}$/i).default("#2563eb"),
}).strict();

const legalFooterSchema = z.object({
    copyright: z.string().min(1).max(200),
    address: z.string().min(1).max(200),
    supportUrl: httpsUrlSchema,
    privacyUrl: httpsUrlSchema,
    unsubscribeUrl: httpsUrlSchema,
}).strict();

function escapeMarkup(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function createBrandHeaderDefinition(): ReusableComponentDefinition {
    return {
        name: "mf-brand-header",
        version: "1.0.0",
        description: "Two-column branded email header",
        allowChildren: false,
        schema: brandHeaderSchema,
        render: (props, context) => {
            const value = brandHeaderSchema.parse(props);
            const text = (id: string, content: string, styles: Record<string, string | number>): EmailNode => ({
                id,
                type: "text",
                props: { text: content },
                styles,
            });

            return {
                id: context.nodeId,
                type: "section",
                styles: {
                    backgroundColor: value.backgroundColor,
                    padding: "10px 16px",
                },
                children: [
                    {
                        id: `${context.nodeId}-brand`,
                        type: "column",
                        children: [
                            text(`${context.nodeId}-brand-text`, value.name, {
                                color: "#ffffff",
                                fontSize: 18,
                                fontWeight: "bold",
                            }),
                        ],
                    },
                    {
                        id: `${context.nodeId}-label`,
                        type: "column",
                        children: [
                            text(`${context.nodeId}-label-text`, value.label, {
                                color: "#bfcee3",
                                fontSize: 11,
                                textAlign: "right",
                                letterSpacing: "0.5px",
                            }),
                        ],
                    },
                ],
            };
        },
    };
}

export function createStatusCardDefinition(): ReusableComponentDefinition {
    return {
        name: "mf-status-card",
        version: "1.0.0",
        description: "Centered status card with icon, title, and message",
        allowChildren: false,
        schema: statusCardSchema,
        render: (props, context) => {
            const value = statusCardSchema.parse(props);

            return {
                id: context.nodeId,
                type: "raw-html",
                props: {
                    html: `<div style="margin:0 16px;background:${value.backgroundColor};border-radius:8px;padding:16px;text-align:center">
<div style="color:#2563eb;font-size:30px;line-height:32px">${escapeMarkup(value.icon)}</div>
<div style="color:#172a46;font-size:16px;font-weight:bold;padding-top:4px">${escapeMarkup(value.title)}</div>
<div style="color:#64748b;font-size:14px;padding-top:8px">${escapeMarkup(value.message)}</div>
</div>`,
                },
            };
        },
    };
}

export function createFullWidthButtonDefinition(): ReusableComponentDefinition {
    return {
        name: "mf-full-width-button",
        version: "1.0.0",
        description: "Full-width HTTPS call-to-action",
        allowChildren: false,
        schema: fullWidthButtonSchema,
        render: (props, context) => {
            const value = fullWidthButtonSchema.parse(props);

            return {
                id: context.nodeId,
                type: "raw-html",
                props: {
                    html: `<div style="margin:12px 16px 0">
<a href="${escapeMarkup(value.href)}" style="display:block;background:${value.backgroundColor};border-radius:6px;color:#ffffff;font-size:16px;font-weight:bold;padding:14px 20px;text-align:center;text-decoration:none">${escapeMarkup(value.label)}</a>
</div>`,
                },
            };
        },
    };
}

export function createLegalFooterDefinition(): ReusableComponentDefinition {
    return {
        name: "mf-legal-footer",
        version: "1.0.0",
        description: "Copyright, address, and policy links footer",
        allowChildren: false,
        schema: legalFooterSchema,
        render: (props, context) => {
            const value = legalFooterSchema.parse(props);

            return {
                id: context.nodeId,
                type: "raw-html",
                props: {
                    html: `<div style="background:#f8fafc;margin:0 -1px;padding:12px 16px;text-align:center;color:#64748b;font-size:12px;line-height:22px">
<div>${escapeMarkup(value.copyright)}</div>
<div>${escapeMarkup(value.address)}</div>
<div><a href="${escapeMarkup(value.supportUrl)}" style="color:#6495ed">Contact Support</a> · <a href="${escapeMarkup(value.privacyUrl)}" style="color:#6495ed">Privacy Policy</a> · <a href="${escapeMarkup(value.unsubscribeUrl)}" style="color:#6495ed">Unsubscribe</a></div>
</div>`,
                },
            };
        },
    };
}
