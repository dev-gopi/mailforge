import type { EmailDocument } from "@mailforge/core";

import {
  createTemplateDocument,
  heading,
  paragraph,
  actionButton,
} from "../shared/TemplateNodes.js";

export function buildNotificationTemplate(): EmailDocument {
  return createTemplateDocument(
    "notification",
    "{{title}}",
    "You have a new notification.",
    [
      heading("notification-heading", "{{title}}"),

      paragraph("notification-message", "{{message}}"),

      actionButton("notification-action", "View Details", "{{actionUrl}}"),
    ],
  );
}
