
import sanitizeHtml from "sanitize-html";
import { convert } from "html-to-text";
import juice from "juice";

import type {
    RenderOptions,
    RenderResult,
} from "@mailforge/core";

export interface HtmlRenderInput {
    subject: string;
    html: string;
    preheader?: string;
    css?: string;
}

const MAX_HTML_LENGTH = 512_000;
const MAX_CSS_LENGTH = 128_000;

const escapeHtml = (value: string): string =>
    value.replace(/[&<>"']/g, (character) => {
        const entities: Record<string, string> = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        };

        return entities[character] ?? character;
    });

export class HtmlRenderer {
    public readonly name = "html";

    public async render(
        input: HtmlRenderInput,
        options: RenderOptions = {},
    ): Promise<RenderResult> {
        if (!input.subject.trim()) {
            throw new Error("Email subject is required");
        }

        if (input.html.length > MAX_HTML_LENGTH) {
            throw new Error("HTML document is too large");
        }

        if (
            input.css &&
            input.css.length > MAX_CSS_LENGTH
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

                enforceHtmlBoundary: true,
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

        if (trust === "trusted" && input.css) {
            // Pass CSS directly to Juice rather than
            // manually inserting an unsafe style tag.
            if (options.inlineCss === false) {
                // Add the supplied CSS to the document head.
                // CSS remains trusted, not sanitized.
                const styleTag = `<style>${input.css}</style>`;

                if (/<\/head\s*>/i.test(html)) {
                    html = html.replace(
                        /<\/head\s*>/i,
                        () => `${styleTag}</head>`,
                    );
                } else {
                    html = styleTag + html;
                }
            }
        }

        if (
            trust === "trusted" &&
            options.inlineCss !== false
        ) {
            html = juice(html, {
                applyStyleTags: true,
                removeStyleTags: false,
                extraCss: input.css ?? "",
            });
        }

        const text = convert(html, {
            wordwrap: 120,
            selectors: [
                {
                    selector: "img",
                    format: "skip",
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
