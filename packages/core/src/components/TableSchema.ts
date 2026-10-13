import { z } from "zod";

/** Bounded, serializable, content-only tables. Never accept arbitrary HTML/CSS. */
export const tablePropsSchema = z.object({
    headers: z.array(z.string().min(1).max(120)).min(1).max(6),
    rows: z.array(z.array(z.string().max(600)).min(1).max(6)).max(80),
    caption: z.string().min(1).max(160).optional(),
    showHeader: z.boolean().default(true),
    striped: z.boolean().default(false),
    border: z.boolean().default(true),
    padding: z.number().int().min(4).max(24).default(12),
    headerBackground: z.string().regex(/^#[\da-fA-F]{6}$/).default("#f1f5f9"),
    headerTextColor: z.string().regex(/^#[\da-fA-F]{6}$/).default("#0f172a"),
    textColor: z.string().regex(/^#[\da-fA-F]{6}$/).default("#334155"),
    borderColor: z.string().regex(/^#[\da-fA-F]{6}$/).default("#e2e8f0"),
    stripeColor: z.string().regex(/^#[\da-fA-F]{6}$/).default("#f8fafc"),
    alignments: z.array(z.enum(["left", "center", "right"])).max(6).optional(),
}).strict().superRefine((value, ctx) => {
    const count = value.headers.length;
    value.rows.forEach((row, index) => {
        if (row.length !== count) ctx.addIssue({
            code: "custom", path: ["rows", index],
            message: `Expected ${count} cells`,
        });
    });
    if (value.alignments && value.alignments.length !== count) {
        ctx.addIssue({ code: "custom", path: ["alignments"], message: `Expected ${count} column alignments` });
    }
});
export type TableProps = z.output<typeof tablePropsSchema>;
