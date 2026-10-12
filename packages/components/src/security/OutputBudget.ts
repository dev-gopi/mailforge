
import {
    ComponentRenderError,
} from "../contracts/ComponentRenderError.js";

const MAX_BYTES = 256 * 1024;
const MAX_DEPTH = 32;
const MAX_ENTRIES = 8_000;
const MAX_ARRAY_ITEMS = 1_000;

/**
 * Check handler output before structuredClone()
 * or recursive component normalization.
 *
 * This does not sandbox handler JavaScript.
 */
export function assertBoundedHandlerOutput(
    output: unknown,
    componentName: string,
): void {
    const encoder = new TextEncoder();
    const ancestors = new WeakSet<object>();

    let totalBytes = 0;
    let totalEntries = 0;

    function reject(reason: string): never {
        throw new ComponentRenderError(
            componentName,
            reason,
        );
    }

    function addBytes(text: string): void {
        totalBytes += encoder.encode(text).byteLength;

        if (totalBytes > MAX_BYTES) {
            reject("Handler output exceeds byte budget");
        }
    }

    function visit(
        value: unknown,
        depth: number,
    ): void {
        if (depth > MAX_DEPTH) {
            reject("Handler output exceeds nesting budget");
        }

        if (value === null) return;

        if (typeof value === "string") {
            addBytes(value);
            return;
        }

        if (typeof value === "boolean") return;

        if (typeof value === "number") {
            if (!Number.isFinite(value)) {
                reject("Handler output contains a non-finite number");
            }

            return;
        }

        // Leave top-level invalid return types to
        // ComponentExpander's existing error handling.
        if (typeof value !== "object") {
            reject("Handler output contains an unsupported value");
        }

        if (ancestors.has(value)) {
            reject("Cyclic handler output detected");
        }

        const array = Array.isArray(value);

        if (
            !array &&
            Object.getPrototypeOf(value) !== Object.prototype &&
            Object.getPrototypeOf(value) !== null
        ) {
            reject("Handler output must use plain objects");
        }

        if (array && value.length > MAX_ARRAY_ITEMS) {
            reject("Handler output exceeds array item budget");
        }

        ancestors.add(value);

        const keys = Reflect.ownKeys(value);

        totalEntries += keys.length;

        if (totalEntries > MAX_ENTRIES) {
            reject("Handler output exceeds property budget");
        }

        const descriptors = Object.getOwnPropertyDescriptors(
            value,
        );

        for (const key of keys) {
            if (typeof key !== "string") {
                reject("Handler output contains symbol properties");
            }

            addBytes(key);

            const descriptor = descriptors[key];

            if (!descriptor || !("value" in descriptor)) {
                reject("Handler output contains accessor properties");
            }

            visit(descriptor.value, depth + 1);
        }

        ancestors.delete(value);
    }

    // Preserve previous errors for obviously invalid
    // handler return types.
    if (
        output === null ||
        typeof output !== "object"
    ) {
        return;
    }

    visit(output, 0);
}
