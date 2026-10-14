/**
 * Configuration options for URL safety checks.
 */
export interface SafeUrlOptions {
  /** Protocols permitted for links. Defaults to ["http:", "https:", "mailto:", "tel:"]. */
  allowedProtocols?: string[];
  /** Whether relative paths (e.g. "/privacy", "#top") are allowed. Defaults to true for in-email navigation. */
  allowRelative?: boolean;
}

const DEFAULT_ALLOWED_PROTOCOLS = ["http:", "https:", "mailto:", "tel:"];

function hasForbiddenCharacters(str: string): boolean {
  for (let i = 0; i < str.length; i += 1) {
    const code = str.charCodeAt(i);
    if (
      code <= 0x1f ||
      (code >= 0x7f && code <= 0x9f) ||
      code === 0x200b ||
      code === 0x200c ||
      code === 0x200d ||
      code === 0xfeff
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Validates whether a URL is safe for inclusion in email markup.
 * Strictly blocks executable and unsafe schemes such as `javascript:`, `vbscript:`, `data:`, `file:`, `blob:`.
 */
export function isSafeUrl(
  value: unknown,
  options: SafeUrlOptions = {},
): boolean {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  // Reject strings containing forbidden control characters or null bytes
  if (hasForbiddenCharacters(trimmed)) {
    return false;
  }

  // Reject protocol-relative links (e.g. "//evil.com") if relative links are not allowed
  const allowRelative = options.allowRelative ?? true;
  if (trimmed.startsWith("//")) {
    return false;
  }

  // Allow anchor links and root-relative paths when allowed
  if (trimmed.startsWith("#") || (allowRelative && trimmed.startsWith("/"))) {
    return true;
  }

  // Check normalized protocol
  try {
    const parsed = new URL(trimmed, "http://localhost");
    const allowed = options.allowedProtocols ?? DEFAULT_ALLOWED_PROTOCOLS;

    // Disallow dangerous schemes explicitly even if somehow parsed
    const dangerousSchemes = [
      "javascript:",
      "vbscript:",
      "data:",
      "file:",
      "blob:",
      "about:",
      "chrome:",
      "ms-its:",
    ];

    if (dangerousSchemes.includes(parsed.protocol.toLowerCase())) {
      return false;
    }

    // Check if the original URL actually has an explicit protocol
    const hasColon = trimmed.indexOf(":");
    if (hasColon !== -1) {
      const scheme = trimmed.slice(0, hasColon + 1).toLowerCase();
      // Ensure no spaces or line breaks inside the scheme (e.g. "java\nscript:")
      if (/\s/.test(scheme)) {
        return false;
      }
      return allowed.includes(parsed.protocol.toLowerCase());
    }

    return allowRelative;
  } catch {
    return false;
  }
}

/**
 * Sanitizes an email URL, falling back to safe fallback URL (or "#") if unsafe.
 */
export function sanitizeUrl(
  value: unknown,
  fallback = "#",
  options?: SafeUrlOptions,
): string {
  if (isSafeUrl(value, options)) {
    return String(value).trim();
  }
  return fallback;
}
