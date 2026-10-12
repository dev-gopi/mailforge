
import sanitizeHtml from "sanitize-html";
import { convert } from "html-to-text";
import { Buffer } from "node:buffer";
import { CssProcessor } from "./CssProcessor.js";

import type {
    RenderOptions,
    RenderResult,
    EmailRenderer,
} from "@mailforge/core";

export interface HtmlRenderInput {
    subject: string;
    html: string;
    preheader?: string;
    css?: string;
}

const MAX_HTML_LENGTH = 512_000;
const MAX_CSS_LENGTH = 128_000;

export class HtmlRenderer implements EmailRenderer<HtmlRenderInput> {
    public readonly name = "html";
    private readonly cssProcessor = new CssProcessor();

    public async render(
        input: HtmlRenderInput,
        options: RenderOptions = {},
    ): Promise<RenderResult> {
        if (!input.subject.trim() || /[\r\n]/.test(input.subject)) {
            throw new Error("Email subject is required");
        }

        if (Buffer.byteLength(input.html, "utf8") > MAX_HTML_LENGTH) {
            throw new Error("HTML document is too large");
        }

        if (
            input.css &&
            Buffer.byteLength(input.css, "utf8") > MAX_CSS_LENGTH
        ) {
            throw new Error("Custom CSS is too large");
        }

        const trust = options.trust ?? "safe";

        if (input.css && trust !== "trusted") {
            throw new Error(
                "Custom CSS requires trusted rendering mode",
            );
        }

        let html: string;

        if (trust === "trusted") {
            // Trusted developers can provide full HTML.
            html = input.html;
        } else {
            // Restricted HTML fragments only.
            const content = sanitizeHtml(input.html, {
                allowedTags: [
                    "p",
                    "div",
                    "span",
                    "br",
                    "strong",
                    "b",
                    "em",
                    "i",
                    "u",
                    "ul",
                    "ol",
                    "li",
                    "a",
                    "h1",
                    "h2",
                    "h3",
                    "h4",
                    "table",
                    "thead",
                    "tbody",
                    "tfoot",
                    "tr",
                    "td",
                    "th",
                    "img",
                ],

                allowedAttributes: {
                    "*": [
                        "class",
                        "title",
                        "data-*",
                        "aria-*",
                    ],
                    a: [
                        "href",
                        "title",
                        "target",
                    ],
                    img: [
                        "src",
                        "alt",
                        "width",
                        "height",
                    ],
                    td: [
                        "colspan",
                        "rowspan",
                    ],
                    th: [
                        "colspan",
                        "rowspan",
                    ],
                },

                allowedSchemes: [
                    "https",
                    "http",
                    "mailto",
                ],

                allowedSchemesByTag: {
                    img: ["https", "http"],
                    a: ["https", "http", "mailto"],
                },

                allowedSchemesAppliedToAttributes: [
                    "href",
                    "src",
                ],

                allowProtocolRelative: false,

                disallowedTagsMode:
                    "completelyDiscard",

            });

            // Wrap the sanitized fragment in an email document.
            html = [
                "<!doctype html>",
                '<html lang="en">',
                "<head>",
                '<meta charset="utf-8">',
                '<meta name="viewport" content="width=device-width, initial-scale=1">',
                "</head>",
                "<body>",
                content,
                "</body>",
                "</html>",
            ].join("\n");
        }

        if (trust === "trusted") {
            html = this.cssProcessor.process(
                html,
                input.css ?? "",
                options.inlineCss !== false,
            );
        }

        const text = convert(html, {
            wordwrap: 120,
            selectors: [
                {
                    selector: "img",
                    format: "skip",
                },
                {
                    selector: "h1",
                    format: "heading",
                    options: { uppercase: false },
                },
                {
                    selector: "h2",
                    format: "heading",
                    options: { uppercase: false },
                },
                {
                    selector: "h3",
                    format: "heading",
                    options: { uppercase: false },
                },
                {
                    selector: "h4",
                    format: "heading",
                    options: { uppercase: false },
                },
                {
                    selector: "h5",
                    format: "heading",
                    options: { uppercase: false },
                },
                {
                    selector: "h6",
                    format: "heading",
                    options: { uppercase: false },
                },
            ],
        });

        return {
            subject: input.subject,
            html,
            text,
            ...(input.preheader !== undefined
                ? { preheader: input.preheader }
                : {}),
            warnings: [],
        };
    }
}
