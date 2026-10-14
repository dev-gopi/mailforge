import test from "node:test";
import assert from "node:assert/strict";
import { createEmail } from "../../packages/email/dist/index.js";
import {
  assertEmailContains,
  assertEmailNotContains,
  assertEmailValidHtml,
  assertEmailSizeWithinBudget,
  assertEmailHasSubject,
  assertEmailHasUnsubscribe,
  assertEmailLinksSafe,
  createMockTransport,
} from "../../packages/testing/dist/index.js";

test("full end-to-end email rendering and delivery flow", async () => {
  // Step 1: Initialize MailForge engine with brand and options
  const email = createEmail({
    brand: {
      name: "Nexus Cloud",
      primaryColor: "#4f46e5",
      logo: "https://nexus.example.com/logo.png",
    },
    footer: {
      message: "To manage your notifications or unsubscribe, visit your account settings.",
    },
    theme: "modern",
  });

  // Step 2: Render welcome email with dynamic variables
  const recipientName = "Sarah Connor";
  const recipientEmail = "sarah@resistance.org";
  const actionUrl = "https://nexus.example.com/onboarding?token=sec_abc123";

  const result = await email.render("welcome", {
    data: {
      user: { firstName: recipientName },
      actionUrl,
    },
  });

  // Step 3: Validate output structure and subject
  assert.ok(result.html, "Rendered HTML should be non-empty");
  assert.ok(result.text, "Rendered Plain Text should be non-empty");
  assertEmailHasSubject(result, "Welcome");
  assert.match(result.subject, new RegExp(recipientName));

  // Step 4: Validate HTML safety and RFC compliance
  assertEmailValidHtml(result.html);
  assertEmailSizeWithinBudget(result.html, 102400); // 102KB Gmail clipping threshold
  assertEmailHasUnsubscribe(result.html);
  assertEmailLinksSafe(result.html);

  // Step 5: Verify brand and personalized content are rendered
  assertEmailContains(result.html, "Nexus Cloud");
  assertEmailContains(result.html, recipientName);
  assertEmailContains(result.html, actionUrl);
  assertEmailContains(result.text, recipientName);

  // Step 6: Verify dangerous tags and script injection are absent
  assertEmailNotContains(result.html, "<script");
  assertEmailNotContains(result.html, "javascript:");

  // Step 7: Simulate dispatch through testing mock transport
  const transport = createMockTransport();
  const dispatchResult = await transport.sendMail({
    from: "Nexus Cloud <noreply@nexus.example.com>",
    to: recipientEmail,
    subject: result.subject,
    html: result.html,
    text: result.text,
  });

  assert.ok(dispatchResult.messageId);
  assert.deepEqual(dispatchResult.accepted, [recipientEmail]);
  transport.assertSentCount(1);

  const sent = transport.getLatestEmail();
  assert.equal(sent?.to, recipientEmail);
  assert.equal(sent?.subject, result.subject);
});

test("theme switching flow: light vs dark theme styling", async () => {
  const lightEngine = createEmail({ brand: { name: "ThemeCo" }, theme: "modern" });
  const darkEngine = createEmail({ brand: { name: "ThemeCo" }, theme: "dark" });
  const data = {
    user: { firstName: "Alex" },
    actionUrl: "https://example.com/action",
  };

  const [lightOutput, darkOutput] = await Promise.all([
    lightEngine.render("welcome", { data }),
    darkEngine.render("welcome", { data }),
  ]);

  assert.ok(lightOutput.html.length > 0);
  assert.ok(darkOutput.html.length > 0);
  // Dark theme uses dark background colors
  assert.notEqual(lightOutput.html, darkOutput.html);
  assertEmailValidHtml(lightOutput.html);
  assertEmailValidHtml(darkOutput.html);
});

test("security enforcement: rejects unsafe URLs and injection vectors", async () => {
  const email = createEmail({ brand: { name: "SecBrand" } });

  // Unsafe link in theme colors or options should be caught
  await assert.rejects(
    async () => {
      await email.render("welcome", {
        data: {
          user: { firstName: "Hacker" },
          actionUrl: "https://example.com",
        },
        theme: {
          colors: {
            primary: "javascript:alert(1)",
          },
        },
      });
    },
    /Theme colors contains unsafe characters or executable schemes|invalid|error/i,
  );
});
