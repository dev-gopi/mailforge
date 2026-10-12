import type { EmailDocument, EmailNode } from "@mailforge/core";

import {
  BUILTIN_TEMPLATE_NAMES,
  type BuiltinTemplateName,
} from "./TemplateData.js";

function heading(id: string, text: string): EmailNode {
  return {
    id,
    type: "heading",
    props: { text },
  };
}

function paragraph(id: string, text: string): EmailNode {
  return {
    id,
    type: "text",
    props: { text },
  };
}

function button(id: string, text: string, href: string): EmailNode {
  return {
    id,
    type: "button",
    props: { text, href },
  };
}

function document(
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

const builders: Record<BuiltinTemplateName, () => EmailDocument> = {
  welcome: () =>
    document(
      "welcome",
      "Welcome, {{user.firstName}}!",
      "Your account is ready.",
      [
        heading("welcome-heading", "Welcome, {{user.firstName}}!"),
        paragraph(
          "welcome-description",
          "Your account is ready. " + "We're glad to have you with us.",
        ),
        button("welcome-action", "Open Your Dashboard", "{{actionUrl}}"),
        paragraph(
          "welcome-security-note",
          "If you did not create this account, " + "please contact support.",
        ),
      ],
    ),

  otp: () =>
    document(
      "otp",
      "Your verification code",
      "Your code expires in {{expiresInMinutes}} minutes.",
      [
        heading("otp-heading", "Verify Your Identity"),
        paragraph(
          "otp-instructions",
          "Use the following one-time code " + "to complete verification.",
        ),
        heading("otp-code", "{{code}}"),
        paragraph(
          "otp-expiration",
          "This code expires in " + "{{expiresInMinutes}} minutes.",
        ),
        paragraph(
          "otp-security-note",
          "Never share this code. If you did not " +
            "request it, you can ignore this email.",
        ),
      ],
    ),

  "password-reset": () =>
    document(
      "password-reset",
      "Reset your password",
      "Your password reset request expires in " +
        "{{expiresInMinutes}} minutes.",
      [
        heading("password-reset-heading", "Reset Your Password"),
        paragraph("password-reset-greeting", "Hello {{user.firstName}},"),
        paragraph(
          "password-reset-description",
          "We received a request to reset your password.",
        ),
        button("password-reset-action", "Reset Password", "{{resetUrl}}"),
        paragraph(
          "password-reset-expiration",
          "This link expires in " + "{{expiresInMinutes}} minutes.",
        ),
        paragraph(
          "password-reset-security",
          "If you did not request this change, " +
            "you can ignore this email. " +
            "Do not share your reset link.",
        ),
      ],
    ),

  invitation: () =>
    document(
      "invitation",
      "Invitation to {{organizationName}}",
      "{{inviterName}} invited you to join.",
      [
        heading("invitation-heading", "You're Invited!"),
        paragraph("invitation-greeting", "Hello {{invitee.firstName}},"),
        paragraph(
          "invitation-description",
          "{{inviterName}} has invited you to join " + "{{organizationName}}.",
        ),
        button("invitation-action", "Accept Invitation", "{{inviteUrl}}"),
        paragraph(
          "invitation-note",
          "If you were not expecting this invitation, " +
            "you can ignore this message.",
        ),
      ],
    ),

  notification: () =>
    document("notification", "{{title}}", "You have a new notification.", [
      heading("notification-heading", "{{title}}"),
      paragraph("notification-message", "{{message}}"),
      button("notification-action", "View Details", "{{actionUrl}}"),
    ]),
};

/**
 * Return a new document on every call.
 *
 * Developers can safely customize the result
 * without changing the built-in source.
 */
export function getBuiltinTemplate(name: BuiltinTemplateName): EmailDocument {
  return builders[name]();
}

export function listBuiltinTemplates(): BuiltinTemplateName[] {
  return [...BUILTIN_TEMPLATE_NAMES];
}
