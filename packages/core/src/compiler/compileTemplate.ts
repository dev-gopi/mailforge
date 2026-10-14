/**
 * HTML-escapes string content to prevent XSS vulnerabilities in email clients.
 */
export function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) {
    return "";
  }
  const str = String(input);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Safely resolves nested property paths (e.g. "user.profile.name") from context.
 */
function resolvePath(context: Record<string, unknown>, path: string): unknown {
  const cleanPath = path.trim();
  if (!cleanPath) return undefined;

  // Handle literal fallback: {{ name || "Default" }}
  const fallbackMatch = cleanPath.match(/^(.+?)\s*(?:\|\||\?\?)\s*['"](.*)['"]$/);
  if (fallbackMatch && typeof fallbackMatch[1] === "string" && typeof fallbackMatch[2] === "string") {
    const mainVal = resolvePath(context, fallbackMatch[1]);
    if (mainVal !== undefined && mainVal !== null && mainVal !== "") {
      return mainVal;
    }
    return fallbackMatch[2];
  }

  const parts = cleanPath.split(".");
  let current: unknown = context;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Compiled template render function.
 */
export type TemplateRenderer = (variables?: Record<string, unknown>) => string;

/**
 * Evaluates template string with variables, supporting conditionals and loops.
 */
function renderInternal(template: string, scope: Record<string, unknown>): string {
  // 1. Process #if / #unless blocks
  let result = template.replace(
    /\{\{#(if|unless)\s+([a-zA-Z0-9_.]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/\1\}\}/g,
    (_, tag: string, varPath: string, thenBlock: string, elseBlock: string = "") => {
      const val = resolvePath(scope, varPath);
      const isTruthy = Boolean(val) && (!Array.isArray(val) || val.length > 0);
      const shouldRenderThen = tag === "if" ? isTruthy : !isTruthy;
      return shouldRenderThen
        ? renderInternal(thenBlock, scope)
        : renderInternal(elseBlock, scope);
    },
  );

  // 2. Process #each blocks
  result = result.replace(
    /\{\{#each\s+([a-zA-Z0-9_.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_, varPath: string, itemBlock: string) => {
      const items = resolvePath(scope, varPath);
      if (!Array.isArray(items) || items.length === 0) {
        return "";
      }

      return items
        .map((item, index) => {
          const itemScope: Record<string, unknown> = {
            ...scope,
            "@index": index,
            "@first": index === 0,
            "@last": index === items.length - 1,
            this: item,
            ...(typeof item === "object" && item !== null ? item : {}),
          };
          return renderInternal(itemBlock, itemScope);
        })
        .join("");
    },
  );

  // 3. Process raw unescaped interpolations: {{{ raw }}} or {{& raw }}
  result = result.replace(/\{\{\{\s*([^{}]+?)\s*\}\}\}|\{\{&\s*([^{}]+?)\s*\}\}/g, (_, p1, p2) => {
    const prop = (p1 || p2) as string;
    const value = resolvePath(scope, prop);
    return value !== undefined && value !== null ? String(value) : "";
  });

  // 4. Process standard HTML-escaped interpolations: {{ var }}
  result = result.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, prop: string) => {
    const value = resolvePath(scope, prop);
    return value !== undefined && value !== null ? escapeHtml(value) : "";
  });

  return result;
}

/**
 * Compiles a template into a reusable rendering function or evaluates it directly with variables.
 *
 * @example
 * // Direct execution:
 * const html = compileTemplate("<h1>Hello {{ name }}</h1>", { name: "World" });
 *
 * // Pre-compiled reusable function:
 * const render = compileTemplate("<h1>Hello {{ name }}</h1>");
 * const html = render({ name: "World" });
 */
export function compileTemplate(
  template: string,
  variables: Record<string, unknown>,
): string;
export function compileTemplate(
  template: string,
): TemplateRenderer;
export function compileTemplate(
  template: string,
  variables?: Record<string, unknown>,
): string | TemplateRenderer {
  if (variables !== undefined) {
    return renderInternal(template, variables);
  }

  return (scope: Record<string, unknown> = {}) => renderInternal(template, scope);
}
