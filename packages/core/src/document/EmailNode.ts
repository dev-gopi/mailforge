export type EmailAttributeValue =
    | string
    | number
    | boolean;

export type EmailNodeType =
    | "container"
    | "section"
    | "row"
    | "column"
    | "heading"
    | "text"
    | "rich-text"
    | "button"
    | "image"
    | "divider"
    | "spacer"
    | "header"
    | "footer"
    | "copyright"
    | "raw-html"
    | (string & {});

export type EmailNodeValue =
    | string
    | number
    | boolean
    | null
    | EmailNodeValue[]
    | { [key: string]: EmailNodeValue };

export interface EmailNode {
    id: string;

    type: EmailNodeType;

    props?: Record<string, EmailNodeValue> | undefined;

    styles?: Record<string, string | number> | undefined;

    attrs?: Record<string, EmailAttributeValue> | undefined;

    children?: EmailNode[] | undefined;
}