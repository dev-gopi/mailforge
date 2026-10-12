import type { z } from "zod";
import type {
    EmailNodeValue,
} from "../document/EmailNode.js";

export interface ComponentDefinition {
    // Unique component name
    name: string;

    // Component version
    version: string;

    // Description for developers
    description?: string;

    // Validates component properties
    schema: z.ZodType;

    // Default property values
    defaults?: Record<string, EmailNodeValue> | undefined;

    // Whether nested components are allowed
    allowChildren?: boolean;
}

export interface ComponentInfo {
    name: string;
    version: string;
    description?: string;
}

export interface ComponentValidationIssue {
    path: string;
    message: string;
}
