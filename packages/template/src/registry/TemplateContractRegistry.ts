
import {
    BUILTIN_TEMPLATE_NAMES,
    BuiltinTemplateDataError,
    type BuiltinTemplateName,
    type BuiltinTemplateDataMap,
} from "../TemplateData.js";

import {
    DOMAIN_TEMPLATE_SCHEMAS,
    assertPlainTemplateData,
} from "../DomainTemplateData.js";

import {
    LEGACY_TEMPLATE_SCHEMAS,
} from "../contracts/LegacyTemplateSchemas.js";

import type {
    TemplateContractDefinition,
    TemplateContractField,
    TemplateFieldType,
} from "../contracts/TemplateContract.types.js";

import {
    getBuiltinTemplateInfo,
} from "./TemplateCatalog.js";

import type {
    DomainTemplateName,
    ParsedDomainTemplateDataMap,
} from "../DomainTemplateData.js";

export type ValidatedBuiltinTemplateDataMap =
    Omit<BuiltinTemplateDataMap, DomainTemplateName> &
    ParsedDomainTemplateDataMap;

const SCHEMAS = {
    ...LEGACY_TEMPLATE_SCHEMAS,
    ...DOMAIN_TEMPLATE_SCHEMAS,
};

function required(
    path: string,
    type: TemplateFieldType,
): TemplateContractField {
    return { path, type, required: true };
}

function optional(
    path: string,
    type: TemplateFieldType,
    defaultValue?: string | number | boolean,
): TemplateContractField {
    return {
        path,
        type,
        required: false,
        ...(defaultValue !== undefined
            ? { defaultValue }
            : {}),
    };
}

/**
 * Public field descriptions.
 *
 * A full runtime schema is maintained separately
 * in SCHEMAS and remains the validation authority.
 */
const FIELDS: Record<
    BuiltinTemplateName,
    readonly TemplateContractField[]
> = {
    welcome: [
        required("user.firstName", "text"),
        required("actionUrl", "url"),
    ],

    otp: [
        required("code", "text"),
        required("expiresInMinutes", "integer"),
    ],

    "password-reset": [
        required("user.firstName", "text"),
        required("resetUrl", "url"),
        required("expiresInMinutes", "integer"),
    ],

    invitation: [
        required("invitee.firstName", "text"),
        required("inviterName", "text"),
        required("organizationName", "text"),
        required("inviteUrl", "url"),
    ],

    notification: [
        required("title", "text"),
        required("message", "text"),
        required("actionUrl", "url"),
    ],

    invoice: [
        required("customer.name", "text"),
        required("invoice.number", "text"),
        required("invoice.issuedOn", "date"),
        required("invoice.dueOn", "date"),
        required("invoice.currency", "text"),
        required("invoice.items", "array"),
        optional("invoice.shippingCents", "integer", 0),
        optional("invoice.discountCents", "integer", 0),
        required("paymentUrl", "url"),
    ],

    "payment-receipt": [
        required("customer.name", "text"),
        required("receipt.number", "text"),
        required("receipt.transactionId", "text"),
        required("receipt.paidOn", "date"),
        required("receipt.currency", "text"),
        required("receipt.items", "array"),
        optional("receipt.shippingCents", "integer", 0),
        optional("receipt.discountCents", "integer", 0),
        required("receiptUrl", "url"),
    ],

    "order-confirmation": [
        required("customer.firstName", "text"),
        required("order.id", "text"),
        required("order.placedOn", "date"),
        required("order.currency", "text"),
        required("order.items", "array"),
        optional("order.shippingCents", "integer", 0),
        optional("order.discountCents", "integer", 0),
        required("orderUrl", "url"),
    ],

    "security-alert": [
        required("user.firstName", "text"),
        required("alert.kind", "text"),
        required("alert.occurredAt", "timestamp"),
        required("alert.device", "text"),
        optional("alert.location", "text"),
        optional("alert.severity", "text", "warning"),
        required("reviewUrl", "url"),
    ],
};

/**
 * Central discovery and validation for all
 * nine built-in email templates.
 */
export class TemplateContractRegistry {
    public list(): TemplateContractDefinition[] {
        return BUILTIN_TEMPLATE_NAMES.map(
            name => this.get(name),
        );
    }

    public get<Name extends BuiltinTemplateName>(
        name: Name,
    ): TemplateContractDefinition<Name> {
        const info = getBuiltinTemplateInfo(name);

        return {
            id: name,
            version: info.version,
            category: info.category,
            dataDriven: info.dataDriven === true,
            fields: FIELDS[name].map(field => ({ ...field })),
        };
    }

    public validate<Name extends BuiltinTemplateName>(
        name: Name,
        input: unknown,
    ): ValidatedBuiltinTemplateDataMap[Name] {
        // Prevent Zod or future validation logic from
        // invoking getters inside untrusted data.
        try {
            assertPlainTemplateData(input);
        } catch (error) {
            throw new BuiltinTemplateDataError(
                "data",
                error instanceof Error
                    ? error.message
                    : "Invalid template data",
            );
        }

        const result = SCHEMAS[name].safeParse(input);

        if (!result.success) {
            const issue = result.error.issues[0];

            const path = issue?.path.reduce<string>(
                (current, segment) =>
                    typeof segment === "number"
                        ? `${current}[${segment}]`
                        : `${current}.${String(segment)}`,
                "data",
            ) ?? "data";

            throw new BuiltinTemplateDataError(
                path,
                issue?.message ?? "Invalid template data",
            );
        }

        return result.data as ValidatedBuiltinTemplateDataMap[Name];
    }
}
