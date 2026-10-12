import { z } from "zod";

import type {
    EmailNode,
} from "@mailforge/core";

import type {
    ReusableComponentDefinition,
} from "../contracts/ComponentRenderer.types.js";

import {
    isSafeHttpsUrl,
} from "../contracts/SafeValue.js";

const linkSchema = z.object({
    platform: z.enum([
        "twitter",
        "github",
        "linkedin",
        "discord",
        "youtube",
        "website",
    ]),
    url: z.string().min(1).max(2048),
    label: z.string().min(1).max(60).optional(),
}).strict();

const schema = z.object({
    links: z.array(linkSchema).min(1).max(8),
}).strict();

const DEFAULT_LABELS: Record<string, string> = {
    twitter: "Twitter",
    github: "GitHub",
    linkedin: "LinkedIn",
    discord: "Discord",
    youtube: "YouTube",
    website: "Website",
};

export function createSocialLinksDefinition(): ReusableComponentDefinition {
    return {
        name: "mf-social-links",
        version: "1.0.0",
        description: "Social media and external links group for email footers",
        allowChildren: false,
        schema,

        render: (props, context) => {
            const value = schema.parse(props);

            for (const link of value.links) {
                if (!isSafeHttpsUrl(link.url)) {
                    throw new Error(
                        `SocialLinks url must be HTTPS without credentials: ${link.url}`,
                    );
                }
            }

            const columnChildren: EmailNode[] = value.links.map((link, index) => {
                const label = link.label ?? DEFAULT_LABELS[link.platform] ?? link.platform;

                return {
                    id: `${context.nodeId}-link-${index}`,
                    type: "button",
                    props: {
                        text: label,
                        href: link.url,
                    },
                    styles: {
                        fontSize: 12,
                        padding: "8px",
                        borderRadius: 4,
                    },
                };
            });

            return {
                id: context.nodeId,
                type: "section",
                styles: {
                    padding: "8px",
                },
                children: [
                    {
                        id: `${context.nodeId}-column`,
                        type: "column",
                        children: columnChildren,
                    },
                ],
            };
        },
    };
}

