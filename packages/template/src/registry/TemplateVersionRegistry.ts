import {
  DocumentValidator,
  type EmailDocument,
} from "@mailforge/core";

export class TemplateVersionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateVersionError";
  }
}

export type TemplateVersionStatus =
  | "active"
  | "deprecated";

export interface TemplateVersionInfo {
  readonly id: string;
  readonly version: string;
  readonly status: TemplateVersionStatus;
  readonly deprecationReason?: string;
}

export interface TemplateVersionSelection {
  readonly version?: string;
  readonly compatibleWith?: string;
  readonly includeDeprecated?: boolean;
}

type VersionParts = readonly [
  number,
  number,
  number,
];

interface StoredVersion {
  readonly document: EmailDocument;
  status: TemplateVersionStatus;
  deprecationReason?: string;
}

function parseVersion(value: string): VersionParts {
  if (
    !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)
  ) {
    throw new TemplateVersionError(
      `Invalid template version: ${value}. Expected MAJOR.MINOR.PATCH`,
    );
  }

  const parts = value.split(".").map(Number);

  if (
    parts.length !== 3 ||
    parts.some(part => !Number.isSafeInteger(part))
  ) {
    throw new TemplateVersionError(
      `Invalid template version: ${value}`,
    );
  }

  return [parts[0]!, parts[1]!, parts[2]!];
}

function compareVersions(
  left: string,
  right: string,
): number {
  const a = parseVersion(left);
  const b = parseVersion(right);

  for (let i = 0; i < 3; i++) {
    if (a[i]! !== b[i]!) {
      return a[i]! < b[i]! ? -1 : 1;
    }
  }

  return 0;
}

/**
 * Basic SemVer compatibility:
 * - 1.x and higher: same major version
 * - 0.x: same minor version
 * - 0.0.x: exact patch
 *
 * Prereleases and range expressions are not
 * supported in this initial implementation.
 */
function isCompatible(
  version: string,
  baseline: string,
): boolean {
  const candidate = parseVersion(version);
  const required = parseVersion(baseline);

  if (compareVersions(version, baseline) < 0) {
    return false;
  }

  if (candidate[0] !== required[0]) {
    return false;
  }

  if (required[0] > 0) {
    return true;
  }

  if (candidate[1] !== required[1]) {
    return false;
  }

  return (
    required[1] > 0 ||
    candidate[2] === required[2]
  );
}

export class TemplateVersionRegistry {
  private readonly validator =
    new DocumentValidator();

  private readonly versions =
    new Map<
      string,
      Map<string, StoredVersion>
    >();

  public register(
    document: EmailDocument,
  ): this {
    this.validator.validateOrThrow(document);
    parseVersion(document.version);

    const items =
      this.versions.get(document.id) ??
      new Map<string, StoredVersion>();

    if (items.has(document.version)) {
      throw new TemplateVersionError(
        `Template version already registered: ${document.id}@${document.version}`,
      );
    }

    items.set(document.version, {
      document: structuredClone(document),
      status: "active",
    });

    this.versions.set(document.id, items);

    return this;
  }

  public get(
    id: string,
    version: string,
  ): EmailDocument {
    const stored =
      this.versions.get(id)?.get(version);

    if (!stored) {
      throw new TemplateVersionError(
        `Template version not found: ${id}@${version}`,
      );
    }

    return structuredClone(stored.document);
  }

  public list(
    id: string,
  ): TemplateVersionInfo[] {
    const items = this.versions.get(id);

    if (!items) {
      return [];
    }

    return [...items.entries()]
      .sort(
        ([a], [b]) => compareVersions(b, a),
      )
      .map(([version, item]) => ({
        id,
        version,
        status: item.status,
        ...(item.deprecationReason === undefined
          ? {}
          : {
              deprecationReason:
                item.deprecationReason,
            }),
      }));
  }

  /**
   * Create an immutable new version from an existing published version.
   * The source remains unchanged. Deprecation happens only after
   * the new version has been validated and registered successfully.
   */
  public migrate(
    id: string,
    fromVersion: string,
    toVersion: string,
    customize: (draft: EmailDocument) => EmailDocument | void,
    options: {
      readonly deprecateSource?: boolean;
      readonly reason?: string;
    } = {},
  ): this {
    if (typeof customize !== "function") {
      throw new TemplateVersionError("Migration customize must be a function");
    }
    if (compareVersions(toVersion, fromVersion) <= 0) {
      throw new TemplateVersionError(
        `Migration target must be newer: ${fromVersion} -> ${toVersion}`,
      );
    }

    // get() returns a clone; no callback can change the published source.
    const draft = this.get(id, fromVersion);
    const modified = customize(draft) ?? draft;
    if (
      modified === null ||
      typeof modified !== "object" ||
      modified.id !== id ||
      !Array.isArray(modified.body) ||
      (modified.version !== fromVersion && modified.version !== toVersion)
    ) {
      throw new TemplateVersionError(
        `Migration must preserve the template id and source version: ${id}`,
      );
    }

    this.register({ ...modified, version: toVersion });
    if (options.deprecateSource === true) {
      this.deprecate(id, fromVersion, options.reason);
    }
    return this;
  }

  public deprecate(
    id: string,
    version: string,
    reason?: string,
  ): this {
    const stored =
      this.versions.get(id)?.get(version);

    if (!stored) {
      throw new TemplateVersionError(
        `Template version not found: ${id}@${version}`,
      );
    }

    stored.status = "deprecated";

    if (reason !== undefined) {
      stored.deprecationReason = reason;
    }

    return this;
  }

  public resolve(
    id: string,
    selection: TemplateVersionSelection = {},
  ): EmailDocument {
    if (
      selection.version !== undefined &&
      selection.compatibleWith !== undefined
    ) {
      throw new TemplateVersionError(
        "Choose version or compatibleWith, not both",
      );
    }

    if (selection.version !== undefined) {
      parseVersion(selection.version);
    }

    if (selection.compatibleWith !== undefined) {
      parseVersion(selection.compatibleWith);
    }

    const selected = this.list(id).find(
      item =>
        (
          selection.includeDeprecated === true ||
          item.status === "active"
        ) &&
        (
          selection.version === undefined ||
          item.version === selection.version
        ) &&
        (
          selection.compatibleWith === undefined ||
          isCompatible(
            item.version,
            selection.compatibleWith,
          )
        ),
    );

    if (!selected) {
      throw new TemplateVersionError(
        `No matching template version: ${id}`,
      );
    }

    return this.get(id, selected.version);
  }
}
