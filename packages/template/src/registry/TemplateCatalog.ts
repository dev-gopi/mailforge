
import type {
  EmailDocument,
} from "@mailforge/core";

import {
  BUILTIN_TEMPLATE_NAMES,
  type BuiltinTemplateName,
} from "../TemplateData.js";

import {
  buildWelcomeTemplate,
} from "../account/WelcomeTemplate.js";

import {
  buildInvitationTemplate,
} from "../account/InvitationTemplate.js";

import {
  buildOtpTemplate,
} from "../authentication/OtpTemplate.js";

import {
  buildLoginTemplate,
} from "../authentication/LoginTemplate.js";

import {
  buildPasswordResetTemplate,
} from "../authentication/PasswordResetTemplate.js";

import {
  buildNotificationTemplate,
} from "../notifications/NotificationTemplate.js";

import {
  buildInvoiceTemplate,
} from "../billing/InvoiceTemplate.js";

import {
  buildPaymentReceiptTemplate,
} from "../billing/PaymentReceiptTemplate.js";

import {
  buildOrderConfirmationTemplate,
} from "../ecommerce/OrderConfirmationTemplate.js";

import {
  buildSecurityAlertTemplate,
} from "../notifications/SecurityAlertTemplate.js";

export type TemplateCategory =
  | "account"
  | "authentication"
  | "billing"
  | "ecommerce"
  | "marketing"
  | "notifications";

export interface TemplateCatalogEntry {
  readonly id: BuiltinTemplateName;
  readonly version: string;
  readonly category: TemplateCategory;
  readonly title: string;
  readonly description: string;
  readonly dataDriven?: boolean;
}

interface InternalEntry {
  readonly info: TemplateCatalogEntry;
  readonly build: () => EmailDocument;
}

const CATALOG: Record<
  BuiltinTemplateName,
  InternalEntry
> = {
  welcome: {
    info: {
      id: "welcome",
      version: "1.0.0",
      category: "account",
      title: "Welcome Email",
      description: "New account onboarding",
    },
    build: buildWelcomeTemplate,
  },

  otp: {
    info: {
      id: "otp",
      version: "1.0.0",
      category: "authentication",
      title: "One-Time Password",
      description: "Verification code delivery",
    },
    build: buildOtpTemplate,
  },

  login: {
    info: {
      id: "login",
      version: "1.0.0",
      category: "authentication",
      title: "Login Link",
      description: "Secure sign-in link delivery",
    },
    build: buildLoginTemplate,
  },

  "password-reset": {
    info: {
      id: "password-reset",
      version: "1.0.0",
      category: "authentication",
      title: "Password Reset",
      description: "Password reset link delivery",
    },
    build: buildPasswordResetTemplate,
  },

  invitation: {
    info: {
      id: "invitation",
      version: "1.0.0",
      category: "account",
      title: "Organization Invitation",
      description: "Invitation to join an organization",
    },
    build: buildInvitationTemplate,
  },

  notification: {
    info: {
      id: "notification",
      version: "1.0.0",
      category: "notifications",
      title: "General Notification",
      description: "General actionable notification",
    },
    build: buildNotificationTemplate,
  },

  invoice: {
    info: {
      id: "invoice",
      version: "1.0.0",
      category: "billing",
      title: "Invoice",
      description: "Invoice and payment breakdown",
      dataDriven: true,
    },
    build: buildInvoiceTemplate,
  },

  "payment-receipt": {
    info: {
      id: "payment-receipt",
      version: "1.0.0",
      category: "billing",
      title: "Payment Receipt",
      description: "Confirmed payment receipt",
      dataDriven: true,
    },
    build: buildPaymentReceiptTemplate,
  },

  "order-confirmation": {
    info: {
      id: "order-confirmation",
      version: "1.0.0",
      category: "ecommerce",
      title: "Order Confirmation",
      description: "Purchased products and order totals",
      dataDriven: true,
    },
    build: buildOrderConfirmationTemplate,
  },

  "security-alert": {
    info: {
      id: "security-alert",
      version: "1.0.0",
      category: "notifications",
      title: "Security Alert",
      description: "Account security event notification",
      dataDriven: true,
    },
    build: buildSecurityAlertTemplate,
  },
};

/**
 * All built-ins, preserving the original five
 * IDs and their ordering at the beginning.
 */
export function listBuiltinTemplates():
  BuiltinTemplateName[] {
  return [...BUILTIN_TEMPLATE_NAMES];
}

export function listTemplateCatalog(
  category?: TemplateCategory,
): TemplateCatalogEntry[] {
  return BUILTIN_TEMPLATE_NAMES
    .map(name => CATALOG[name].info)
    .filter(item =>
      category === undefined ||
      item.category === category,
    )
    .map(item => ({ ...item }));
}

export function getBuiltinTemplateInfo(
  name: BuiltinTemplateName,
): TemplateCatalogEntry {
  return { ...CATALOG[name].info };
}

/**
 * Return a fresh document blueprint.
 *
 * Data-driven domain templates are materialized
 * through buildDomainTemplate() during rendering.
 */
export function getBuiltinTemplate(
  name: BuiltinTemplateName,
): EmailDocument {
  const entry = CATALOG[name];
  const document = entry.build();

  if (
    document.id !== entry.info.id ||
    document.version !== entry.info.version
  ) {
    throw new Error(
      `Built-in template catalog mismatch: ${name}`,
    );
  }

  return document;
}
