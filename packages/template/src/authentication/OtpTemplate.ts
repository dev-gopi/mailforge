
import type { EmailDocument } from "@mailforge/core";

import {
  createTemplateDocument,
  heading,
  paragraph,
} from "../shared/TemplateNodes.js";

export function buildOtpTemplate(): EmailDocument {
  return createTemplateDocument(
    "otp",
    "Your verification code",
    "Your code expires in {{expiresInMinutes}} minutes.",
    [
      heading(
        "otp-heading",
        "Verify Your Identity",
      ),

      paragraph(
        "otp-instructions",
        "Use the following one-time code " +
          "to complete verification.",
      ),

      heading(
        "otp-code",
        "{{code}}",
      ),

      paragraph(
        "otp-expiration",
        "This code expires in " +
          "{{expiresInMinutes}} minutes.",
      ),

      paragraph(
        "otp-security-note",
        "Never share this code. If you did not " +
          "request it, you can ignore this email.",
      ),
    ],
  );
}
