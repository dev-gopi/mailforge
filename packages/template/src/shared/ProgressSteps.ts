import type { EmailNode } from "@mailforge/core";

/** Email-safe horizontal milestones built from ordinary section/column/text/divider nodes.
 * Use for shipments, onboarding, approvals or any ordered progress display.
 * No raw HTML, layout-specific renderer, or global style mutation is required.
 */
export interface ProgressStepsOptions {
    id: string;
    steps: readonly string[];
    /** One-based index of the current milestone (0 means none completed). */
    currentStep: number;
    completedColor?: string;
    currentColor?: string;
    pendingColor?: string;
    labelColor?: string;
    fontFamily?: string;
}

export function buildProgressSteps(options: ProgressStepsOptions): EmailNode {
    const { id, steps, currentStep } = options;
    if (!/^[A-Za-z][A-Za-z0-9_-]{0,70}$/.test(id) ||
        steps.length < 2 || steps.length > 6 ||
        !Number.isInteger(currentStep) || currentStep < 0 || currentStep > steps.length ||
        steps.some(label => typeof label !== "string" || !label.trim() || label.length > 64 || /\p{Cc}/u.test(label))) {
        throw new Error("Invalid progress steps configuration");
    }
    const done = options.completedColor ?? "#3159D6";
    const current = options.currentColor ?? done;
    const pending = options.pendingColor ?? "#B9C3D6";
    const labelColor = options.labelColor ?? "#52668E";
    const fontFamily = options.fontFamily ?? "Arial, Helvetica, sans-serif";
    for (const color of [done, current, pending, labelColor]) {
        if (!/^#[\da-fA-F]{6}$/.test(color)) throw new Error("Invalid progress color");
    }
    return {
        id,
        type: "section",
        attrs: { "data-mf-columns": "keep-mobile" },
        styles: { padding: "0" },
        children: steps.map((label, index): EmailNode => {
            const state = index + 1 < currentStep ? "completed" : index + 1 === currentStep ? "current" : "pending";
            const color = state === "completed" ? done : state === "current" ? current : pending;
            return {
                id: `${id}-step-${index + 1}`, type: "column",
                styles: { width: `${100 / steps.length}%`, padding: "0" },
                children: [
                    { id: `${id}-symbol-${index + 1}`, type: "text", props: {
                        text: state === "completed" ? "✓" : state === "current" ? "●" : "○",
                    }, styles: { color, fontFamily, fontSize: 16, fontWeight: "bold", textAlign: "center", lineHeight: "26px", padding: "0 0 8px" } },
                    { id: `${id}-line-${index + 1}`, type: "divider", styles: { color: state === "pending" ? "#E6EAF1" : color, padding: "0", width: "100%" } },
                    { id: `${id}-label-${index + 1}`, type: "text", props: { text: label },
                        styles: { color: state === "current" ? current : state === "pending" ? pending : labelColor,
                            fontFamily, fontSize: 11, fontWeight: "bold", textAlign: "center", lineHeight: "17px", padding: "11px 0 0" } },
                ],
            };
        }),
    };
}
