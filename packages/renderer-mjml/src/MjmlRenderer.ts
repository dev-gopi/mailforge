import mjml2html from "mjml";
import { convert } from "html-to-text";
import { Buffer } from "node:buffer";
import {
    ComponentRegistry,
    ComponentValidator,
    type EmailDocument,
    type EmailNode,
    type EmailRenderer,
    type RenderOptions,
    type RenderResult,
} from "@mailforge/core";
import { escapeHtml, safeUrl, safeImageUrl, safeRichHtml, mjmlStyles } from "./RenderUtils.js";

type Trust = "safe" | "trusted";
interface State {
    sequence: number;
    selectors: string[];
}

const CUSTOM_ATTRIBUTE = /^(data-[a-z0-9_-]+|aria-[a-z0-9_-]+|id|class|title)$/i;
const CLASS_NAMES = /^[a-zA-Z_][\w-]*(?:\s+[a-zA-Z_][\w-]*)*$/;
const CONTENT_LIMIT = 512_000;
const CSS_LIMIT = 128_000;
const toText = (value: unknown): string => String(value ?? "");

function xmlAttribute(name: string, value: unknown): string {
    return ` ${name}="${escapeHtml(toText(value))}"`;
}

/** Converts a safe node attr map into MJML css-class + html-attribute selectors. */
function nodeAttributes(node: EmailNode, state: State): string {
    const className = `mf-node-${state.sequence++}`;
    let extraClasses = "";
    const selectors: string[] = [];

    for (const [name, value] of Object.entries(node.attrs ?? {})) {
        if (!CUSTOM_ATTRIBUTE.test(name)) {
            // Never silently discard attributes supplied by the developer.
            throw new Error(`Unsupported HTML attribute '${name}' on node '${node.id}'`);
        }
        if (name.toLowerCase() === "class") {
            const classes = toText(value).trim();
            if (classes && !CLASS_NAMES.test(classes)) {
                throw new Error(`Invalid class on node '${node.id}'`);
            }
            extraClasses = classes;
            continue;
        }
        selectors.push(`<mj-html-attribute name="${escapeHtml(name)}">${escapeHtml(value)}</mj-html-attribute>`);
    }
    if (selectors.length) {
        state.selectors.push(`<mj-selector path=".${className}">${selectors.join("")}</mj-selector>`);
    }
    return `css-class="${className}${extraClasses ? ` ${escapeHtml(extraClasses)}` : ""}"`;
}

function targetAttributes(node: EmailNode, target: string, state: State): string {
    const classAttribute = nodeAttributes(node, state);
    const styleAttributes = mjmlStyles(node.styles ?? {}, target);
    return `${classAttribute}${styleAttributes ? ` ${styleAttributes}` : ""}`;
}

/**
 * Renders a v1 email document. Complex nesting beyond section > column > leaf
 * is explicitly rejected rather than generating silently broken MJML.
 */
export class MjmlRenderer implements EmailRenderer {
    public readonly name = "mjml";
    private readonly validator: ComponentValidator;

    constructor(registry: ComponentRegistry = new ComponentRegistry()) {
        this.validator = new ComponentValidator(registry);
    }

    public async render(
        document: EmailDocument,
        options: RenderOptions = {},
    ): Promise<RenderResult> {
        this.validator.validateOrThrow(document);
        const trust: Trust = options.trust ?? "safe";
        if (trust !== "trusted" && trust !== "safe") {
            throw new Error("Invalid render trust mode");
        }
        if (/[\r\n]/.test(document.subject)) {
            throw new Error("Email subject must not contain line breaks");
        }
        const css = document.head?.customCss ?? "";
        if (css && trust !== "trusted") {
            throw new Error("Custom CSS requires trusted rendering mode");
        }
        if (Buffer.byteLength(css) > CSS_LIMIT || /<|<\/|\u0000/.test(css)) {
            throw new Error("Custom CSS is oversized or contains markup");
        }
        // Prevent accidental unbounded output / DoS from a large document.
        if (Buffer.byteLength(JSON.stringify(document), "utf8") > CONTENT_LIMIT) {
            throw new Error("Email document is too large");
        }

        const state: State = { sequence: 0, selectors: [] };
        const nodes: EmailNode[] = [
            ...(document.header ? [document.header] : []),
            ...document.body,
            ...(document.footer ? [document.footer] : []),
            ...(document.copyright ? [document.copyright] : []),
        ];
        const body = nodes.map(node => this.topLevel(node, state, trust)).join("\n");
        const head = [
            document.head?.title ? `<mj-title>${escapeHtml(document.head.title)}</mj-title>` : "",
            document.preheader ? `<mj-preview>${escapeHtml(document.preheader)}</mj-preview>` : "",
            css ? `<mj-style inline="inline">${css}</mj-style>` : "",
            state.selectors.length ? `<mj-html-attributes>${state.selectors.join("\n")}</mj-html-attributes>` : "",
        ].join("\n");

        const source = `<mjml><mj-head>${head}</mj-head><mj-body>${body}</mj-body></mjml>`;
        // MJML 5 supports an async compiler; strict mode throws on validation errors.
        const compiled = await mjml2html(source, {
            validationLevel: "strict",
            keepComments: false,
        });
        if (compiled.errors.length) {
            throw new Error(`MJML compilation failed: ${compiled.errors.map(e => e.formattedMessage).join("; ")}`);
        }
        let html = compiled.html;
        // Locale and direction are document-level metadata, not attributes on <mjml>.
        const locale = document.locale ?? "en";
        const direction = document.direction ?? "ltr";
        if (!/^[a-z]{2,3}(?:-[a-zA-Z0-9]{2,8}){0,4}$/i.test(locale)) {
            throw new Error("Invalid document locale");
        }
        html = html.replace(/<html\b([^>]*)>/i, (_match, raw: string) => {
            const remaining = raw.replace(/\s(?:lang|dir)="[^"]*"/gi, "");
            return `<html lang="${escapeHtml(locale)}" dir="${direction}"${remaining}>`;
        });

        return {
            subject: document.subject,
            html,
            text: convert(html, {
                wordwrap: 120,
                selectors: [{ selector: "img", format: "skip" }],
            }),
            ...(document.preheader !== undefined ? { preheader: document.preheader } : {}),
            warnings: options.inlineCss === false ? [{
                code: "MJML_CSS_INLINING",
                message: "MJML manages responsive CSS internally; inlineCss=false cannot disable every generated inline style.",
            }] : [],
        };
    }

    private topLevel(node: EmailNode, state: State, trust: Trust): string {
        if (node.type === "column") {
            throw new Error(`Column '${node.id}' must be inside a section`);
        }
        if (["header", "footer", "container"].includes(node.type)) {
            const children = node.children ?? [];
            const includesSections = children.some(child => ["section", "row", "container", "header", "footer"].includes(child.type));
            if (includesSections) {
                // A structural container cannot map its own attributes to one HTML element
                // if it contains multiple MJML sections. Make the limitation explicit.
                if (Object.keys(node.attrs ?? {}).length || Object.keys(node.styles ?? {}).length) {
                    throw new Error(`Container '${node.id}' with nested sections cannot carry attributes or styles`);
                }
                return children.map(child => this.topLevel(child, state, trust)).join("\n");
            }
            if (!children.length && !node.attrs && !node.styles) {
                return "";
            }
            const attributes = targetAttributes(node, "mj-section", state);
            return `<mj-section ${attributes}><mj-column>${children.map(child => this.leaf(child, state, trust)).join("\n")}</mj-column></mj-section>`;
        }
        if (node.type === "section" || node.type === "row") {
            const attributes = targetAttributes(node, "mj-section", state);
            const children = node.children ?? [];
            const withColumns = children.some(child => child.type === "column");
            const columns = withColumns
                ? children.map(child => {
                    if (child.type !== "column") {
                        throw new Error(`Section '${node.id}' cannot mix columns and ordinary components`);
                    }
                    return this.column(child, state, trust);
                }).join("\n")
                : `<mj-column>${children.map(child => this.leaf(child, state, trust)).join("\n")}</mj-column>`;
            return `<mj-section ${attributes}>${columns}</mj-section>`;
        }
        return `<mj-section><mj-column>${this.leaf(node, state, trust)}</mj-column></mj-section>`;
    }

    private column(node: EmailNode, state: State, trust: Trust): string {
        const attributes = targetAttributes(node, "mj-column", state);
        const content = (node.children ?? []).map(child => this.leaf(child, state, trust)).join("\n");
        return `<mj-column ${attributes}>${content}</mj-column>`;
    }

    private leaf(node: EmailNode, state: State, trust: Trust): string {
        if (["header", "footer", "container", "section", "row", "column"].includes(node.type)) {
            throw new Error(`Layout node '${node.type}' is not valid inside an MJML column`);
        }
        const props = node.props ?? {};
        switch (node.type) {
            case "heading": {
                const attrs = targetAttributes(node, "mj-text", state);
                const number = Number(props.level ?? 2);
                const level = Number.isInteger(number) && number >= 1 && number <= 6 ? number : 2;
                return `<mj-text ${attrs}><h${level}>${escapeHtml(props.text)}</h${level}></mj-text>`;
            }
            case "text":
            case "copyright": {
                const attrs = targetAttributes(node, "mj-text", state);
                return `<mj-text ${attrs}>${escapeHtml(props.text)}</mj-text>`;
            }
            case "button": {
                const attrs = targetAttributes(node, "mj-button", state);
                return `<mj-button ${attrs}${xmlAttribute("href", safeUrl(props.href))}>${escapeHtml(props.text)}</mj-button>`;
            }
            case "image": {
                const attrs = targetAttributes(node, "mj-image", state);
                const src = safeImageUrl(props.src);
                if (src.startsWith("data:") && trust !== "trusted") {
                    throw new Error("Inline data images require trusted rendering mode");
                }
                return `<mj-image ${attrs}${xmlAttribute("src", src)}${xmlAttribute("alt", props.alt)} />`;
            }
            case "divider":
                return `<mj-divider ${targetAttributes(node, "mj-divider", state)} />`;
            case "spacer": {
                const attrs = targetAttributes(node, "mj-spacer", state);
                const height = toText(props.height ?? "16px");
                if (!/^\d{1,4}(?:px|%)$/.test(height)) {
                    throw new Error(`Invalid spacer height on '${node.id}'`);
                }
                return `<mj-spacer ${attrs}${xmlAttribute("height", height)} />`;
            }
            case "raw-html": {
                // Raw HTML is not a real MJML component and has no reliable css-class target.
                if (Object.keys(node.attrs ?? {}).length || Object.keys(node.styles ?? {}).length) {
                    throw new Error("raw-html does not support node attributes/styles; add them to the HTML itself");
                }
                const html = toText(props.html);
                return `<mj-raw>${trust === "trusted" ? html : safeRichHtml(html)}</mj-raw>`;
            }
            default:
                throw new Error(`No MJML renderer registered for component '${node.type}'`);
        }
    }
}
