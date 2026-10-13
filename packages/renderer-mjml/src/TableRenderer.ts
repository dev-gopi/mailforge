import { tablePropsSchema } from "@mailforge/core";
import { escapeHtml } from "./RenderUtils.js";

/** Render bounded rows as native MJML table cells; never interpolate raw cell HTML. */
export function renderTableMarkup(input: unknown): string {
    const table = tablePropsSchema.parse(input);
    const border = table.border ? `border-bottom:1px solid ${table.borderColor};` : "";
    const columnStyle = (index: number): string =>
        `text-align:${table.alignments?.[index] ?? "left"};padding:${table.padding}px;` +
        `word-break:break-word;overflow-wrap:break-word;vertical-align:top;${border}`;
    const caption = table.caption
        ? `<caption style="caption-side:top;text-align:left;font-weight:bold;` +
          `padding:0 0 10px;color:${table.headerTextColor}">${escapeHtml(table.caption)}</caption>`
        : "";
    const heading = table.showHeader
        ? `<tr>${table.headers.map((header, i) =>
            `<th scope="col" style="${columnStyle(i)}background-color:${table.headerBackground};` +
            `color:${table.headerTextColor};font-weight:700">${escapeHtml(header)}</th>`,
        ).join("")}</tr>` : "";
    const rows = table.rows.map((row, rowIndex) => {
        const background = table.striped && rowIndex % 2 === 1 ? table.stripeColor : "#ffffff";
        return `<tr>${row.map((cell, columnIndex) =>
            `<td style="${columnStyle(columnIndex)}background-color:${background};` +
            `color:${table.textColor}">${escapeHtml(cell)}</td>`,
        ).join("")}</tr>`;
    }).join("");
    // MJML mj-table creates the enclosing HTML <table>. Do not nest another table.
    return `${caption}${heading}${rows}`;
}
