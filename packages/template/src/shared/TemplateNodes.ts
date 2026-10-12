import type { EmailDocument, EmailNode } from "@mailforge/core";

export function heading(id: string, text: string): EmailNode {
  return {
    id,
    type: "heading",
    props: { text },
  };
}

export function contentHeading(id: string, text: string): EmailNode {
  return {
    ...heading(id, text),
    styles: {
      fontSize: 28,
      lineHeight: "36px",
      fontWeight: "bold",
      color: "#111827",
      padding: "24px 36px 0",
    },
  };
}

export function paragraph(id: string, text: string): EmailNode {
  return {
    id,
    type: "text",
    props: { text },
  };
}

export function contentParagraph(id: string, text: string): EmailNode {
  return {
    ...paragraph(id, text),
    styles: {
      fontSize: 15,
      lineHeight: "25px",
      color: "#475569",
      padding: "22px 36px 0",
    },
  };
}

export function mutedParagraph(id: string, text: string): EmailNode {
  return {
    ...contentParagraph(id, text),
    styles: {
      fontSize: 13,
      lineHeight: "22px",
      color: "#64748b",
      padding: "0 36px 24px",
    },
  };
}

export function actionButton(
  id: string,
  text: string,
  href: string,
): EmailNode {
  return {
    id,
    type: "button",
    props: { text, href },
    styles: {
      backgroundColor: "#111827",
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "bold",
      borderRadius: "7px",
      textAlign: "center",
      padding: "15px 26px",
    },
  };
}

export function divider(id: string): EmailNode {
  return {
    id,
    type: "divider",
    styles: {
      color: "#e5e7eb",
      padding: "8px 36px",
    },
  };
}

export function panel(
  id: string,
  children: EmailNode[],
  backgroundColor = "#f8fafc",
): EmailNode {
  return {
    id,
    type: "section",
    styles: {
      padding: "0 36px 24px",
    },
    children: [{
      id: `${id}-column`,
      type: "column",
      styles: {
        backgroundColor,
        padding: "20px",
      },
      children,
    }],
  };
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
    body,
  };
}
