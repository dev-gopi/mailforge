
import { z } from "zod";

export const currencySchema = z.enum([
    "USD",
    "EUR",
    "GBP",
    "INR",
]);

export type SupportedCurrency =
    z.infer<typeof currencySchema>;

export const centsSchema = z.number()
    .int()
    .min(0)
    .max(100_000_000_000);

export const orderItemSchema = z.object({
    name: z.string().min(1).max(160),
    quantity: z.number().int().min(1).max(100),
    unitPriceCents: centsSchema,
}).strict();

/**
 * Deterministic currency display without
 * floating-point formatting errors.
 *
 * This library task supports currencies with
 * two minor-unit decimal places.
 */
export function formatMoney(
    currency: SupportedCurrency,
    amountCents: number,
): string {
    if (
        !Number.isSafeInteger(amountCents) ||
        amountCents < 0
    ) {
        throw new Error(
            "Money amount must be a non-negative safe integer",
        );
    }

    const units = Math.floor(amountCents / 100);
    const minor = String(
        amountCents % 100,
    ).padStart(2, "0");

    return `${currency} ${units}.${minor}`;
}

export function calculateOrderTotal(
    subtotalCents: number,
    shippingCents: number,
    discountCents: number,
): number {
    const total =
        subtotalCents +
        shippingCents -
        discountCents;

    if (
        !Number.isSafeInteger(total) ||
        total < 0
    ) {
        throw new Error(
            "Invalid order total or discount amount",
        );
    }

    return total;
}
