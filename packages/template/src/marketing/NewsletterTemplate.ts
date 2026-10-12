import { z } from "zod";

import type {
    EmailDocument,
    EmailNode,
} from "@mailforge/core";

import {
    createTemplateDocument,
    contentHeading,
    contentParagraph,
    mutedParagraph,
    actionButton,
} from "../shared/TemplateNodes.js";

const text = (max: number) =>
    z.string().min(1).max(max).refine(
        (val) => val.trim().length > 0 && !/\p{Cc}/u.test(val),
        "Must contain valid non-empty text",
    );

const httpsUrl = z.string().min(1).max(2048).refine((val) => {
    try {
        const url = new URL(val);
        return (
            url.protocol === "https:" &&
            url.hostname.length > 0 &&
            !url.username &&
            !url.password
        );
    } catch {
        return false;
    }
}, "Must be an HTTPS URL without credentials");

const featuredArticleSchema = z.object({
    title: text(160),
    description: text(1000),
    articleUrl: httpsUrl,
    author: text(80).optional(),
}).strict();

const storySchema = z.object({
    title: text(160),
    description: text(1000).optional(),
    articleUrl: httpsUrl,
}).strict();

export const newsletterSchema = z.object({
    issue: text(60),
    title: text(160),
    summary: text(1000),
    featured: featuredArticleSchema,
    stories: z.array(storySchema).max(5).optional(),
    unsubscribeUrl: httpsUrl,
}).strict();

export type NewsletterData = z.infer<typeof newsletterSchema>;

export function buildNewsletterTemplate(
    data?: NewsletterData,
): EmailDocument {
    if (data) {
        newsletterSchema.parse(data);
    }

    const issue = data?.issue ?? "{{newsletter.issue}}";
    const title = data?.title ?? "{{newsletter.title}}";
    const summary = data?.summary ?? "{{newsletter.summary}}";

    const body: EmailNode[] = [
        contentHeading("newsletter-title", title),
        mutedParagraph("newsletter-issue", `Issue: ${issue}`),
        contentParagraph("newsletter-summary", summary),
    ];

    if (data) {
        body.push({
            id: "featured-article",
            type: "mf-content-card",
            props: {
                title: data.featured.title,
                description: data.featured.description + (data.featured.author ? ` — By ${data.featured.author}` : ""),
                actionLabel: "Read Full Article",
                actionUrl: data.featured.articleUrl,
            },
        });

        if (data.stories && data.stories.length > 0) {
            body.push(contentHeading("stories-heading", "More In This Issue"));

            data.stories.forEach((story, idx) => {
                body.push(
                    contentHeading(`story-${idx}-title`, story.title),
                );
                if (story.description) {
                    body.push(contentParagraph(`story-${idx}-desc`, story.description));
                }
                body.push(
                    actionButton(`story-${idx}-link`, "Read Story", story.articleUrl),
                );
            });
        }
    } else {
        body.push(
            contentParagraph("featured-preview", "Featured story and digest items."),
            actionButton("featured-action", "Read Full Story", "{{newsletter.featured.articleUrl}}"),
        );
    }

    body.push(
        mutedParagraph("unsubscribe-text", "You received this email because you subscribed to our newsletter."),
        actionButton("unsubscribe-action", "Unsubscribe", data?.unsubscribeUrl ?? "{{newsletter.unsubscribeUrl}}"),
    );

    return createTemplateDocument(
        "newsletter",
        data?.title ?? "{{newsletter.title}}",
        `MailForge Newsletter - ${issue}`,
        body,
    );
}

