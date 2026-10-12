
/**
 * Data supplied by the application when rendering.
 */
export type TemplateData = Record<string, unknown>;

export type VariableErrorCode =
    | "EMAIL_VARIABLE_MISSING"
    | "EMAIL_VARIABLE_INVALID"
    | "EMAIL_VARIABLE_UNSAFE_URL"
    | "EMAIL_VARIABLE_UNSUPPORTED_CONTEXT";

export interface VariableIssue {
    code: VariableErrorCode;
    location: string;
    variable?: string;
    message: string;
}

export class EmailVariableError extends Error {
    public readonly code: VariableErrorCode;
    public readonly issues: readonly VariableIssue[];

    constructor(issues: VariableIssue[]) {
        const message = issues
            .map(
                (issue) =>
                    `${issue.location}: ${issue.message}`,
            )
            .join("\n");

        super(`Email variable resolution failed:\n${message}`);

        this.name = "EmailVariableError";
        this.code = issues[0]?.code ?? "EMAIL_VARIABLE_INVALID";
        this.issues = issues;
    }
}
