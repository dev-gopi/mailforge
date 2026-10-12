import type { EmailDocument, EmailNode } from "@mailforge/core";

import type { BuiltinTemplateName } from "../TemplateData.js";

export function heading(id: string, text: string): EmailNode {
  return {
    id,
    type: "heading",
    props: { text },
  };
}

export function paragraph(id: string, text: string): EmailNode {
  return {
    id,
    type: "text",
    props: { text },
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
  };
}

export function createTemplateDocument(
  id: BuiltinTemplateName,
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
