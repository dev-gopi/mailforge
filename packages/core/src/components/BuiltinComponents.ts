import { z } from "zod";

import type {
    ComponentDefinition,
} from "./ComponentDefinition.js";

const textSchema = z.object({
    text: z.string(),
}).passthrough();

const emptySchema = z.object({}).passthrough();

const MAX_BASE64_IMAGE_BYTES = 2 * 1024 * 1024;

const httpUrlSchema = z.url().refine(
    (value) => {
        try {
            const url = new URL(value);

            return (
                (url.protocol === "https:" ||
                    url.protocol === "http:") &&
                url.username.length === 0 &&
                url.password.length === 0
            );
        } catch {
            return false;
        }
    },
    "Only HTTP and HTTPS URLs are supported",
);

const base64ImageSchema = z
    .string()
    .refine((value) => {
        const match = /^data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(value);

        if (!match) {
            return false;
        }

        const encoded = match[2]!;

        if (encoded.length % 4 !== 0) {
            return false;
        }

        const padding = encoded.endsWith("==")
            ? 2
            : encoded.endsWith("=")
                ? 1
                : 0;

        const byteLength =
            (encoded.length / 4) * 3 - padding;

        return byteLength <= MAX_BASE64_IMAGE_BYTES;
    }, "Invalid or oversized base64 image");

const cidImageSchema = z
    .string()
    .regex(
        /^cid:[A-Za-z0-9][A-Za-z0-9._@+-]*$/,
        "Invalid CID image reference",
    );

export const imageSourceSchema = z.union([
    httpUrlSchema,
    base64ImageSchema,
    cidImageSchema,
]);

export const BUILTIN_COMPONENTS: readonly ComponentDefinition[] = [
    {
        name: "container",
        version: "1.0.0",
        schema: emptySchema,
        allowChildren: true,
    },
    {
        name: "section",
        version: "1.0.0",
        schema: emptySchema,
        allowChildren: true,
    },
    {
        name: "row",
        version: "1.0.0",
        schema: emptySchema,
        allowChildren: true,
    },
    {
        name: "column",
        version: "1.0.0",
        schema: emptySchema,
        allowChildren: true,
    },
    {
        name: "header",
        version: "1.0.0",
        schema: emptySchema,
        allowChildren: true,
    },
    {
        name: "footer",
        version: "1.0.0",
        schema: emptySchema,
        allowChildren: true,
    },
    {
        name: "copyright",
        version: "1.0.0",
        schema: textSchema,
        defaults: {
            text: "All rights reserved.",
        },
        allowChildren: false,
    },
    {
        name: "heading",
        version: "1.0.0",
        schema: textSchema,
        allowChildren: false,
    },
    {
        name: "text",
        version: "1.0.0",
        schema: textSchema,
        allowChildren: false,
    },
    {
        name: "button",
        version: "1.0.0",
        schema: z.object({
            text: z.string().min(1),
            href: httpUrlSchema,
        }).passthrough(),
        defaults: {
            text: "Click Here",
        },
        allowChildren: false,
    },
    {
        name: "image",
        version: "1.0.0",
        schema: z.object({
            src: imageSourceSchema,
            alt: z.string(),
        }).passthrough(),
        allowChildren: false,
    },
    {
        name: "divider",
        version: "1.0.0",
        schema: emptySchema,
        allowChildren: false,
    },
    {
        name: "spacer",
        version: "1.0.0",
        schema: emptySchema,
        allowChildren: false,
    },
    {
        name: "raw-html",
        version: "1.0.0",
        schema: z.object({
            html: z.string(),
        }).strict(),
        allowChildren: false,
    },
];
