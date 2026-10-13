import type { EmailDocument, EmailNode } from "@mailforge/core";

/**
 * Every packaged template uses semantic roles, rather than hardcoding a
 * particular brand's color, font, margins or border radius. The email layer
 * resolves these roles against the selected, validated theme AFTER patches.
 * Node IDs and the document schema remain backward compatible.
 */
export type TemplateRole =
  | "title" | "body" | "muted" | "eyebrow" | "primary-action"
  | "quiet-action" | "divider" | "panel-outer" | "panel-inner"
  | "status-icon" | "promotional-code";

export function withRole(node: EmailNode, role: TemplateRole): EmailNode {
  return { ...node, attrs: { ...node.attrs, "data-mf-style": role } };
}

export function heading(id: string, text: string): EmailNode {
  return { id, type: "heading", props: { text } };
}

export function contentHeading(id: string, text: string): EmailNode {
  return withRole(heading(id, text), "title");
}

export function paragraph(id: string, text: string): EmailNode {
  return { id, type: "text", props: { text } };
}

export function contentParagraph(id: string, text: string): EmailNode {
  return withRole(paragraph(id, text), "body");
}

export function mutedParagraph(id: string, text: string): EmailNode {
  return withRole(paragraph(id, text), "muted");
}

export function eyebrow(id: string, text: string): EmailNode {
  return withRole(paragraph(id, text), "eyebrow");
}

export function actionButton(id: string, text: string, href: string): EmailNode {
  return withRole({ id, type: "button", props: { text, href } }, "primary-action");
}

/** A discreet secondary action, suitable for unsubscribe or supporting links. */
export function quietAction(id: string, text: string, href: string): EmailNode {
  return withRole({ id, type: "button", props: { text, href } }, "quiet-action");
}

export function divider(id: string): EmailNode {
  return withRole({ id, type: "divider" }, "divider");
}

export function panel(
  id: string,
  children: EmailNode[],
  backgroundColor?: string,
): EmailNode {
  return withRole({
    id,
    type: "section",
    children: [withRole({
      id: `${id}-column`,
      type: "column",
      ...(backgroundColor ? { styles: { backgroundColor } } : {}),
      children,
    }, "panel-inner")],
  }, "panel-outer");
}

export function createTemplateDocument(
  id: string,
  subject: string,
  preheader: string,
  body: EmailNode[],
): EmailDocument {
  return {
    schemaVersion: "1.0",
    id,
    version: "1.0.0",
    subject,
    preheader,
    metadata: { designSystem: "mailforge-1" },
    body,
  };
}
