import { describe, expect, it, vi } from "vitest";
import {
  createNodemailerAdapter, createResendAdapter, createSendGridAdapter, createSesV2Adapter,
  sendRenderedEmail,
} from "../src/index.js";
const rendered = { subject: "Test", html: "<p>Hello</p>", text: "Hello" };
const envelope = { from: "system@example.com", to: "user@example.com", replyTo: "help@example.com" };

describe("Provider adapters", () => {
  it("sends both content formats through a Nodemailer-style client", async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: "smtp-1", accepted: ["user@example.com"], rejected: [] });
    const result = await sendRenderedEmail(createNodemailerAdapter({ sendMail }), rendered, envelope);
    expect(result).toEqual({ provider: "nodemailer", messageId: "smtp-1", accepted: ["user@example.com"], rejected: [] });
    expect(sendMail).toHaveBeenCalledWith({ from: envelope.from, to: [envelope.to], replyTo: envelope.replyTo, subject: rendered.subject, html: rendered.html, text: rendered.text });
  });
  it("rejects a Nodemailer response when all recipients are rejected", async () => {
    const adapter = createNodemailerAdapter({ sendMail: async () => ({ messageId: "bad", accepted: [], rejected: [envelope.to] }) });
    await expect(sendRenderedEmail(adapter, rendered, envelope)).rejects.toMatchObject({ code: "DELIVERY_FAILED" });
  });
  it("uses Resend's SDK return ID and rejects returned errors", async () => {
    const send = vi.fn().mockResolvedValue({ data: { id: "resend-1" }, error: null });
    const adapter = createResendAdapter({ emails: { send } });
    await expect(sendRenderedEmail(adapter, rendered, envelope)).resolves.toMatchObject({ provider: "resend", messageId: "resend-1" });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: [envelope.to], html: rendered.html }));
    send.mockResolvedValueOnce({ data: null, error: { message: "not verified" } });
    await expect(sendRenderedEmail(adapter, rendered, envelope)).rejects.toMatchObject({ code: "DELIVERY_FAILED" });
  });
  it("uses SendGrid response status and message ID", async () => {
    const adapter = createSendGridAdapter({ send: async () => [{ statusCode: 202, headers: { "x-message-id": "sg-1" } }] });
    await expect(sendRenderedEmail(adapter, rendered, envelope)).resolves.toMatchObject({ provider: "sendgrid", messageId: "sg-1" });
  });
  it("refuses unsuccessful SendGrid responses", async () => {
    const adapter = createSendGridAdapter({ send: async () => [{ statusCode: 429 }] });
    await expect(sendRenderedEmail(adapter, rendered, envelope)).rejects.toMatchObject({ code: "DELIVERY_FAILED" });
  });
  it("produces a valid SES v2 simple message request", async () => {
    const sender = vi.fn(async () => ({ MessageId: "ses-1" }));
    const adapter = createSesV2Adapter(sender);
    await expect(sendRenderedEmail(adapter, rendered, envelope)).resolves.toMatchObject({ provider: "sesv2", messageId: "ses-1" });
    expect(sender).toHaveBeenCalledWith({
      FromEmailAddress: envelope.from,
      Destination: { ToAddresses: [envelope.to] },
      ReplyToAddresses: [envelope.replyTo],
      Content: { Simple: {
        Subject: { Data: rendered.subject, Charset: "UTF-8" },
        Body: { Html: { Data: rendered.html, Charset: "UTF-8" }, Text: { Data: rendered.text, Charset: "UTF-8" } },
      } },
    });
  });
  it("requires a provider-confirmed SES message ID", async () => {
    const adapter = createSesV2Adapter(async () => ({}));
    await expect(sendRenderedEmail(adapter, rendered, envelope)).rejects.toMatchObject({ code: "DELIVERY_FAILED" });
  });
});
