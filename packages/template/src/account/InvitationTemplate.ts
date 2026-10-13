import type { EmailDocument } from "@mailforge/core";

import {
  createTemplateDocument,
  contentHeading,
  contentParagraph,
  mutedParagraph,
  actionButton,
  panel,
} from "../shared/TemplateNodes.js";

export function buildInvitationTemplate(): EmailDocument {
  return createTemplateDocument(
    "invitation",
    "Invitation to {{organizationName}}",
    "{{inviterName}} invited you to join.",
    [
      {
        id: "invitation-icon",
        type: "text",
        props: { text: "✦" },
        attrs: { "data-mf-style": "status-icon" },
      },
      contentHeading("invitation-heading", "You're Invited!"),

      contentParagraph("invitation-greeting", "Hello {{invitee.firstName}},"),

      contentParagraph(
        "invitation-description",
        "{{inviterName}} has invited you to join " + "{{organizationName}}.",
      ),

      actionButton("invitation-action", "Accept Invitation", "{{inviteUrl}}"),

      panel("invitation-details", [
        {
          id: "invitation-details-text",
          type: "text",
          props: {
            text: "Join your organization to collaborate, share work, and " +
              "get started with your new workspace.",
          },
          styles: {
            fontSize: 13,
            lineHeight: "22px",
            padding: "0",
          },
        },
      ]),
      mutedParagraph(
        "invitation-note",
        "If you were not expecting this invitation, " +
          "you can ignore this message.",
      ),
    ],
  );
}
