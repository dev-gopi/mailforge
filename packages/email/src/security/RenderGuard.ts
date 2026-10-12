
import type {
    EmailDocument,
    EmailNode,
} from "@mailforge/core";

const MAX_DOCUMENT_BYTES = 512 * 1024;
const MAX_RAW_HTML_BYTES = 64 * 1024;
const MAX_CUSTOM_CSS_BYTES = 48 * 1024;

const encoder = new TextEncoder();

function bytes(value: string): number {
    return encoder.encode(value).byteLength;
}

export class EmailRenderBudgetError extends Error {
    public readonly code =
        "EMAIL_RENDER_BUDGET_EXCEEDED";

    constructor(
        public readonly field: string,
        reason: string,
    ) {
        super(
            `MailForge render budget at "${field}": ${reason}`,
        );

        this.name = "EmailRenderBudgetError";
    }
}

/**
 * Final size checks after interpolation, patches,
 * component expansion and theme application.
 */
export function assertRenderBudget(
    document: EmailDocument,
): void {
    const css = document.head?.customCss;

    if (
        css !== undefined &&
        bytes(css) > MAX_CUSTOM_CSS_BYTES
    ) {
        throw new EmailRenderBudgetError(
            "head.customCss",
            "custom CSS is too large",
        );
    }

    const visit = (
        node: EmailNode,
        path: string,
    ): void => {
        if (
            node.type === "raw-html" &&
            typeof node.props?.html === "string" &&
            bytes(node.props.html) > MAX_RAW_HTML_BYTES
        ) {
            throw new EmailRenderBudgetError(
                `${path}.props.html`,
                "raw HTML is too large",
            );
        }

        node.children?.forEach((child, index) => {
            visit(child, `${path}.children[${index}]`);
        });
    };

    if (document.header) {
        visit(document.header, "header");
    }

    document.body.forEach((node, index) => {
        visit(node, `body[${index}]`);
    });

    if (document.footer) {
        visit(document.footer, "footer");
    }

    if (document.copyright) {
        visit(document.copyright, "copyright");
    }

    let serialized: string;

    try {
        serialized = JSON.stringify(document);
    } catch {
        throw new EmailRenderBudgetError(
            "document",
            "document must be JSON-serializable",
        );
    }

    if (bytes(serialized) > MAX_DOCUMENT_BYTES) {
        throw new EmailRenderBudgetError(
            "document",
            "resolved email document is too large",
        );
    }
}
