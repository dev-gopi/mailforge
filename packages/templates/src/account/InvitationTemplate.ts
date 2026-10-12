import type { EmailDocument } from "@mailforge/core";

import {
  createTemplateDocument,
  heading,
  paragraph,
  actionButton,
} from "../shared/TemplateNodes.js";

export function buildInvitationTemplate(): EmailDocument {
  return createTemplateDocument(
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

      actionButton("invitation-action", "Accept Invitation", "{{inviteUrl}}"),

      paragraph(
        "invitation-note",
        "If you were not expecting this invitation, " +
          "you can ignore this message.",
      ),
    ],
  );
}
