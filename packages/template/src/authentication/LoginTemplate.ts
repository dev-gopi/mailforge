import type { EmailDocument } from "@mailforge/core";

import {
  createTemplateDocument,
  contentHeading,
  contentParagraph,
  mutedParagraph,
  actionButton,
  panel,
} from "../shared/TemplateNodes.js";

export function buildLoginTemplate(): EmailDocument {
  return createTemplateDocument(
    "login",
    "Sign in to your account",
    "Use your secure sign-in link to continue.",
    [
      contentHeading("login-heading", "Sign In"),
      contentParagraph("login-greeting", "Hello {{user.firstName}},"),
      contentParagraph(
        "login-description",
        "Use the button below to securely sign in to your account.",
      ),
      actionButton("login-action", "Sign In Securely", "{{loginUrl}}"),
      panel("login-expiration-panel", [
        {
          id: "login-expiration",
          type: "text",
          props: {
            text: "This sign-in link expires in {{expiresInMinutes}} minutes.",
          },
          styles: {
            fontSize: 13,
            lineHeight: "22px",
            padding: "0",
          },
        },
      ]),
      mutedParagraph(
        "login-security",
        "If you did not request this email, you can safely ignore it. " +
          "Never share your sign-in link.",
      ),
    ],
  );
}
