
import type {
    EmailNode,
    EmailNodeValue,
    EmailAttributeValue,
} from "../document/EmailNode.js";

export type EmailSlot =
    | "header.start"
    | "header.end"
    | "body.start"
    | "body.end"
    | "footer.start"
    | "footer.end";

export interface UpdatePatch {
    op: "update";
    target: string;

    props?: Record<string, EmailNodeValue>;
    styles?: Record<string, string | number>;
    attrs?: Record<string, EmailAttributeValue>;
}

export interface ReplacePatch {
    op: "replace";
    target: string;
    node: EmailNode;
}

export interface RemovePatch {
    op: "remove";
    target: string;
}

export interface InsertBeforePatch {
    op: "insertBefore";
    target: string;
    node: EmailNode;
}

export interface InsertAfterPatch {
    op: "insertAfter";
    target: string;
    node: EmailNode;
}

export interface SlotPatch {
    op: "slot";
    slot: EmailSlot;
    nodes: EmailNode[];
}

export type DocumentPatch =
    | UpdatePatch
    | ReplacePatch
    | RemovePatch
    | InsertBeforePatch
    | InsertAfterPatch
    | SlotPatch;
