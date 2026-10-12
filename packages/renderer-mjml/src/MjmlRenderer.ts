
import mjml2html from "mjml";
import { convert } from "html-to-text";

import {
    ComponentRegistry,
    ComponentValidator,
    type EmailDocument,
    type EmailNode,
    type EmailRenderer,
    type RenderOptions,
    type RenderResult,
} from "@mailforge/core";

import {
    escapeHtml,
    safeUrl,
    safeRichHtml,
    mjmlStyles,
} from "./RenderUtils.js";

type TrustMode = "safe" | "trusted";

interface RenderState {
    nextId: number;
    htmlAttributes: string[];
}

const CUSTOM_ATTRIBUTE_PATTERN =
    /^(data-[a-z0-9_-]+|aria-[a-z0-9_-]+|id|class|title)$/i;

const toText = (value: unknown): string =>
    value === null || value === undefined
        ? ""
        : String(value);

const attr = (
    name: string,
    value: unknown,
): string => {
    if (value === null || value === undefined) {
        return "";
    }

    return ` ${name}="${escapeHtml(String(value))}"`;
};

const trustedUrl = (value: unknown): string => {
    const url = toText(value);

    if (/^cid:[a-z0-9._@+-]+$/i.test(url)) {
        return url;
    }

    if (/^data:image\/(png|jpeg|gif|webp);base64,/i.test(url)) {
        return url;
    }

    return safeUrl(url);
};

export class MjmlRenderer implements EmailRenderer {
    public readonly name = "mjml";

    private readonly validator: ComponentValidator;

    constructor(
        registry: ComponentRegistry = new ComponentRegistry(),
    ) {
        this.validator = new ComponentValidator(registry);
    }

    public async render(
        document: EmailDocument,
        options: RenderOptions = {},
    ): Promise<RenderResult> {
        this.validator.validateOrThrow(document);

        const trust: TrustMode = options.trust ?? "safe";

        if (
            document.head?.customCss &&
            trust !== "trusted"
        ) {
            throw new Error(
                "Custom CSS requires trusted rendering mode",
            );
        }

        const state: RenderState = {
            nextId: 0,
            htmlAttributes: [],
        };

        const bodyNodes: EmailNode[] = [
            ...(document.header ? [document.header] : []),
            ...document.body,
            ...(document.footer ? [document.footer] : []),
            ...(document.copyright ? [document.copyright] : []),
        ];

        const body = bodyNodes
            .map((node) => this.block(node, trust, state))
            .join("\n");

        const preview = document.preheader
            ? `<mj-preview>${escapeHtml(document.preheader)}</mj-preview>`
            : "";

        const title = document.head?.title
            ? `<mj-title>${escapeHtml(document.head.title)}</mj-title>`
            : "";

        const customCss = document.head?.customCss
            ? `<mj-style>${document.head.customCss.replace(
                /<\/?mj-style\b/gi,
                "",
            ).replace(/<\/style\b/gi, "&lt;/style")}</mj-style>`
            : "";

        const attributes = state.htmlAttributes.length
            ? `<mj-html-attributes>
          ${state.htmlAttributes.join("\n")}
        </mj-html-attributes>`
            : "";

        const direction = document.direction ?? "ltr";

        const locale = document.locale ?? "en";

        const mjml = `
<mjml${attr("lang", locale)}${attr("dir", direction)}>
  <mj-head>
    ${title}
    ${preview}
    ${customCss}
    ${attributes}
  </mj-head>

  <mj-body>
    ${body}
  </mj-body>
</mjml>
`;

        const compiled = await mjml2html(mjml, {
            validationLevel: "strict",
            keepComments: false,
        });

        if (compiled.errors.length > 0) {
            throw new Error(
                "MJML compilation failed: " +
                compiled.errors
                    .map((error) => error.formattedMessage)
                    .join("; "),
            );
        }

        const html = compiled.html;

        return {
            subject: document.subject,
            html,
            text: convert(html, {
                wordwrap: 120,
                selectors: [
                    {
                        selector: "img",
                        format: "skip",
                    },
                ],
            }),
            ...(document.preheader !== undefined
                ? { preheader: document.preheader }
                : {}),
            warnings: [],
        };
    }

    private block(
        node: EmailNode,
        trust: TrustMode,
        state: RenderState,
    ): string {
        const wrappers = [
            "container",
            "header",
            "footer",
        ];

        if (wrappers.includes(node.type)) {
            return (node.children ?? [])
                .map((child) => this.block(child, trust, state))
                .join("\n");
        }

        if (
            node.type === "section" ||
            node.type === "row"
        ) {
            const children = node.children ?? [];

            const hasColumns = children.some(
                (child) => child.type === "column",
            );

            const inner = hasColumns
                ? children
                    .map((child) => {
                        if (child.type !== "column") {
                            throw new Error(
                                "Sections with columns may only contain columns",
                            );
                        }

                        return this.column(child, trust, state);
                    })
                    .join("\n")
                : `<mj-column>
            ${children
                    .map((child) =>
                        this.inlineNode(child, trust, state),
                    )
                    .join("\n")}
          </mj-column>`;

            const styles = mjmlStyles(node.styles);

            return `<mj-section${styles ? ` ${styles}` : ""}>
        ${inner}
      </mj-section>`;
        }

        if (node.type === "column") {
            throw new Error(
                "A column must be inside a section or row",
            );
        }

        return `<mj-section>
      <mj-column>
        ${this.inlineNode(node, trust, state)}
      </mj-column>
    </mj-section>`;
    }

    private column(
        node: EmailNode,
        trust: TrustMode,
        state: RenderState,
    ): string {
        const content = (node.children ?? [])
            .map((child) =>
                this.inlineNode(child, trust, state),
            )
            .join("\n");

        const styles = mjmlStyles(node.styles);

        return `<mj-column${styles ? ` ${styles}` : ""}>
      ${content}
    </mj-column>`;
    }

    private inlineNode(
        node: EmailNode,
        trust: TrustMode,
        state: RenderState,
    ): string {
        const props = node.props ?? {};

        const styles = mjmlStyles(node.styles);

        const className = `mf-node-${state.nextId++}`;

        if (node.attrs) {
            const allowedAttrs = Object.entries(node.attrs)
                .filter(([key]) =>
                    CUSTOM_ATTRIBUTE_PATTERN.test(key),
                )
                .map(([key, value]) => {
                    return `<mj-html-attribute name="${escapeHtml(key)}">${escapeHtml(
                        String(value),
                    )}</mj-html-attribute>`;
                })
                .join("\n");

            if (allowedAttrs) {
                state.htmlAttributes.push(
                    `<mj-selector path=".${className}">
            ${allowedAttrs}
          </mj-selector>`,
                );
            }
        }

        const common =
            `css-class="${className}"` +
            (styles ? ` ${styles}` : "");

        switch (node.type) {
            case "heading": {
                const level = Number(props.level ?? 2);

                const safeLevel = (
                    Number.isInteger(level) &&
                    level >= 1 &&
                    level <= 6
                ) ? level : 2;

                const text = escapeHtml(
                    toText(props.text ?? props.content),
                );

                return `<mj-text ${common}>
          <h${safeLevel}>${text}</h${safeLevel}>
        </mj-text>`;
            }

            case "text":
            case "copyright": {
                const content = escapeHtml(
                    toText(props.text ?? props.content),
                );

                return `<mj-text ${common}>
          ${content}
        </mj-text>`;
            }

            case "button": {
                const label = escapeHtml(
                    toText(props.text ?? props.label),
                );

                const href = trustedUrl(props.href ?? "#");

                return `<mj-button ${common}${attr("href", href)}>
          ${label}
        </mj-button>`;
            }

            case "image": {
                const src = trustedUrl(props.src);

                if (!src) {
                    throw new Error(
                        `Image node "${node.id}" requires a valid src`,
                    );
                }

                const alt = toText(props.alt);

                return `<mj-image ${common}${attr("src", src)}${attr("alt", alt)} />`;
            }

            case "divider":
                return `<mj-divider ${common} />`;

            case "spacer": {
                const height = props.height ?? "20px";

                return `<mj-spacer ${common}${attr("height", height)} />`;
            }

            case "raw-html": {
                const rawHtml = toText(props.html);

                const content =
                    trust === "trusted"
                        ? rawHtml
                        : safeRichHtml(rawHtml);

                return `<mj-raw>
          ${content}
        </mj-raw>`;
            }

            default:
                throw new Error(
                    `No MJML renderer registered for: ${node.type}`,
                );
        }
    }
}
