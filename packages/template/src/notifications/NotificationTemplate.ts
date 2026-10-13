import type { EmailDocument } from "@mailforge/core";

import {
  createTemplateDocument,
  contentHeading,
  contentParagraph,
  mutedParagraph,
  actionButton,
  panel,
} from "../shared/TemplateNodes.js";

export function buildNotificationTemplate(): EmailDocument {
  return createTemplateDocument(
    "notification",
    "{{title}}",
    "You have a new notification.",
    [
      contentHeading("notification-heading", "{{title}}"),

      contentParagraph("notification-message", "{{message}}"),

      actionButton("notification-action", "View Details", "{{actionUrl}}"),
      panel("notification-followup", [
        {
          id: "notification-followup-text",
          type: "text",
          props: {
            text: "You can review the full details at any time from your " +
              "account.",
          },
          styles: {
            fontSize: 13,
            lineHeight: "22px",
            padding: "0",
          },
        },
      ]),
      mutedParagraph(
        "notification-support",
        "If you have questions, contact our support team.",
      ),
    ],
  );
}
