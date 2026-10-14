# Architecture and extension points

MailForge is an existing TypeScript/pnpm monorepo. New systems should extend rather than duplicate its registries or rendering engines.

| Location | Responsibility |
| --- | --- |
| `packages/core` | Email document model, validation and rendering contracts |
| `packages/components` | Built-in, composite, professional and business component definitions |
| `packages/template` | Singular package directory for typed built-in templates and their design families |
| `packages/themes` | Independent theme presets, inheritance, registry and versioning |
| `packages/email` | Public `createEmail()` engine, customization, localization and render flow |
| `packages/renderer-mjml` | Email-safe MJML rendering |
| `packages/renderer-html` | HTML processing, sanitization and plain-text generation |
| `packages/plugin-sdk` | Trusted plugin APIs |
| `packages/transport` | Optional delivery adapters where present |
| `packages/cli` | Local template discovery, validation and render commands |
| `apps/playground` | Interactive template gallery and previews |
| `scripts` | Local preview-generation tooling |

The `@mailforge/templates` package lives in **`packages/template/`**, never `packages/templates/`. The template catalog contains 105 IDs; the design system contains 12 composition families and ten theme presets. Do not assume every ID is a catalog-only template.

## Compatibility boundaries

- Maintain public template identifiers, data schemas and existing brand/theme customization.
- Preserve sanitization, URL protections, escaping, tenant isolation and plain-text output.
- Keep rendering and email transport separate.
- Use the existing professional and business components instead of creating duplicate registries.
- Review both browser previews and real email clients before asserting compatibility.

