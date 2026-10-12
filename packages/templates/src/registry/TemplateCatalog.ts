import type { EmailDocument } from "@mailforge/core";

import {
  BUILTIN_TEMPLATE_NAMES,
  type BuiltinTemplateName,
} from "../TemplateData.js";

import { buildWelcomeTemplate } from "../account/WelcomeTemplate.js";

import { buildInvitationTemplate } from "../account/InvitationTemplate.js";

import { buildOtpTemplate } from "../authentication/OtpTemplate.js";

import { buildPasswordResetTemplate } from "../authentication/PasswordResetTemplate.js";

import { buildNotificationTemplate } from "../notifications/NotificationTemplate.js";

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
}

interface InternalEntry {
  readonly info: TemplateCatalogEntry;
  readonly build: () => EmailDocument;
}

const CATALOG: Record<BuiltinTemplateName, InternalEntry> = {
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
};

/**
 * Preserve the original five built-in IDs
 * and their published ordering.
 */
export function listBuiltinTemplates(): BuiltinTemplateName[] {
  return [...BUILTIN_TEMPLATE_NAMES];
}

/**
 * Discover templates, optionally by category.
 */
export function listTemplateCatalog(
  category?: TemplateCategory,
): TemplateCatalogEntry[] {
  const items: TemplateCatalogEntry[] = [];

  for (const name of BUILTIN_TEMPLATE_NAMES) {
    const item = CATALOG[name].info;

    if (category === undefined || item.category === category) {
      items.push({ ...item });
    }
  }

  return items;
}

/**
 * Return isolated metadata.
 */
export function getBuiltinTemplateInfo(
  name: BuiltinTemplateName,
): TemplateCatalogEntry {
  return { ...CATALOG[name].info };
}

/**
 * Build a fresh document each time.
 */
export function getBuiltinTemplate(name: BuiltinTemplateName): EmailDocument {
  const entry = CATALOG[name];
  const document = entry.build();

  if (
    document.id !== entry.info.id ||
    document.version !== entry.info.version
  ) {
    throw new Error(`Built-in template catalog mismatch: ${name}`);
  }

  return document;
}
