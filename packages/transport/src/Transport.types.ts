/** MailForge deliberately separates rendering from delivery. */
export interface RenderedEmail {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

export interface DeliveryEnvelope {
  readonly from: string;
  readonly to: string | readonly string[];
  readonly replyTo?: string;
}

/** Validated, normalized message handed to a provider. */
export interface DeliveryMessage extends RenderedEmail {
  readonly from: string;
  readonly to: readonly string[];
  readonly replyTo?: string;
}

export interface DeliveryReceipt {
  readonly provider: string;
  /** Provider-generated identifier, if returned. */
  readonly messageId?: string;
  /** Only populate when the provider confirms these addresses. */
  readonly accepted?: readonly string[];
  readonly rejected?: readonly string[];
}

export interface DeliveryAdapter {
  readonly name: string;
  send(message: DeliveryMessage): Promise<DeliveryReceipt>;
}

/** Events intentionally exclude body content, credentials and recipient addresses. */
export type DeliveryEvent =
  | { readonly type: "send:start"; readonly provider: string }
  | { readonly type: "send:success"; readonly provider: string; readonly messageId?: string }
  | { readonly type: "send:failure"; readonly provider: string; readonly errorCode: string };

export interface DeliveryOptions {
  /** Optional application telemetry; never allowed to break delivery. */
  readonly onEvent?: (event: DeliveryEvent) => void;
}

/** Application-managed queue integration: no database or retry service is forced. */
export interface DeliveryQueue {
  enqueue(job: DeliveryJob): Promise<{ readonly jobId: string }>;
}

export interface DeliveryJob {
  readonly idempotencyKey: string;
  readonly message: DeliveryMessage;
}
