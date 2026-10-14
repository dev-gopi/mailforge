/** Gmail clips message bodies larger than 102KB (102 * 1024 bytes) */
export const GMAIL_MAX_BODY_BYTES = 102 * 1024;

export interface MockSentEmail {
  to?: string | string[] | undefined;
  from?: string | undefined;
  subject?: string | undefined;
  html?: string | undefined;
  text?: string | undefined;
  headers?: Record<string, string> | undefined;
  sentAt: Date;
}

export interface MockTransport {
  sendMail(mail: Partial<MockSentEmail>): Promise<{ messageId: string; accepted: string[] }>;
  getSentEmails(): MockSentEmail[];
  getLatestEmail(): MockSentEmail | undefined;
  clear(): void;
  assertSentCount(count: number): void;
}

/**
 * Asserts that the rendered email HTML contains the specified substring.
 */
export function assertEmailContains(html: string, text: string): void {
  if (typeof html !== "string") {
    throw new TypeError("assertEmailContains expects a string for the email HTML");
  }
  if (!html.includes(text)) {
    throw new Error(`Expected email output to contain: "${text}"`);
  }
}

/**
 * Asserts that the rendered email HTML does NOT contain the specified substring.
 */
export function assertEmailNotContains(html: string, text: string): void {
  if (typeof html !== "string") {
    throw new TypeError("assertEmailNotContains expects a string for the email HTML");
  }
  if (html.includes(text)) {
    throw new Error(`Expected email output NOT to contain: "${text}"`);
  }
}

/**
 * Asserts that the rendered email HTML matches the given regular expression pattern.
 */
export function assertEmailMatches(html: string, pattern: RegExp): void {
  if (!pattern.test(html)) {
    throw new Error(`Expected email output to match pattern: ${pattern}`);
  }
}

/**
 * Asserts that email output has basic structural validity for HTML emails:
 * - Proper DOCTYPE declaration
 * - Matching <html>, <head>, and <body> tags
 * - No forbidden dangerous tags (<script>, <iframe>)
 */
export function assertEmailValidHtml(html: string): void {
  if (!html || typeof html !== "string") {
    throw new Error("Email HTML is empty or not a string");
  }

  const lower = html.toLowerCase();
  if (!lower.includes("<!doctype html")) {
    throw new Error("Missing DOCTYPE declaration in email HTML");
  }
  if (!lower.includes("<html") || !lower.includes("</html>")) {
    throw new Error("Missing <html> or </html> tag in email HTML");
  }
  if (!lower.includes("<body") || !lower.includes("</body>")) {
    throw new Error("Missing <body> or </body> tag in email HTML");
  }

  if (lower.includes("<script") || lower.includes("</script>")) {
    throw new Error("Forbidden <script> tag found in email HTML");
  }
  if (lower.includes("<iframe") || lower.includes("</iframe>")) {
    throw new Error("Forbidden <iframe> tag found in email HTML");
  }
}

/**
 * Asserts that the email HTML byte size is within email client budget (default 102KB for Gmail).
 */
export function assertEmailSizeWithinBudget(
  html: string,
  maxBytes: number = GMAIL_MAX_BODY_BYTES,
): void {
  const byteLength = new TextEncoder().encode(html).length;
  if (byteLength > maxBytes) {
    throw new Error(
      `Email HTML size (${byteLength} bytes) exceeds maximum budget (${maxBytes} bytes / ${(maxBytes / 1024).toFixed(1)} KB). Gmail may clip this message.`,
    );
  }
}

/**
 * Asserts that the email rendering result contains a valid non-empty subject.
 */
export function assertEmailHasSubject(
  result: { subject?: string },
  expected?: string | RegExp,
): void {
  if (!result || !result.subject || !result.subject.trim()) {
    throw new Error("Email result does not contain a valid non-empty subject");
  }

  if (expected instanceof RegExp) {
    if (!expected.test(result.subject)) {
      throw new Error(`Subject "${result.subject}" does not match pattern: ${expected}`);
    }
  } else if (typeof expected === "string") {
    if (!result.subject.includes(expected)) {
      throw new Error(`Subject "${result.subject}" does not contain expected text: "${expected}"`);
    }
  }
}

/**
 * Asserts that the email HTML contains an unsubscribe mechanism or link.
 */
export function assertEmailHasUnsubscribe(html: string): void {
  const lower = html.toLowerCase();
  const hasUnsub =
    lower.includes("unsubscribe") ||
    lower.includes("opt-out") ||
    lower.includes("email preferences");

  if (!hasUnsub) {
    throw new Error("Email HTML does not contain an unsubscribe or email preferences link");
  }
}

/**
 * Extracts all href attribute URLs from anchor tags in email HTML.
 */
export function extractEmailLinks(html: string): string[] {
  const matches = html.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi);
  const links: string[] = [];
  for (const match of matches) {
    if (match[1]) {
      links.push(match[1]);
    }
  }
  return links;
}

/**
 * Asserts that all links in the email HTML use safe schemes (http, https, mailto, tel, or anchors).
 */
export function assertEmailLinksSafe(html: string): void {
  const links = extractEmailLinks(html);
  for (const link of links) {
    const trimmed = link.trim().toLowerCase();
    if (
      trimmed.startsWith("javascript:") ||
      trimmed.startsWith("vbscript:") ||
      trimmed.startsWith("data:") ||
      trimmed.startsWith("file:")
    ) {
      throw new Error(`Unsafe URL scheme detected in email link: "${link}"`);
    }
  }
}

/**
 * Creates an in-memory mock email transport for testing email delivery pipelines.
 */
export function createMockTransport(): MockTransport {
  const sentEmails: MockSentEmail[] = [];

  return {
    async sendMail(mail: Partial<MockSentEmail>) {
      const entry: MockSentEmail = {
        to: mail.to,
        from: mail.from,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        headers: mail.headers,
        sentAt: new Date(),
      };
      sentEmails.push(entry);
      const recipient = Array.isArray(mail.to) ? mail.to : [mail.to ?? "test@example.com"];
      return {
        messageId: `<mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@mailforge.mock>`,
        accepted: recipient.filter(Boolean) as string[],
      };
    },

    getSentEmails(): MockSentEmail[] {
      return [...sentEmails];
    },

    getLatestEmail(): MockSentEmail | undefined {
      return sentEmails[sentEmails.length - 1];
    },

    clear(): void {
      sentEmails.length = 0;
    },

    assertSentCount(count: number): void {
      if (sentEmails.length !== count) {
        throw new Error(`Expected ${count} emails to be sent, but recorded ${sentEmails.length}`);
      }
    },
  };
}
