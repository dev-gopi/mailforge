import type { EmailDocument } from "@mailforge/core";

import {
  createTemplateDocument,
  heading,
  paragraph,
  actionButton,
} from "../shared/TemplateNodes.js";

export function buildPasswordResetTemplate(): EmailDocument {
  return createTemplateDocument(
    "password-reset",
    "Reset your password",
    "Your password reset request expires in " + "{{expiresInMinutes}} minutes.",
    [
      heading("password-reset-heading", "Reset Your Password"),

      paragraph("password-reset-greeting", "Hello {{user.firstName}},"),

      paragraph(
        "password-reset-description",
        "We received a request to reset your password.",
      ),

      actionButton("password-reset-action", "Reset Password", "{{resetUrl}}"),

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
  );
}
