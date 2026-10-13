import type { DeliveryAdapter, DeliveryMessage, DeliveryReceipt } from "./Transport.types.js";

function rejectUnknownResult(provider: string): never {
  throw new Error(`${provider} did not confirm message submission`);
}

/** Structural contract for an application-created Nodemailer transporter. */
export interface NodemailerClient {
  sendMail(message: {
    from: string;
    to: string[];
    replyTo?: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{
    messageId?: string;
    accepted?: readonly (string | { address: string })[];
    rejected?: readonly (string | { address: string })[];
  }>;
}

function resultAddresses(values: readonly (string | { address: string })[] | undefined): string[] | undefined {
  return values?.map(value => typeof value === "string" ? value : value.address);
}

/** No runtime nodemailer dependency: pass createTransport(...) from your app. */
export function createNodemailerAdapter(client: NodemailerClient): DeliveryAdapter {
  if (!client || typeof client.sendMail !== "function") throw new Error("A Nodemailer transporter is required");
  return {
    name: "nodemailer",
    async send(message: DeliveryMessage): Promise<DeliveryReceipt> {
      const result = await client.sendMail({
        from: message.from,
        to: [...message.to],
        ...(message.replyTo === undefined ? {} : { replyTo: message.replyTo }),
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      if (!result || typeof result !== "object") return rejectUnknownResult("Nodemailer");
      const accepted = resultAddresses(result.accepted);
      const rejected = resultAddresses(result.rejected);
      if (accepted?.length === 0 || (rejected && rejected.length === message.to.length)) {
        throw new Error("Nodemailer rejected all recipients");
      }
      if (!result.messageId && !accepted?.length) {
        return rejectUnknownResult("Nodemailer");
      }
      return {
        provider: "nodemailer",
        ...(result.messageId === undefined ? {} : { messageId: result.messageId }),
        ...(accepted === undefined ? {} : { accepted }),
        ...(rejected === undefined ? {} : { rejected }),
      };
    },
  };
}

export interface ResendClient {
  emails: {
    send(message: {
      from: string;
      to: string[];
      replyTo?: string;
      subject: string;
      html: string;
      text: string;
    }): Promise<{ data?: { id?: string } | null; error?: { message?: string } | null }>;
  };
}

/** Pass a configured instance of Resend. This adapter makes no HTTP requests itself. */
export function createResendAdapter(client: ResendClient): DeliveryAdapter {
  if (!client?.emails || typeof client.emails.send !== "function") throw new Error("Resend client is required");
  return {
    name: "resend",
    async send(message): Promise<DeliveryReceipt> {
      const result = await client.emails.send({
        from: message.from,
        to: [...message.to],
        ...(message.replyTo === undefined ? {} : { replyTo: message.replyTo }),
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      if (result?.error) throw new Error(result.error.message ?? "Resend rejected the request");
      if (!result?.data?.id) return rejectUnknownResult("Resend");
      return { provider: "resend", messageId: result.data.id };
    },
  };
}

export interface SendGridClient {
  send(message: {
    from: string;
    to: string[];
    replyTo?: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<readonly [{ statusCode: number; headers?: Record<string, string | undefined> }, ...unknown[]]>;
}

/** Pass a configured @sendgrid/mail-style client. */
export function createSendGridAdapter(client: SendGridClient): DeliveryAdapter {
  if (!client || typeof client.send !== "function") throw new Error("SendGrid client is required");
  return {
    name: "sendgrid",
    async send(message): Promise<DeliveryReceipt> {
      const [response] = await client.send({
        from: message.from,
        to: [...message.to],
        ...(message.replyTo === undefined ? {} : { replyTo: message.replyTo }),
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      if (!response || response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error("SendGrid did not accept the request");
      }
      const messageId = response.headers?.["x-message-id"];
      return { provider: "sendgrid", ...(messageId ? { messageId } : {}) };
    },
  };
}

/** Minimal SES v2 request shape. Construct SendEmailCommand in your application. */
export interface SesV2Request {
  FromEmailAddress: string;
  Destination: { ToAddresses: string[] };
  ReplyToAddresses?: string[];
  Content: {
    Simple: {
      Subject: { Data: string; Charset: "UTF-8" };
      Body: {
        Html: { Data: string; Charset: "UTF-8" };
        Text: { Data: string; Charset: "UTF-8" };
      };
    };
  };
}

/** Dependency-free SES v2 adapter: supply a sender using AWS SESv2Client. */
export function createSesV2Adapter(
  sendEmail: (request: SesV2Request) => Promise<{ MessageId?: string }>,
): DeliveryAdapter {
  if (typeof sendEmail !== "function") throw new Error("SES v2 sender callback is required");
  return {
    name: "sesv2",
    async send(message): Promise<DeliveryReceipt> {
      const request: SesV2Request = {
        FromEmailAddress: message.from,
        Destination: { ToAddresses: [...message.to] },
        ...(message.replyTo === undefined ? {} : { ReplyToAddresses: [message.replyTo] }),
        Content: {
          Simple: {
            Subject: { Data: message.subject, Charset: "UTF-8" },
            Body: {
              Html: { Data: message.html, Charset: "UTF-8" },
              Text: { Data: message.text, Charset: "UTF-8" },
            },
          },
        },
      };
      const response = await sendEmail(request);
      if (!response?.MessageId) return rejectUnknownResult("SES v2");
      return { provider: "sesv2", messageId: response.MessageId };
    },
  };
}
