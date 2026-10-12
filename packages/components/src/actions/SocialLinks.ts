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
        "facebook",
        "instagram",
        "twitter",
        "threads",
        "tiktok",
        "github",
        "linkedin",
        "discord",
        "youtube",
        "reddit",
        "telegram",
        "whatsapp",
        "mastodon",
        "website",
    ]),
    url: z.string().min(1).max(2048),
    label: z.string().min(1).max(60).optional(),
    icon: z.string().min(1).max(4).optional(),
    fallbackIcon: z.string().min(1).max(4).optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
}).strict();

const schema = z.object({
    links: z.array(linkSchema).min(1).max(8),
}).strict();

const DEFAULT_LABELS: Record<string, string> = {
    facebook: "Facebook",
    instagram: "Instagram",
    twitter: "Twitter",
    threads: "Threads",
    tiktok: "TikTok",
    github: "GitHub",
    linkedin: "LinkedIn",
    discord: "Discord",
    youtube: "YouTube",
    reddit: "Reddit",
    telegram: "Telegram",
    whatsapp: "WhatsApp",
    mastodon: "Mastodon",
    website: "Website",
};

const ICONS: Record<string, string> = {
    facebook: "f",
    instagram: "IG",
    twitter: "X",
    threads: "@",
    tiktok: "TT",
    github: "GH",
    linkedin: "in",
    discord: "DS",
    youtube: "YT",
    reddit: "rd",
    telegram: "TG",
    whatsapp: "WA",
    mastodon: "MS",
    website: "WEB",
};

const FALLBACK_ICONS: Record<string, string> = {
    facebook: "f",
    instagram: "◎",
    twitter: "X",
    threads: "@",
    tiktok: "♪",
    github: "G",
    linkedin: "i",
    discord: "D",
    youtube: "▶",
    reddit: "r/",
    telegram: "➤",
    whatsapp: "◔",
    mastodon: "m",
    website: "↗",
};

const COLORS: Record<string, string> = {
    facebook: "#1877f2",
    instagram: "#e1306c",
    twitter: "#111827",
    threads: "#111827",
    tiktok: "#111827",
    github: "#24292f",
    linkedin: "#0a66c2",
    discord: "#5865f2",
    youtube: "#ff0000",
    reddit: "#ff4500",
    telegram: "#229ed9",
    whatsapp: "#25d366",
    mastodon: "#6364ff",
    website: "#2563eb",
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

            const columns: EmailNode[] = value.links.map((link, index) => {
                const label = link.label ?? DEFAULT_LABELS[link.platform] ?? link.platform;
                const icon = link.icon ?? ICONS[link.platform] ?? "↗";
                const fallbackIcon = link.fallbackIcon ??
                    FALLBACK_ICONS[link.platform] ??
                    "↗";
                const color = link.color ?? COLORS[link.platform] ?? "#2563eb";

                return {
                    id: `${context.nodeId}-column-${index}`,
                    type: "column",
                    styles: {
                        width: "52px",
                    },
                    children: [
                        {
                            id: `${context.nodeId}-link-${index}`,
                            type: "button",
                            props: {
                                text: icon,
                                href: link.url,
                            },
                            attrs: {
                                title: label,
                                "aria-label": label,
                                "data-fallback-icon": fallbackIcon,
                            },
                            styles: {
                                color: "#ffffff",
                                backgroundColor: color,
                                fontSize: 14,
                                fontWeight: 700,
                                lineHeight: "20px",
                                padding: "8px 10px",
                                borderRadius: 7,
                            },
                        },
                    ],
                };
            });

            return {
                id: context.nodeId,
                type: "section",
                styles: {
                    padding: "12px 0 4px",
                },
                children: [
                    ...columns,
                ],
            };
        },
    };
}
