import { describe, expect, it, vi } from "vitest";
import {
  MailForgeDeliveryError, enqueueRenderedEmail, prepareDeliveryMessage, sendRenderedEmail,
  type DeliveryAdapter,
} from "../src/index.js";

const rendered = {
  subject: "Welcome, Gopi!",
  html: "<strong>Welcome!</strong>",
  text: "Welcome!",
};
const envelope = { from: "alerts@example.com", to: "Gopi@example.com" };

describe("Stage 8.4 — Delivery contracts and safety", () => {
  it("normalizes a rendered email without altering content", () => {
    const result = prepareDeliveryMessage(rendered, { from: " alerts@example.com ", to: [" Gopi@example.com "] });
    expect(result).toMatchObject({ ...rendered, from: "alerts@example.com", to: ["Gopi@example.com"] });
  });
  it.each([
    [{ ...rendered, subject: "hi\r\nBcc:bad@example.com" }, envelope],
    [rendered, { ...envelope, from: "bad\naddress@example.com" }],
    [rendered, { ...envelope, to: ["Gopi@example.com", "Gopi@example.com"] }],
    [{ ...rendered, text: "" }, envelope],
    [{ ...rendered, html: "x".repeat(2_100_000) }, envelope],
  ])("rejects unsafe messages", (message, recipient) => {
    expect(() => prepareDeliveryMessage(message, recipient)).toThrow(MailForgeDeliveryError);
  });
  it("sends rendered HTML/text once and emits non-sensitive events", async () => {
    const send = vi.fn().mockResolvedValue({ provider: "fake", messageId: "m-1" });
    const events: unknown[] = [];
    const adapter: DeliveryAdapter = { name: "fake", send };
    const receipt = await sendRenderedEmail(adapter, rendered, envelope, { onEvent: event => events.push(event) });
    expect(receipt.messageId).toBe("m-1");
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0]).toMatchObject({ subject: rendered.subject, html: rendered.html, text: rendered.text });
    expect(events).toEqual([{ type: "send:start", provider: "fake" }, { type: "send:success", provider: "fake", messageId: "m-1" }]);
    expect(JSON.stringify(events)).not.toContain("Gopi@example.com");
  });
  it("wraps provider failures without returning credentials to observers", async () => {
    const events: unknown[] = [];
    const adapter: DeliveryAdapter = { name: "fake", send: async () => { throw new Error("secret-token"); } };
    await expect(sendRenderedEmail(adapter, rendered, envelope, { onEvent: event => events.push(event) })).rejects.toMatchObject({ code: "DELIVERY_FAILED" });
    expect(events.at(-1)).toEqual({ type: "send:failure", provider: "fake", errorCode: "DELIVERY_FAILED" });
    expect(JSON.stringify(events)).not.toContain("secret-token");
  });
  it("keeps observer failures from blocking a successful send", async () => {
    const adapter: DeliveryAdapter = { name: "fake", send: async () => ({ provider: "fake" }) };
    await expect(sendRenderedEmail(adapter, rendered, envelope, { onEvent() { throw Error("observer failed"); } })).resolves.toEqual({ provider: "fake" });
  });
  it("refuses mismatched provider receipts", async () => {
    const adapter: DeliveryAdapter = { name: "fake", send: async () => ({ provider: "other" }) };
    await expect(sendRenderedEmail(adapter, rendered, envelope)).rejects.toMatchObject({ code: "DELIVERY_FAILED" });
  });
  it("queues only validated messages with an explicit idempotency key", async () => {
    const enqueue = vi.fn(async (job: unknown) => { expect(job).toMatchObject({ idempotencyKey: "welcome:user-42", message: { subject: rendered.subject } }); return { jobId: "q-1" }; });
    const receipt = await enqueueRenderedEmail({ enqueue }, rendered, envelope, "welcome:user-42");
    expect(receipt.jobId).toBe("q-1");
    expect(enqueue).toHaveBeenCalledTimes(1);
  });
  it("rejects queues without valid idempotency keys", async () => {
    const enqueue = vi.fn();
    await expect(enqueueRenderedEmail({ enqueue }, rendered, envelope, "short")).rejects.toMatchObject({ code: "INVALID_MESSAGE" });
    expect(enqueue).not.toHaveBeenCalled();
  });
});
