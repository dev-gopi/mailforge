
import type {
    BuiltinTemplateName,
} from "../TemplateData.js";

import type {
    TemplateCategory,
} from "../registry/TemplateCatalog.js";

export type TemplateFieldType =
    | "text"
    | "integer"
    | "url"
    | "date"
    | "timestamp"
    | "array";

export interface TemplateContractField {
    readonly path: string;
    readonly type: TemplateFieldType;
    readonly required: boolean;
    readonly defaultValue?: string | number | boolean;
}

export interface TemplateContractDefinition<
    Name extends BuiltinTemplateName = BuiltinTemplateName
> {
    readonly id: Name;
    readonly version: string;
    readonly category: TemplateCategory;
    readonly dataDriven: boolean;
    readonly fields: readonly TemplateContractField[];
}
