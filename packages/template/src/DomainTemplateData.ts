import { z } from "zod";

export const DOMAIN_TEMPLATE_NAMES = [
  "invoice",
  "payment-receipt",
  "order-confirmation",
  "security-alert",
] as const;

export type DomainTemplateName = (typeof DOMAIN_TEMPLATE_NAMES)[number];

const text = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine(
      (value) =>
        value.trim().length > 0 && !/[\u0000-\u001f\u007f]/.test(value),
      "Must contain valid non-empty text",
    );

const httpsUrl = z
  .string()
  .min(1)
  .max(2048)
  .refine((value) => {
    try {
      if (/[\u0000-\u001f\u007f]/.test(value)) {
        return false;
      }

      const url = new URL(value);

      return (
        url.protocol === "https:" &&
        url.hostname.length > 0 &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }, "Must be an HTTPS URL without credentials");

const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);

    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "Invalid calendar date");

const timestamp = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
    "Use a UTC timestamp such as 2026-10-12T12:00:00Z",
  )
  .refine(
    (value) => Number.isFinite(Date.parse(value)),
    "Invalid UTC timestamp",
  );

const money = z.number().int().min(0).max(100_000_000_000);

const currency = z.enum(["USD", "EUR", "GBP", "INR"]);

const item = z
  .object({
    name: text(160),
    quantity: z.number().int().min(1).max(100),
    unitPriceCents: money,
  })
  .strict();

const moneyFields = {
  currency,
  items: z.array(item).min(1).max(20),
  shippingCents: money.default(0),
  discountCents: money.default(0),
};

function validateMoney(
  value: {
    items: {
      quantity: number;
      unitPriceCents: number;
    }[];
    shippingCents: number;
    discountCents: number;
  },
  context: z.RefinementCtx,
): void {
  const subtotal = value.items.reduce(
    (sum, line) => sum + line.quantity * line.unitPriceCents,
    0,
  );

  if (
    !Number.isSafeInteger(subtotal) ||
    !Number.isSafeInteger(subtotal + value.shippingCents)
  ) {
    context.addIssue({
      code: "custom",
      path: ["items"],
      message: "Monetary total exceeds safe integer range",
    });
  }

  if (value.discountCents > subtotal + value.shippingCents) {
    context.addIssue({
      code: "custom",
      path: ["discountCents"],
      message: "Discount exceeds the invoice/order amount",
    });
  }
}

const customerName = z
  .object({
    name: text(120),
  })
  .strict();

const firstName = z
  .object({
    firstName: text(80),
  })
  .strict();

const invoiceDetails = z
  .object({
    number: text(60),
    issuedOn: calendarDate,
    dueOn: calendarDate,
    ...moneyFields,
  })
  .strict()
  .superRefine((value, context) => {
    validateMoney(value, context);

    if (value.dueOn < value.issuedOn) {
      context.addIssue({
        code: "custom",
        path: ["dueOn"],
        message: "Due date must not precede issue date",
      });
    }
  });

const receiptDetails = z
  .object({
    number: text(60),
    transactionId: text(120),
    paidOn: calendarDate,
    ...moneyFields,
  })
  .strict()
  .superRefine(validateMoney);

const orderDetails = z
  .object({
    id: text(80),
    placedOn: calendarDate,
    ...moneyFields,
  })
  .strict()
  .superRefine(validateMoney);

const invoiceSchema = z
  .object({
    customer: customerName,
    invoice: invoiceDetails,
    paymentUrl: httpsUrl,
  })
  .strict();

const receiptSchema = z
  .object({
    customer: customerName,
    receipt: receiptDetails,
    receiptUrl: httpsUrl,
  })
  .strict();

const orderSchema = z
  .object({
    customer: firstName,
    order: orderDetails,
    orderUrl: httpsUrl,
  })
  .strict();

const securitySchema = z
  .object({
    user: firstName,

    alert: z
      .object({
        kind: z.enum(["new-device", "password-changed", "suspicious-login"]),
        occurredAt: timestamp,
        device: text(160),
        location: text(160).optional(),
        severity: z.enum(["info", "warning", "danger"]).default("warning"),
      })
      .strict(),

    reviewUrl: httpsUrl,
  })
  .strict();

export const DOMAIN_TEMPLATE_SCHEMAS = {
  invoice: invoiceSchema,
  "payment-receipt": receiptSchema,
  "order-confirmation": orderSchema,
  "security-alert": securitySchema,
} as const;

/**
 * Public input types: optional shipping and discount
 * values may be omitted.
 */
export type DomainTemplateDataMap = {
  [K in DomainTemplateName]: z.input<(typeof DOMAIN_TEMPLATE_SCHEMAS)[K]>;
};

/**
 * Validated output types: Zod defaults have
 * already been applied.
 */
export type ParsedDomainTemplateDataMap = {
  [K in DomainTemplateName]: z.output<(typeof DOMAIN_TEMPLATE_SCHEMAS)[K]>;
};

/**
 * Check untrusted objects before Zod parses them.
 * In particular, reject getters without executing them.
 */
export function assertPlainTemplateData(input: unknown): void {
  const seen = new WeakSet<object>();
  let entries = 0;

  const visit = (value: unknown, depth: number): void => {
    if (depth > 12) {
      throw new Error("Template data nesting limit exceeded");
    }

    if (value === null || typeof value !== "object") {
      return;
    }

    if (seen.has(value)) {
      throw new Error("Repeated/cyclic template data reference");
    }

    const prototype = Object.getPrototypeOf(value);

    if (
      !Array.isArray(value) &&
      prototype !== Object.prototype &&
      prototype !== null
    ) {
      throw new Error("Template data must contain plain objects");
    }

    seen.add(value);

    const descriptors = Object.getOwnPropertyDescriptors(value);

    for (const [key, descriptor] of Object.entries(descriptors)) {
      entries++;

      if (entries > 1000) {
        throw new Error("Template data property limit exceeded");
      }

      if (!("value" in descriptor)) {
        throw new Error("Template data getters are unsupported");
      }

      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        throw new Error("Forbidden template data property");
      }

      visit(descriptor.value, depth + 1);
    }
  };

  visit(input, 0);
}
