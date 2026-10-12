
import { z } from "zod";

import type {
    ReusableComponentDefinition,
} from "../contracts/ComponentRenderer.types.js";

import {
    httpsUrlSchema,
    hexColorSchema,
} from "../contracts/SafeValue.js";

/**
 * Produces one "image" primitive with
 * additional validated caption properties.
 *
 * The MJML renderer will display the caption
 * in a separate mj-text element.
 */
export function createImageCaptionDefinition():
    ReusableComponentDefinition {
    return {
        name: "mf-image-caption",
        version: "1.0.0",
        description: "Image with a visible caption",
        allowChildren: false,

        schema: z.object({
            src: httpsUrlSchema,
            alt: z.string().min(1).max(300),
            caption: z.string().min(1).max(500),
            captionColor: hexColorSchema.optional(),
        }).strict(),

        render: (props, context) => ({
            id: context.nodeId,
            type: "image",

            props: {
                src: String(props.src),
                alt: String(props.alt),
                caption: String(props.caption),

                ...(typeof props.captionColor === "string"
                    ? {
                        captionColor: props.captionColor,
                    }
                    : {}),
            },
        }),
    };
}
