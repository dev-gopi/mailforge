import type { EmailDocument } from "@mailforge/core";

import {
  createTemplateDocument,
  heading,
  paragraph,
  actionButton,
} from "../shared/TemplateNodes.js";

export function buildWelcomeTemplate(): EmailDocument {
  return createTemplateDocument(
    "welcome",
    "Welcome, {{user.firstName}}!",
    "Your account is ready.",
    [
      heading("welcome-heading", "Welcome, {{user.firstName}}!"),

      paragraph(
        "welcome-description",
        "Your account is ready. " + "We're glad to have you with us.",
      ),

      actionButton("welcome-action", "Open Your Dashboard", "{{actionUrl}}"),

      paragraph(
        "welcome-security-note",
        "If you did not create this account, " + "please contact support.",
      ),
    ],
  );
}
