import type {
  DeliveryAdapter, DeliveryEnvelope, DeliveryEvent, DeliveryJob,
  DeliveryMessage, DeliveryOptions, DeliveryQueue, DeliveryReceipt, RenderedEmail,
} from "./Transport.types.js";

export class MailForgeDeliveryError extends Error {
  constructor(
    public readonly code: "INVALID_MESSAGE" | "DELIVERY_FAILED" | "QUEUE_FAILED",
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "MailForgeDeliveryError";
  }
}

function invalid(message: string): never {
  throw new MailForgeDeliveryError("INVALID_MESSAGE", message);
}

function normalizeAddress(value: unknown, field: string): string {
  if (typeof value !== "string") return invalid(`${field} must be an email address`);
  const address = value.trim();
  // Simple mailbox syntax; final RFC validation belongs to the provider.
  if (address.length > 254 || !/^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/u.test(address) || /[\r\n\0]/u.test(address)) {
    return invalid(`${field} must be a valid mailbox address without line breaks`);
  }
  return address;
}

/** Refuses header injection, huge payloads and missing plain-text fallbacks. */
export function prepareDeliveryMessage(
  rendered: RenderedEmail,
  envelope: DeliveryEnvelope,
): DeliveryMessage {
  if (rendered === null || typeof rendered !== "object" || envelope === null || typeof envelope !== "object") {
    return invalid("A rendered email and delivery envelope are required");
  }
  if (typeof rendered.subject !== "string" || rendered.subject.trim().length === 0 ||
    rendered.subject.length > 998 || /[\r\n\0]/u.test(rendered.subject)) {
    return invalid("Subject is missing, too long, or contains invalid line breaks");
  }
  if (typeof rendered.html !== "string" || rendered.html.trim().length === 0 ||
    typeof rendered.text !== "string" || rendered.text.trim().length === 0) {
    return invalid("Both nonempty HTML and plain-text bodies are required");
  }
  if (new TextEncoder().encode(rendered.html).length + new TextEncoder().encode(rendered.text).length > 2_000_000) {
    return invalid("Rendered email exceeds the 2 MB delivery limit");
  }
  const rawRecipients = typeof envelope.to === "string" ? [envelope.to] : envelope.to;
  if (!Array.isArray(rawRecipients) || rawRecipients.length === 0 || rawRecipients.length > 100) {
    return invalid("Provide between 1 and 100 recipients");
  }
  const recipients = rawRecipients.map((address: unknown) => normalizeAddress(address, "to"));
  if (new Set(recipients.map(address => address.toLowerCase())).size !== recipients.length) {
    return invalid("Duplicate recipients are not permitted");
  }
  const message: DeliveryMessage = {
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    from: normalizeAddress(envelope.from, "from"),
    to: recipients,
    ...(envelope.replyTo === undefined ? {} : { replyTo: normalizeAddress(envelope.replyTo, "replyTo") }),
  };
  return message;
}

function emit(options: DeliveryOptions, event: DeliveryEvent): void {
  try { options.onEvent?.(event); } catch { /* Telemetry must never affect delivery. */ }
}

/** Provider-neutral sending. Does not automatically retry (duplicate-send risk). */
export async function sendRenderedEmail(
  adapter: DeliveryAdapter,
  rendered: RenderedEmail,
  envelope: DeliveryEnvelope,
  options: DeliveryOptions = {},
): Promise<DeliveryReceipt> {
  if (!adapter || typeof adapter.name !== "string" || !/^[a-z][a-z0-9-]{0,63}$/u.test(adapter.name) || typeof adapter.send !== "function") {
    return invalid("Invalid delivery adapter");
  }
  const message = prepareDeliveryMessage(rendered, envelope);
  emit(options, { type: "send:start", provider: adapter.name });
  try {
    const receipt = await adapter.send(message);
    if (!receipt || receipt.provider !== adapter.name) {
      throw new Error("Provider returned an invalid receipt");
    }
    emit(options, {
      type: "send:success", provider: adapter.name,
      ...(receipt.messageId === undefined ? {} : { messageId: receipt.messageId }),
    });
    return receipt;
  } catch (cause) {
    emit(options, { type: "send:failure", provider: adapter.name, errorCode: "DELIVERY_FAILED" });
    throw new MailForgeDeliveryError("DELIVERY_FAILED", `Delivery via ${adapter.name} failed`, { cause });
  }
}

/** Queues a copy of a validated message, with caller-owned durable idempotency. */
export async function enqueueRenderedEmail(
  queue: DeliveryQueue,
  rendered: RenderedEmail,
  envelope: DeliveryEnvelope,
  idempotencyKey: string,
): Promise<{ readonly jobId: string }> {
  if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]{7,127}$/u.test(idempotencyKey)) {
    return invalid("A stable idempotency key of 8–128 characters is required");
  }
  if (!queue || typeof queue.enqueue !== "function") return invalid("Invalid delivery queue");
  const job: DeliveryJob = { idempotencyKey, message: prepareDeliveryMessage(rendered, envelope) };
  try {
    const result = await queue.enqueue(job);
    if (!result || typeof result.jobId !== "string" || result.jobId.length === 0) {
      throw new Error("Queue must return a nonempty jobId");
    }
    return result;
  } catch (cause) {
    throw new MailForgeDeliveryError("QUEUE_FAILED", "Could not enqueue email", { cause });
  }
}
