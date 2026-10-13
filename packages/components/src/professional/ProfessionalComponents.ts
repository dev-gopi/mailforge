import { z } from "zod";
import type { EmailNode } from "@mailforge/core";
import type { ReusableComponentDefinition } from "../contracts/ComponentRenderer.types.js";
import type { ComponentCatalog } from "../registry/ComponentCatalog.js";

const url = z.string().url().refine(value => /^https?:\/\//i.test(value), "HTTP(S) URL required");
const content = z.string().min(1).max(1500);

function textNode(id: string, text: string, role: string): EmailNode {
    return { id, type: "text", props: { text }, attrs: { "data-mf-style": role } };
}
function headingNode(id: string, text: string): EmailNode {
    return { id, type: "heading", props: { text, level: 2 }, attrs: { "data-mf-style": "title" } };
}
function wrap(id: string, nodes: EmailNode[]): EmailNode {
    return {
        id,
        type: "section",
        children: [{ id: `${id}-column`, type: "column", children: nodes }],
    };
}

export function createHeroSectionDefinition(): ReusableComponentDefinition {
    const schema = z.object({
        title: z.string().min(1).max(160),
        description: content,
        actionText: z.string().min(1).max(80).optional(),
        actionUrl: url.optional(),
    }).strict().refine(v => Boolean(v.actionText) === Boolean(v.actionUrl), "Action text and URL must be supplied together");
    return {
        name: "mf-hero-section", version: "1.0.0", allowChildren: false, schema,
        description: "Theme-aware email hero with optional primary CTA",
        render(props, context) {
            const v = schema.parse(props);
            const nodes = [headingNode(`${context.nodeId}-title`, v.title), textNode(`${context.nodeId}-body`, v.description, "body")];
            if (v.actionText && v.actionUrl) {
                nodes.push({ id: `${context.nodeId}-action`, type: "button", props: { text: v.actionText, href: v.actionUrl }, attrs: { "data-mf-style": "primary-action" } });
            }
            return wrap(context.nodeId, nodes);
        },
    };
}

export function createStatisticBlockDefinition(): ReusableComponentDefinition {
    const schema = z.object({ label: z.string().min(1).max(120), value: z.string().min(1).max(100), detail: z.string().max(240).optional() }).strict();
    return {
        name: "mf-statistic-block", version: "1.0.0", allowChildren: false, schema,
        description: "Theme-aware metric with optional explanatory note",
        render(props, context) {
            const v = schema.parse(props);
            const nodes: EmailNode[] = [
                textNode(`${context.nodeId}-label`, v.label, "eyebrow"),
                headingNode(`${context.nodeId}-value`, v.value),
            ];
            if (v.detail) nodes.push(textNode(`${context.nodeId}-detail`, v.detail, "muted"));
            return wrap(context.nodeId, nodes);
        },
    };
}

export function createProgressTimelineDefinition(): ReusableComponentDefinition {
    const schema = z.object({
        title: z.string().min(1).max(160).optional(),
        steps: z.array(z.object({ label: z.string().min(1).max(120), description: z.string().max(300).optional() }).strict()).min(1).max(12),
        currentStep: z.number().int().min(1).max(12),
    }).strict().refine(v => v.currentStep <= v.steps.length, "Current step must exist");
    return {
        name: "mf-progress-timeline", version: "1.0.0", allowChildren: false, schema,
        description: "Email-safe readable status timeline without flexbox or CSS grid",
        render(props, context) {
            const v = schema.parse(props);
            const nodes: EmailNode[] = v.title ? [headingNode(`${context.nodeId}-title`, v.title)] : [];
            for (const [index, step] of v.steps.entries()) {
                const status = index + 1 < v.currentStep ? "Completed" : index + 1 === v.currentStep ? "Current" : "Upcoming";
                nodes.push(textNode(`${context.nodeId}-step-${index + 1}`, `${index + 1}. ${step.label} — ${status}${step.description ? `: ${step.description}` : ""}`, index + 1 > v.currentStep ? "muted" : "body"));
            }
            return wrap(context.nodeId, nodes);
        },
    };
}

export function createCompanySignatureDefinition(): ReusableComponentDefinition {
    const schema = z.object({ name: z.string().min(1).max(140), title: z.string().max(140).optional(), organization: z.string().min(1).max(140), supportEmail: z.string().email().optional() }).strict();
    return {
        name: "mf-company-signature", version: "1.0.0", allowChildren: false, schema,
        description: "Consistent, readable and optional company signature",
        render(props, context) {
            const v = schema.parse(props);
            return wrap(context.nodeId, [
                textNode(`${context.nodeId}-name`, v.name, "body"),
                textNode(`${context.nodeId}-details`, [v.title, v.organization].filter(Boolean).join(" · "), "muted"),
                ...(v.supportEmail ? [textNode(`${context.nodeId}-support`, `Support: ${v.supportEmail}`, "muted")] : []),
            ]);
        },
    };
}

export const PROFESSIONAL_COMPONENT_NAMES = [
    "mf-hero-section", "mf-statistic-block", "mf-progress-timeline", "mf-company-signature",
] as const;

export function getProfessionalComponentDefinitions(): ReusableComponentDefinition[] {
    return [
        createHeroSectionDefinition(), createStatisticBlockDefinition(),
        createProgressTimelineDefinition(), createCompanySignatureDefinition(),
    ];
}
/** Explicit registration avoids breaking existing component counts and override APIs. */
export function registerProfessionalComponents(catalog: ComponentCatalog): void {
    for (const definition of getProfessionalComponentDefinitions()) catalog.register(definition);
}
