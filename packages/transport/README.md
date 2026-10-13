# `@mailforge/transport` — optional email delivery (Stage 8.4)

MailForge generates an email independently of how it is sent. This optional package delivers an already-rendered `{ subject, html, text }` object. It has **zero mandatory provider dependencies**. The application owns provider credentials, authentication, and authorization.

## SMTP / Nodemailer

Install Nodemailer **in your application**: `pnpm add nodemailer` (and `pnpm add -D @types/nodemailer` for TypeScript users).

```ts
import nodemailer from "nodemailer";
import { createEmail } from "@mailforge/email";
import { createNodemailerAdapter, sendRenderedEmail } from "@mailforge/transport";

const email = createEmail();
const rendered = await email.render("welcome", {
  data: { user: { firstName: "Gopi" }, actionUrl: "https://example.com/dashboard" },
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_PORT === "465",
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
});
const result = await sendRenderedEmail(createNodemailerAdapter(transporter), rendered, {
  from: "notifications@example.com",
  to: "Gopi@example.com",
});
console.log(result.provider, result.messageId);
```

**Never place SMTP/API credentials in template data or the playground.** SMTP delivery is not attempted unless your application explicitly calls `sendRenderedEmail`.

## Resend, SendGrid and AWS SES v2

For other providers, use their SDK from your application:

```ts
import { createResendAdapter, createSendGridAdapter, createSesV2Adapter } from "@mailforge/transport";

const resendAdapter = createResendAdapter(resendClient); // Instance of Resend
const sendGridAdapter = createSendGridAdapter(sendGridClient); // Configured @sendgrid/mail
const sesAdapter = createSesV2Adapter(request => sesClient.send(new SendEmailCommand(request)));
```

`sesClient` is an AWS `SESv2Client`, and `SendEmailCommand` comes from `@aws-sdk/client-sesv2`, installed by the calling application. Check any provider-specific permissions, sender verification, response/rejection semantics, rate limits and SDK version compatibility before production use.

## Queue integration

```ts
import { enqueueRenderedEmail } from "@mailforge/transport";

const queued = await enqueueRenderedEmail(
  { enqueue: async job => { await myQueue.add("mail", job, { jobId: job.idempotencyKey }); return { jobId: job.idempotencyKey }; } },
  rendered,
  { from: "notifications@example.com", to: "Gopi@example.com" },
  "welcome-user-42-2026",
);
```

The application **must implement** durable job storage, authentication, idempotency, safe retries, dead-letter queues and monitoring. The library does not transparently retry sends: a timed-out send may have succeeded, and an automatic retry could duplicate the message.

## Delivery events and security

Use `{ onEvent(event) { ... } }` as the optional fourth argument to `sendRenderedEmail`. Events never contain recipient addresses, email bodies or credentials. The API validates recipients, rejects header injection, enforces plain-text fallback and a 2 MB body budget. Provider responses are not proof of final inbox delivery. Provider webhooks are application concerns.

Tests use fake providers and send **no real emails**. Before sending real messages, obtain sender consent and meet all applicable messaging laws and unsubscribe requirements.
