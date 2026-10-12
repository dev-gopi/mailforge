
import type {
    ThemeOverrides,
} from "../theme/Theme.types.js";

import type {
    EmailLayoutOptions,
} from "../layout/Layout.types.js";

/**
 * Merge partial theme token groups.
 *
 * Later arguments have greater precedence.
 */
export function mergeThemeOverrides(
    ...sources: readonly (ThemeOverrides | undefined)[]
): ThemeOverrides {
    const result: ThemeOverrides = {};

    for (const source of sources) {
        if (source === undefined) continue;

        if (source.colors !== undefined) {
            result.colors = {
                ...result.colors,
                ...source.colors,
            };
        }

        if (source.typography !== undefined) {
            result.typography = {
                ...result.typography,
                ...source.typography,
            };
        }

        if (source.spacing !== undefined) {
            result.spacing = {
                ...result.spacing,
                ...source.spacing,
            };
        }
    }

    return result;
}

/**
 * Merge partial header/footer/copyright settings.
 * Later arguments have greater precedence.
 */
export function mergeLayoutOverrides(
    ...sources: readonly (EmailLayoutOptions | undefined)[]
): EmailLayoutOptions {
    const result: EmailLayoutOptions = {};

    for (const source of sources) {
        if (source === undefined) continue;

        if (source.header !== undefined) {
            result.header = {
                ...result.header,
                ...source.header,
                ...(source.header.attrs !== undefined
                    ? {
                        attrs: {
                            ...result.header?.attrs,
                            ...source.header.attrs,
                        },
                    }
                    : {}),
            };
        }

        if (source.footer !== undefined) {
            result.footer = {
                ...result.footer,
                ...source.footer,
                ...(source.footer.attrs !== undefined
                    ? {
                        attrs: {
                            ...result.footer?.attrs,
                            ...source.footer.attrs,
                        },
                    }
                    : {}),
            };
        }

        if (source.copyright !== undefined) {
            result.copyright = {
                ...result.copyright,
                ...source.copyright,
                ...(source.copyright.attrs !== undefined
                    ? {
                        attrs: {
                            ...result.copyright?.attrs,
                            ...source.copyright.attrs,
                        },
                    }
                    : {}),
            };
        }
    }

    return result;
}
