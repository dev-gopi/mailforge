export { EmailEngine } from "./engine/EmailEngine.js";

export type {
    EmailBrand,
    EmailEngineConfig,
} from "./types/Engine.types.js";

export { DocumentValidator } from
    "./document/DocumentValidator.js";

export type {
    EmailDocument,
} from "./document/EmailDocument.js";

export type {
    EmailNode,
    EmailNodeType,
    EmailNodeValue,
    EmailAttributeValue,
} from "./document/EmailNode.js";

export type {
    DocumentValidationIssue,
    DocumentValidationResult,
} from "./document/DocumentValidator.js";

export {
    ComponentRegistry,
} from "./components/ComponentRegistry.js";

export {
    ComponentValidator,
} from "./components/ComponentValidator.js";

export {
    BUILTIN_COMPONENTS,
} from "./components/BuiltinComponents.js";

export type {
    ComponentDefinition,
    ComponentInfo,
    ComponentValidationIssue,
} from "./components/ComponentDefinition.js";

export type {
    ComponentValidationResult,
} from "./components/ComponentValidator.js";

export {
    DocumentCustomizer,
} from "./customization/DocumentCustomizer.js";

export type {
    DocumentPatch,
    EmailSlot,
    UpdatePatch,
    ReplacePatch,
    RemovePatch,
    InsertBeforePatch,
    InsertAfterPatch,
    SlotPatch,
} from "./customization/Patch.types.js";

export type {
    EmailRenderer,
    RenderOptions,
    RenderResult,
    RenderTrust,
    RenderWarning,
} from "./rendering/EmailRenderer.js";