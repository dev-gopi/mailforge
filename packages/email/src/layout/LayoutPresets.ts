import type { EmailLayoutOptions } from "./Layout.types.js";
import type { ThemeOverrides } from "../theme/Theme.types.js";

/** These are visual email-layout profiles, not separate template IDs. */
export const LAYOUT_PRESET_NAMES = [
    "transactional",
    "marketing",
    "billing",
    "notification",
] as const;

export type LayoutPresetName = typeof LAYOUT_PRESET_NAMES[number];

export interface LayoutPresetDefinition {
    readonly name: LayoutPresetName;
    readonly description: string;
    readonly layout: EmailLayoutOptions;
    readonly theme: ThemeOverrides;
}

export class EmailLayoutPresetError extends Error {
    public readonly code = "EMAIL_LAYOUT_PRESET_INVALID";

    constructor(value: unknown) {
        super(`Unknown MailForge layout preset: ${String(value)}`);
        this.name = "EmailLayoutPresetError";
    }
}

/**
 * Email-client-safe, content-neutral layout profiles.
 *
 * - Never embed custom HTML, CSS or application-specific content.
 * - Preserve the engine's brand colors and existing document structure.
 * - Use the existing theme and layout validators at render time.
 * - Opt-in: legacy rendering is unchanged when no layoutPreset is supplied.
 */
const PRESETS: Record<LayoutPresetName, LayoutPresetDefinition> = {
    transactional: {
        name: "transactional",
        description: "Balanced layout for account actions, OTP and confirmations",
        // No forced sections: respect global header/footer visibility.
        layout: {},
        theme: {
            appearance: {
                containerWidth: 600,
                contentPadding: 32,
                cardRadius: 10,
                cardPadding: 24,
                buttonRadius: 8,
                buttonPaddingX: 24,
                buttonPaddingY: 14,
            },
            typography: { headingSize: 28 },
        },
    },
    marketing: {
        name: "marketing",
        description: "Spacious layout for newsletters, promotions and campaigns",
        // No forced sections: respect global header/footer visibility.
        layout: {},
        theme: {
            appearance: {
                containerWidth: 640,
                contentPadding: 36,
                cardRadius: 14,
                cardPadding: 28,
                buttonRadius: 10,
                buttonPaddingX: 30,
                buttonPaddingY: 16,
            },
            typography: { headingSize: 32 },
        },
    },
    billing: {
        name: "billing",
        description: "Dense, orderly layout for invoices and payment details",
        // No forced sections: respect global header/footer visibility.
        layout: {},
        theme: {
            appearance: {
                containerWidth: 620,
                contentPadding: 36,
                cardRadius: 8,
                cardPadding: 28,
                buttonRadius: 6,
                buttonPaddingX: 24,
                buttonPaddingY: 14,
            },
            typography: { headingSize: 27 },
        },
    },
    notification: {
        name: "notification",
        description: "Compact layout for service notifications and alerts",
        // No forced sections: respect global header/footer visibility.
        layout: {},
        theme: {
            appearance: {
                containerWidth: 560,
                contentPadding: 28,
                cardRadius: 8,
                cardPadding: 20,
                buttonRadius: 6,
                buttonPaddingX: 20,
                buttonPaddingY: 12,
            },
            typography: { headingSize: 24 },
        },
    },
};

export function listLayoutPresets(): LayoutPresetName[] {
    return [...LAYOUT_PRESET_NAMES];
}

/** Always clone: callers cannot mutate shared presets or other engines. */
export function getLayoutPreset(name: LayoutPresetName): LayoutPresetDefinition {
    if (typeof name !== "string" || !Object.hasOwn(PRESETS, name)) {
        throw new EmailLayoutPresetError(name);
    }
    return structuredClone(PRESETS[name]);
}
