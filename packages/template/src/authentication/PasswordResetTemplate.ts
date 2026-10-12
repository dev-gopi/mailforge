import type { EmailDocument } from "@mailforge/core";

import {
  createTemplateDocument,
  contentHeading,
  contentParagraph,
  mutedParagraph,
  actionButton,
  panel,
} from "../shared/TemplateNodes.js";

export function buildPasswordResetTemplate(): EmailDocument {
  return createTemplateDocument(
    "password-reset",
    "Reset your password",
    "Your password reset request expires in " + "{{expiresInMinutes}} minutes.",
    [
      contentHeading("password-reset-heading", "Reset Your Password"),

      contentParagraph("password-reset-greeting", "Hello {{user.firstName}},"),

      contentParagraph(
        "password-reset-description",
        "We received a request to reset your password.",
      ),

      actionButton("password-reset-action", "Reset Password", "{{resetUrl}}"),

      panel("password-reset-expiration-panel", [
        {
          id: "password-reset-expiration",
          type: "text",
          props: {
            text: "This link expires in {{expiresInMinutes}} minutes.",
          },
          styles: {
            fontSize: 13,
            lineHeight: "22px",
            color: "#64748b",
            padding: "0",
          },
        },
      ]),
      mutedParagraph(
        "password-reset-security",
        "If you did not request this change, " +
          "you can ignore this email. " +
          "Do not share your reset link.",
      ),
    ],
  );
}
