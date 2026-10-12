
import {
    DocumentValidator,
    type DocumentPatch,
    type EmailDocument,
    type EmailNode,
    type EmailNodeValue,
} from "@mailforge/core";

import {
    EmailVariableError,
    type TemplateData,
    type VariableIssue,
    type VariableErrorCode,
} from "./Variable.types.js";

type Mode = "preview" | "render";

const TOKEN = /{{\s*([^{}]+?)\s*}}/g;
const WHOLE_TOKEN = /^{{\s*([^{}]+?)\s*}}$/;

const PATH =
    /^[a-zA-Z_][a-zA-Z0-9_]*(?:(?:\.[a-zA-Z_][a-zA-Z0-9_]*)|(?:\[(?:0|[1-9]\d{0,5})\]))*$/;

const FORBIDDEN_KEYS = new Set([
    "__proto__",
    "prototype",
    "constructor",
]);

const MAX_STRING = 32_768;
const MAX_VARIABLE_VALUE = 4096;
const MAX_TOKENS = 100;
const MAX_URL = 2048;

const validator = new DocumentValidator();

function fail(
    code: VariableErrorCode,
    location: string,
    message: string,
    variable?: string,
): never {
    throw new EmailVariableError([
        {
            code,
            location,
            message,
            ...(variable !== undefined
                ? { variable }
                : {}),
        },
    ]);
}

function isPlainObject(
    value: unknown,
): value is Record<string, unknown> {
    if (
        value === null ||
        typeof value !== "object" ||
        Array.isArray(value)
    ) {
        return false;
    }

    const proto = Object.getPrototypeOf(value);

    return proto === Object.prototype || proto === null;
}

/**
 * Turn:
 *   order.items[0].name
 * into:
 *   ["order", "items", "0", "name"]
 *
 * Never evaluate expressions.
 */
function parsePath(
    expression: string,
    location: string,
): string[] {
    const path = expression.trim();

    if (!PATH.test(path) || path.length > 256) {
        fail(
            "EMAIL_VARIABLE_INVALID",
            location,
            `Invalid variable path "${path}"`,
            path,
        );
    }

    const parts = path
        .replace(/\[(\d+)\]/g, ".$1")
        .split(".");

    if (
        parts.length > 16 ||
        parts.some((part) => FORBIDDEN_KEYS.has(part))
    ) {
        fail(
            "EMAIL_VARIABLE_INVALID",
            location,
            `Forbidden or overly deep variable path "${path}"`,
            path,
        );
    }

    return parts;
}

/**
 * Read own data properties only.
 *
 * Inherited properties and JavaScript getters
 * are not executed.
 */
function lookup(
    data: TemplateData,
    parts: string[],
): unknown {
    let current: unknown = data;

    for (const part of parts) {
        if (
            !Array.isArray(current) &&
            !isPlainObject(current)
        ) {
            return undefined;
        }

        const descriptor =
            Object.getOwnPropertyDescriptor(current, part);

        if (!descriptor || !("value" in descriptor)) {
            return undefined;
        }

        current = descriptor.value;
    }

    return current;
}

function scalar(
    data: TemplateData,
    expression: string,
    location: string,
    issues: VariableIssue[],
): string {
    const value = lookup(
        data,
        parsePath(expression, location),
    );

    if (value === undefined || value === null) {
        issues.push({
            code: "EMAIL_VARIABLE_MISSING",
            location,
            variable: expression,
            message: `Missing variable "${expression}"`,
        });

        return "";
    }

    if (
        typeof value !== "string" &&
        typeof value !== "number" &&
        typeof value !== "boolean"
    ) {
        fail(
            "EMAIL_VARIABLE_INVALID",
            location,
            `Variable "${expression}" must be a scalar value`,
            expression,
        );
    }

    if (
        typeof value === "number" &&
        !Number.isFinite(value)
    ) {
        fail(
            "EMAIL_VARIABLE_INVALID",
            location,
            `Variable "${expression}" must be finite`,
            expression,
        );
    }

    const result = String(value);

    if (result.length > MAX_VARIABLE_VALUE) {
        fail(
            "EMAIL_VARIABLE_INVALID",
            location,
            `Variable "${expression}" is too long`,
            expression,
        );
    }

    return result;
}

/**
 * Encode a dynamic URL path/query value.
 *
 * Invalid Unicode must produce a MailForge
 * error rather than an unexpected URIError.
 */
function encodeUrlVariable(
    value: string,
    expression: string,
    location: string,
): string {
    try {
        return encodeURIComponent(value);
    } catch {
        fail(
            "EMAIL_VARIABLE_INVALID",
            location,
            `Variable "${expression}" contains invalid Unicode`,
            expression,
        );
    }
}

/**
 * Substitute one string.
 *
 * For a URL:
 * - Entire variable: preserve a complete HTTPS URL
 *   for subsequent URL validation.
 * - Partial variable: percent-encode its value.
 */
function replaceValue(
    input: string,
    location: string,
    context: "text" | "url" | "forbidden",
    mode: Mode,
    data: TemplateData,
    issues: VariableIssue[],
): string {
    if (input.length > MAX_STRING) {
        fail(
            "EMAIL_VARIABLE_INVALID",
            location,
            "Template string exceeds maximum length",
        );
    }

    // Check for unmatched {{ or }} markers.
    const withoutTokens = input.replace(TOKEN, "");

    if (
        withoutTokens.includes("{{") ||
        withoutTokens.includes("}}")
    ) {
        fail(
            "EMAIL_VARIABLE_INVALID",
            location,
            "Malformed template expression",
        );
    }

    const matches = [...input.matchAll(TOKEN)];

    if (matches.length > MAX_TOKENS) {
        fail(
            "EMAIL_VARIABLE_INVALID",
            location,
            "Too many template expressions",
        );
    }

    if (matches.length === 0) {
        return input;
    }

    if (context === "forbidden") {
        fail(
            "EMAIL_VARIABLE_UNSUPPORTED_CONTEXT",
            location,
            "Dynamic variables are not allowed here",
        );
    }

    const wholeUrl = context === "url" &&
        WHOLE_TOKEN.test(input);

    if (context === "url" && !wholeUrl) {
        if (!/^https?:\/\//i.test(input)) {
            fail(
                "EMAIL_VARIABLE_UNSAFE_URL",
                location,
                "Partial URL templates must start with HTTP or HTTPS",
            );
        }

        const authority = input.match(
            /^https?:\/\/([^/?#]+)/i,
        )?.[1];

        if (
            !authority ||
            authority.includes("{{") ||
            authority.includes("}}")
        ) {
            fail(
                "EMAIL_VARIABLE_UNSAFE_URL",
                location,
                "Variables are not allowed in the URL hostname",
            );
        }
    }

    const issuesBeforeReplacement = issues.length;

    const output = input.replace(
        TOKEN,
        (_match, rawExpression: string) => {
            const expression = rawExpression.trim();

            // Validate the expression in both modes.
            parsePath(expression, location);

            const value = mode === "preview"
                ? "template-preview"
                : scalar(
                    data,
                    expression,
                    location,
                    issues,
                );

            if (context === "url" && !wholeUrl) {
                return encodeUrlVariable(
                    value,
                    expression,
                    location,
                );
            }

            // Text is not HTML here.
            // The MJML renderer handles HTML escaping.
            return value;
        },
    );

    if (
        mode === "render" &&
        context === "url" &&
        issues.length > issuesBeforeReplacement
    ) {
        // Report missing variables rather than an
        // additional invalid-URL error.
        return output;
    }

    if (context === "url") {
        let url: URL;

        // Check the final size after variable expansion.
        if (output.length > MAX_STRING) {
            fail(
                "EMAIL_VARIABLE_INVALID",
                location,
                `Resolved string exceeds ${MAX_STRING} characters`,
            );
        }

        // Reject control characters before URL parsing.
        // The built-in URL parser can normalize away
        // some characters such as carriage returns.
        if (
            context === "url" &&
            Array.from(output).some((character) => {
                const code = character.charCodeAt(0);
                return code <= 31 || code === 127;
            })
        ) {
            fail(
                "EMAIL_VARIABLE_UNSAFE_URL",
                location,
                "Dynamic URL contains control characters",
            );
        }

        try {
            url = new URL(
                mode === "preview" && wholeUrl
                    ? "https://mailforge.invalid/template-preview"
                    : output,
            );
        } catch {
            fail(
                "EMAIL_VARIABLE_UNSAFE_URL",
                location,
                "Variable produced an invalid URL",
            );
        }

        if (
            !["http:", "https:"].includes(url.protocol) ||
            !url.hostname ||
            url.username ||
            url.password ||
            output.length > MAX_URL
        ) {
            fail(
                "EMAIL_VARIABLE_UNSAFE_URL",
                location,
                "Dynamic URL must be HTTP/HTTPS without credentials",
            );
        }

        if (mode === "preview" && wholeUrl) {
            return "https://mailforge.invalid/template-preview";
        }
    }

    return output;
}

/**
 * Apply substitution to nested props.
 */
function mapProperty(
    value: EmailNodeValue,
    location: string,
    propertyName: string,
    mode: Mode,
    data: TemplateData,
    issues: VariableIssue[],
): EmailNodeValue {
    if (typeof value === "string") {
        const context =
            propertyName === "html"
                ? "forbidden"
                : propertyName === "href" ||
                    propertyName === "src"
                    ? "url"
                    : "text";

        return replaceValue(
            value,
            location,
            context,
            mode,
            data,
            issues,
        );
    }

    if (Array.isArray(value)) {
        return value.map((item, index) =>
            mapProperty(
                item,
                `${location}[${index}]`,
                propertyName,
                mode,
                data,
                issues,
            ),
        );
    }

    if (value !== null && typeof value === "object") {
        const result: Record<string, EmailNodeValue> = {};

        for (const [key, item] of Object.entries(value)) {
            result[key] = mapProperty(
                item,
                `${location}.${key}`,
                key,
                mode,
                data,
                issues,
            );
        }

        return result;
    }

    return value;
}

function mapNode(
    node: EmailNode,
    location: string,
    mode: Mode,
    data: TemplateData,
    issues: VariableIssue[],
): EmailNode {
    const copy = structuredClone(node);

    if (copy.props) {
        for (const [key, value] of Object.entries(copy.props)) {
            copy.props[key] = mapProperty(
                value,
                `${location}.props.${key}`,
                key,
                mode,
                data,
                issues,
            );
        }
    }

    if (copy.attrs) {
        for (const [key, value] of Object.entries(copy.attrs)) {
            if (typeof value === "string") {
                copy.attrs[key] = replaceValue(
                    value,
                    `${location}.attrs.${key}`,
                    "text",
                    mode,
                    data,
                    issues,
                );
            }
        }
    }

    if (copy.styles) {
        for (const [key, value] of Object.entries(copy.styles)) {
            if (typeof value === "string") {
                replaceValue(
                    value,
                    `${location}.styles.${key}`,
                    "forbidden",
                    mode,
                    data,
                    issues,
                );
            }
        }
    }

    copy.children = copy.children?.map(
        (child, index) =>
            mapNode(
                child,
                `${location}.children[${index}]`,
                mode,
                data,
                issues,
            ),
    );

    return copy;
}

/**
 * Shared registration/rendering transformation.
 */
function transformDocument(
    input: EmailDocument,
    mode: Mode,
    data: TemplateData,
): EmailDocument {
    // Structural validation before walking nodes.
    validator.validateOrThrow(input);

    const document = structuredClone(input);
    const issues: VariableIssue[] = [];

    document.subject = replaceValue(
        document.subject,
        "subject",
        "text",
        mode,
        data,
        issues,
    );

    if (document.preheader !== undefined) {
        document.preheader = replaceValue(
            document.preheader,
            "preheader",
            "text",
            mode,
            data,
            issues,
        );
    }

    if (document.head?.title !== undefined) {
        document.head.title = replaceValue(
            document.head.title,
            "head.title",
            "text",
            mode,
            data,
            issues,
        );
    }

    if (document.head?.customCss !== undefined) {
        replaceValue(
            document.head.customCss,
            "head.customCss",
            "forbidden",
            mode,
            data,
            issues,
        );
    }

    if (document.metadata) {
        for (const [key, value] of Object.entries(
            document.metadata,
        )) {
            document.metadata[key] = replaceValue(
                value,
                `metadata.${key}`,
                "text",
                mode,
                data,
                issues,
            );
        }
    }

    if (document.header) {
        document.header = mapNode(
            document.header,
            "header",
            mode,
            data,
            issues,
        );
    }

    document.body = document.body.map(
        (node, index) =>
            mapNode(
                node,
                `body[${index}]`,
                mode,
                data,
                issues,
            ),
    );

    if (document.footer) {
        document.footer = mapNode(
            document.footer,
            "footer",
            mode,
            data,
            issues,
        );
    }

    if (document.copyright) {
        document.copyright = mapNode(
            document.copyright,
            "copyright",
            mode,
            data,
            issues,
        );
    }

    for (const [location, value] of [
        ["subject", document.subject],
        ["preheader", document.preheader],
    ] as const) {
        if (
            value !== undefined &&
            // eslint-disable-next-line no-control-regex
            /[\u0000-\u001f\u007f]/.test(value)
        ) {
            issues.push({
                code: "EMAIL_VARIABLE_INVALID",
                location,
                message: "Email headers cannot contain control characters",
            });
        }
    }

    if (issues.length > 0) {
        throw new EmailVariableError(issues);
    }

    return document;
}

/**
 * Validate template syntax while substituting
 * safe temporary values for dynamic URLs.
 *
 * Do not store the returned preview document.
 */
export function prepareTemplateForValidation(
    document: EmailDocument,
): EmailDocument {
    return transformDocument(
        document,
        "preview",
        {},
    );
}

/**
 * Resolve a template using real application data.
 */
export function interpolateEmailDocument(
    document: EmailDocument,
    data: TemplateData = {},
): EmailDocument {
    if (!isPlainObject(data)) {
        fail(
            "EMAIL_VARIABLE_INVALID",
            "data",
            "Template data must be a plain object",
        );
    }

    return transformDocument(
        document,
        "render",
        data,
    );
}

/**
 * Resolve expressions supplied inside patches.
 *
 * This lets developers use variables in an
 * update/replace/insert operation too.
 */
export function interpolateDocumentPatches(
    patches: readonly DocumentPatch[],
    data: TemplateData = {},
): DocumentPatch[] {
    if (!isPlainObject(data)) {
        fail(
            "EMAIL_VARIABLE_INVALID",
            "data",
            "Template data must be a plain object",
        );
    }

    const issues: VariableIssue[] = [];

    const result: DocumentPatch[] = patches.map(
        (patch, index): DocumentPatch => {
            const location = `patches[${index}]`;

            switch (patch.op) {
                case "remove":
                    return { ...patch };

                case "update": {
                    const node = mapNode(
                        {
                            id: patch.target,
                            type: "text",
                            ...(patch.props !== undefined
                                ? { props: patch.props }
                                : {}),
                            ...(patch.styles !== undefined
                                ? { styles: patch.styles }
                                : {}),
                            ...(patch.attrs !== undefined
                                ? { attrs: patch.attrs }
                                : {}),
                        },
                        location,
                        "render",
                        data,
                        issues,
                    );

                    return {
                        ...patch,
                        ...(node.props !== undefined
                            ? { props: node.props }
                            : {}),
                        ...(node.styles !== undefined
                            ? { styles: node.styles }
                            : {}),
                        ...(node.attrs !== undefined
                            ? { attrs: node.attrs }
                            : {}),
                    };
                }

                case "replace":
                case "insertBefore":
                case "insertAfter":
                    return {
                        ...patch,
                        node: mapNode(
                            patch.node,
                            `${location}.node`,
                            "render",
                            data,
                            issues,
                        ),
                    };

                case "slot":
                    return {
                        ...patch,
                        nodes: patch.nodes.map(
                            (node, nodeIndex) =>
                                mapNode(
                                    node,
                                    `${location}.nodes[${nodeIndex}]`,
                                    "render",
                                    data,
                                    issues,
                                ),
                        ),
                    };
            }
        },
    );

    if (issues.length > 0) {
        throw new EmailVariableError(issues);
    }

    return result;
}
