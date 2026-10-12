import juice from "juice";

/**
 * Trusted CSS processing for developer-authored HTML. This is a formatting
 * utility, not a sanitizer or sandbox. The caller must enforce a trust policy.
 */
export class CssProcessor {
    public process(html: string, css = "", inline = true): string {
        if (css.includes("<") || css.includes("\0")) {
            throw new Error("CSS must not contain HTML markup");
        }
        if (inline) {
            return juice(html, {
                applyStyleTags: true,
                removeStyleTags: false,
                extraCss: css,
            });
        }
        if (!css) return html;
        const style = `<style>${css}</style>`;
        return /<\/head\s*>/i.test(html)
            ? html.replace(/<\/head\s*>/i, () => `${style}</head>`)
            : style + html;
    }
}
