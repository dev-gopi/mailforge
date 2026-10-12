import type { EmailDocument } from "@mailforge/core";

import {
  createTemplateDocument,
  contentHeading,
  contentParagraph,
  mutedParagraph,
  actionButton,
  panel,
} from "../shared/TemplateNodes.js";

export function buildWelcomeTemplate(): EmailDocument {
  return createTemplateDocument(
    "welcome",
    "Welcome, {{user.firstName}}!",
    "Your account is ready.",
    [
      {
        id: "welcome-icon",
        type: "text",
        props: { text: "✓" },
        styles: {
          backgroundColor: "#f0fdf4",
          color: "#16a34a",
          fontSize: 28,
          textAlign: "center",
          padding: "12px",
        },
      },

      contentHeading(
        "welcome-heading",
        "Welcome to your new workspace.",
      ),
      contentParagraph(
        "welcome-greeting",
        "Hi {{user.firstName}},",
      ),
      contentParagraph(
        "welcome-description",
        "Your account is officially ready. We're excited to have you here " +
          "and can't wait to see what you create.",
      ),
      contentParagraph(
        "welcome-start",
        "Everything you need to get started is just one click away.",
      ),

      actionButton("welcome-action", "Open Your Dashboard", "{{actionUrl}}"),

      panel("welcome-tip", [
        {
          id: "welcome-tip-heading",
          type: "heading",
          props: { text: "A little tip to get started" },
          styles: {
            fontSize: 14,
            fontWeight: "bold",
            color: "#111827",
            padding: "0 0 8px",
          },
        },
        {
          id: "welcome-tip-body",
          type: "text",
          props: {
            text: "Take a moment to explore your dashboard and personalize " +
              "your workspace.",
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
        "welcome-support",
        "Need help? Contact support and we'll be happy to help.",
      ),
      mutedParagraph(
        "welcome-signoff",
        "Cheers,",
      ),
      mutedParagraph(
        "welcome-team",
        "The team",
      ),
    ],
  );
}
