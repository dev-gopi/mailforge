
export {
    ComponentCatalog,
} from "./registry/ComponentCatalog.js";

export {
    ComponentCatalogError,
    ComponentRenderError,
} from "./contracts/ComponentRenderError.js";

export type {
    ComponentCatalogErrorCode,
} from "./contracts/ComponentRenderError.js";

export type {
    ComponentRenderContext,
    ComponentRenderOutput,
    ComponentRenderHandler,
    ReusableComponentDefinition,
} from "./contracts/ComponentRenderer.types.js";

export {
    ComponentExpander,
} from "./registry/ComponentExpander.js";

export {
    createStatusBadgeDefinition,
} from "./typography/StatusBadge.js";

export {
    createOtpCodeDefinition,
} from "./security/OtpCode.js";

export {
    createSecurityNoticeDefinition,
} from "./security/SecurityNotice.js";

export {
    createActionButtonDefinition,
} from "./actions/ActionButton.js";

export {
    createBrandLogoDefinition,
} from "./company/BrandLogo.js";

export {
    createImageCaptionDefinition,
} from "./media/ImageCaption.js";

export {
    STANDARD_COMPONENT_NAMES,
    getStandardComponentDefinitions,
    registerStandardComponents,
} from "./registry/StandardComponents.js";


export {
    formatMoney,
    calculateOrderTotal,
    currencySchema,
    centsSchema,
    orderItemSchema,
} from "./commerce/Money.js";

export type {
    SupportedCurrency,
} from "./commerce/Money.js";

export {
    createContentCardDefinition,
} from "./layout/ContentCard.js";

export {
    createTwoColumnLayoutDefinition,
} from "./layout/TwoColumnLayout.js";

export {
    createButtonGroupDefinition,
} from "./actions/ButtonGroup.js";

export {
    createPriceSummaryDefinition,
} from "./commerce/PriceSummary.js";

export {
    createOrderItemDefinition,
} from "./commerce/OrderItem.js";

export {
    createOrderSummaryDefinition,
} from "./commerce/OrderSummary.js";

export {
    COMPOSITE_COMPONENT_NAMES,
    getCompositeComponentDefinitions,
    registerCompositeComponents,
} from "./registry/CompositeComponents.js";

export {
    createCalloutBoxDefinition,
} from "./feedback/CalloutBox.js";

export {
    createKeyValueListDefinition,
} from "./layout/KeyValueList.js";

export {
    createDividerWithTextDefinition,
} from "./layout/DividerWithText.js";

export {
    createSocialLinksDefinition,
} from "./actions/SocialLinks.js";

export {
    EXTENDED_COMPONENT_NAMES,
    getExtendedComponentDefinitions,
    registerExtendedComponents,
    registerAllComponents,
} from "./registry/ExtendedComponents.js";


// Stage 8: Optional professional reusable components
export {
    createHeroSectionDefinition, createStatisticBlockDefinition,
    createProgressTimelineDefinition, createCompanySignatureDefinition,
    PROFESSIONAL_COMPONENT_NAMES, getProfessionalComponentDefinitions,
    registerProfessionalComponents,
} from "./professional/ProfessionalComponents.js";

export { BUSINESS_COMPONENT_NAMES, getBusinessComponentDefinitions, registerBusinessComponents } from "./business/BusinessComponents.js";
