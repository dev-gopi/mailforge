import type { EmailDocument, EmailNode } from "@mailforge/core";

/** Shared safe node shapes for authored templates; callers still control all styles. */
export type TemplateNodeStyles = NonNullable<EmailNode["styles"]>;

/**
 * Every packaged template uses semantic roles, rather than hardcoding a
 * particular brand's color, font, margins or border radius. The email layer
 * resolves these roles against the selected, validated theme AFTER patches.
 * Node IDs and the document schema remain backward compatible.
 */
export type TemplateRole =
  | "title" | "body" | "muted" | "eyebrow" | "accent-strip" | "primary-action"
  | "quiet-action" | "divider" | "panel-outer" | "panel-inner"
  | "status-icon" | "promotional-code"
  | "hero-title" | "hero-subtitle" | "section-title"
  | "brand-title" | "brand-rule" | "footer-note"
  | "success-note" | "warning-note" | "danger-note"
  | "design-kicker" | "design-badge" | "design-ornament" | "design-hero"
  | "design-grid" | "design-grid-card" | "design-security-note"
  | "design-record" | "design-ledger" | "design-route" | "design-conversation"
  | "design-alert" | "design-dashboard";

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

/** Create a styled text leaf without duplicating the EmailNode boilerplate. */
export function styledText(
  id: string,
  text: string,
  styles: TemplateNodeStyles,
  role?: string,
): EmailNode {
  return {
    id,
    type: "text",
    props: { text },
    styles,
    ...(role ? { attrs: { "data-mf-style": role } } : {}),
  };
}

/** Build the common section → one-column → leaf composition used by templates. */
export function singleColumnSection(
  id: string,
  children: EmailNode[],
  styles: TemplateNodeStyles,
  attrs?: Record<string, string>,
): EmailNode {
  return {
    id,
    type: "section",
    styles,
    ...(attrs ? { attrs } : {}),
    children: [{ id: `${id}-column`, type: "column", children }],
  };
}

/** Backward-compatible shorthand for an authored section with padding and surface color. */
export function contentSection(
  id: string,
  children: EmailNode[],
  padding: string,
  backgroundColor?: string,
  attrs?: Record<string, string>,
): EmailNode {
  return singleColumnSection(
    id,
    children,
    { padding, ...(backgroundColor ? { backgroundColor } : {}) },
    attrs,
  );
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
