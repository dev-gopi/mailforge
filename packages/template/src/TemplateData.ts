import {
  DOMAIN_TEMPLATE_NAMES,
  DOMAIN_TEMPLATE_SCHEMAS,
  assertPlainTemplateData,
  type DomainTemplateDataMap,
  type DomainTemplateName,
  type ParsedDomainTemplateDataMap,
} from "./DomainTemplateData.js";

export const BUILTIN_TEMPLATE_NAMES = [
  "welcome",
  "otp",
  "password-reset",
  "invitation",
  "notification",
  ...DOMAIN_TEMPLATE_NAMES,
] as const;

export type BuiltinTemplateName = (typeof BUILTIN_TEMPLATE_NAMES)[number];

export interface BuiltinTemplateDataMap extends DomainTemplateDataMap {
  welcome: {
    user: {
      firstName: string;
    };
    actionUrl: string;
  };

  otp: {
    code: string;
    expiresInMinutes: number;
  };

  "password-reset": {
    user: {
      firstName: string;
    };
    resetUrl: string;
    expiresInMinutes: number;
  };

  invitation: {
    invitee: {
      firstName: string;
    };
    inviterName: string;
    organizationName: string;
    inviteUrl: string;
  };

  notification: {
    title: string;
    message: string;
    actionUrl: string;
  };
}

export class BuiltinTemplateDataError extends Error {
  public readonly code = "EMAIL_BUILTIN_DATA_INVALID";

  constructor(
    public readonly field: string,
    reason: string,
  ) {
    super(`Invalid built-in email data at "${field}": ${reason}`);
    this.name = "BuiltinTemplateDataError";
  }
}


/**
 * Parse and validate one new domain template.
 * Converts schema errors to the existing
 * MailForge built-in data error format.
 */
export function parseDomainTemplateData<
  Name extends DomainTemplateName
>(
  name: Name,
  input: unknown,
): ParsedDomainTemplateDataMap[Name] {
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

  const result =
    DOMAIN_TEMPLATE_SCHEMAS[name].safeParse(input);

  if (!result.success) {
    const issue = result.error.issues[0];

    const location = issue?.path.reduce<string>(
      (path, part) =>
        typeof part === "number"
          ? `${path}[${part}]`
          : `${path}.${String(part)}`,
      "data",
    ) ?? "data";

    throw new BuiltinTemplateDataError(
      location,
      issue?.message ?? "Invalid template data",
    );
  }

  return result.data as ParsedDomainTemplateDataMap[Name];
}

export function isBuiltinTemplateName(
  name: string,
): name is BuiltinTemplateName {
  return (BUILTIN_TEMPLATE_NAMES as readonly string[]).includes(name);
}

function plainObject(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new BuiltinTemplateDataError(path, "must be an object");
  }

  const prototype = Object.getPrototypeOf(value);

  if (prototype !== Object.prototype && prototype !== null) {
    throw new BuiltinTemplateDataError(path, "must be a plain object");
  }

  return value as Record<string, unknown>;
}

/**
 * Read only own data properties.
 * Never invoke user-supplied getters.
 */
function field(object: Record<string, unknown>, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(object, name);

  return descriptor && "value" in descriptor ? descriptor.value : undefined;
}

function requiredText(value: unknown, path: string, max = 160): void {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > max ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new BuiltinTemplateDataError(
      path,
      `must be non-empty text of at most ${max} characters`,
    );
  }
}

function requiredHttps(value: unknown, path: string): void {
  requiredText(value, path, 2048);

  let url: URL;

  try {
    url = new URL(value as string);
  } catch {
    throw new BuiltinTemplateDataError(path, "must be a valid HTTPS URL");
  }

  if (
    url.protocol !== "https:" ||
    !url.hostname ||
    url.username ||
    url.password
  ) {
    throw new BuiltinTemplateDataError(
      path,
      "must be HTTPS without credentials",
    );
  }
}

function requiredExpiration(value: unknown, path: string): void {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 60
  ) {
    throw new BuiltinTemplateDataError(
      path,
      "must be an integer between 1 and 60 minutes",
    );
  }
}

/**
 * Validate built-in data before interpolation.
 *
 * This is separate from the generic variable engine,
 * which validates the actual resolved document.
 */
export function assertBuiltinTemplateData(
  name: BuiltinTemplateName,
  input: unknown,
): void {
  const data = plainObject(input, "data");

  switch (name) {
    case "welcome": {
      const user = plainObject(field(data, "user"), "data.user");

      requiredText(field(user, "firstName"), "data.user.firstName", 80);

      requiredHttps(field(data, "actionUrl"), "data.actionUrl");

      return;
    }

    case "otp": {
      const code = field(data, "code");

      if (typeof code !== "string" || !/^[0-9]{4,10}$/.test(code)) {
        throw new BuiltinTemplateDataError(
          "data.code",
          "must be a 4–10 digit string",
        );
      }

      requiredExpiration(
        field(data, "expiresInMinutes"),
        "data.expiresInMinutes",
      );

      return;
    }

    case "password-reset": {
      const user = plainObject(field(data, "user"), "data.user");

      requiredText(field(user, "firstName"), "data.user.firstName", 80);

      requiredHttps(field(data, "resetUrl"), "data.resetUrl");

      requiredExpiration(
        field(data, "expiresInMinutes"),
        "data.expiresInMinutes",
      );

      return;
    }

    case "invitation": {
      const invitee = plainObject(field(data, "invitee"), "data.invitee");

      requiredText(field(invitee, "firstName"), "data.invitee.firstName", 80);

      requiredText(field(data, "inviterName"), "data.inviterName", 120);

      requiredText(
        field(data, "organizationName"),
        "data.organizationName",
        120,
      );

      requiredHttps(field(data, "inviteUrl"), "data.inviteUrl");

      return;
    }

    case "notification": {
      requiredText(field(data, "title"), "data.title", 140);

      requiredText(field(data, "message"), "data.message", 2000);

      requiredHttps(field(data, "actionUrl"), "data.actionUrl");

      return;
    }

    case "invoice":
    case "payment-receipt":
    case "order-confirmation":
    case "security-alert": {
      parseDomainTemplateData(name, input);
      return;
    }
  }
}
