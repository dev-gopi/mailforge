
import type { EmailDocument } from "@mailforge/core";

import {
  createTemplateDocument,
  contentHeading,
  contentParagraph,
  mutedParagraph,
  panel,
} from "../shared/TemplateNodes.js";

export function buildOtpTemplate(): EmailDocument {
  const document = createTemplateDocument(
    "otp",
    "Your verification code",
    "Your code expires in {{expiresInMinutes}} minutes.",
    [
      contentHeading(
        "otp-heading",
        "Verify Your Identity",
      ),

      contentParagraph(
        "otp-instructions",
        "Use the following one-time code " +
          "to complete verification.",
      ),

      panel("otp-panel", [
            {
              id: "otp-panel-label",
              type: "text",
              props: {
                text: "YOUR VERIFICATION CODE",
              },
              styles: {
                textAlign: "center",
                color: "#64748b",
                fontSize: 11,
                fontWeight: "bold",
                letterSpacing: "1px",
                padding: "0 0 10px",
              },
            },
            {
              id: "otp-code",
              type: "mf-otp-code",
              props: {
                code: "{{code}}",
              },
            },
            {
              id: "otp-panel-expiration",
              type: "text",
              props: {
                text: "Expires in {{expiresInMinutes}} minutes",
              },
              styles: {
                textAlign: "center",
                color: "#64748b",
                fontSize: 13,
                padding: "10px 0 0",
              },
            },
      ], "#eff6ff"),

      mutedParagraph(
        "otp-security-note",
        "For your security, never share this code with anyone. " +
          "Our team will never ask for your code.",
      ),
    ],
  );

  const headingNode = document.body.find((node) => node.id === "otp-heading");
  if (headingNode) {
    headingNode.styles = {
      ...headingNode.styles,
      textAlign: "center",
    };
  }

  const instructionsNode = document.body.find(
    (node) => node.id === "otp-instructions",
  );
  if (instructionsNode) {
    instructionsNode.styles = {
      ...instructionsNode.styles,
      textAlign: "center",
      color: "#475569",
    };
  }

  document.body.splice(3, 0, {
    id: "otp-divider",
    type: "divider",
    styles: {
      color: "#e2e8f0",
      padding: "8px 0",
    },
  });

  document.body.push({
    id: "otp-not-requested",
    type: "text",
    props: {
      text: "Didn't request this code? You can safely ignore this email.",
    },
    styles: {
      textAlign: "center",
      color: "#64748b",
      fontSize: 13,
      padding: "16px 0 8px",
    },
  });

  return document;
}
