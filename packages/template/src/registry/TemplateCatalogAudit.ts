import { DocumentValidator, type EmailDocument } from "@mailforge/core";
import { getBuiltinCatalogTemplate, listBuiltinTemplateCatalog } from "../BuiltinTemplates.js";

export interface CatalogIssue {
    readonly id: string;
    readonly message: string;
}
export interface CatalogAudit {
    readonly valid: boolean;
    readonly checked: number;
    readonly issues: readonly CatalogIssue[];
}

/** Check IDs, descriptions, version consistency and all structured documents. */
export function auditTemplateCatalog(): CatalogAudit {
    const validator = new DocumentValidator();
    const seen = new Set<string>();
    const issues: CatalogIssue[] = [];
    const check = (doc: EmailDocument, expectedId: string, expectedVersion: string): void => {
        if (seen.has(expectedId)) issues.push({ id: expectedId, message: "Duplicate ID" });
        seen.add(expectedId);
        if (doc.id !== expectedId || doc.version !== expectedVersion) {
            issues.push({ id: expectedId, message: "Catalog/document ID or version mismatch" });
        }
        const result = validator.validate(doc);
        issues.push(...result.errors.map(item => ({ id: expectedId, message: `${item.path}: ${item.message}` })));
    };
    for (const item of listBuiltinTemplateCatalog()) {
        if (!item.title || !item.description) issues.push({ id: item.id, message: "Missing metadata" });
        check(getBuiltinCatalogTemplate(item.id), item.id, item.version);
    }
    return { valid: issues.length === 0, checked: seen.size, issues };
}
