# MailForge

MailForge is a TypeScript monorepo for building transactional email. It turns typed, validated email documents and templates into email-safe HTML, MJML, and plain text. The primary application API is `@mailforge/email`.

## Current capabilities

- Typed template data, document validation, reusable components, and safe document customization.
- A built-in transactional template catalog covering account, authentication, billing, ecommerce, marketing, notifications, events, SaaS, and support use cases, plus specialized and expanded templates.
- Dynamic variables, localization (including RTL support), template versions, named presets, and organization-scoped template variants.
- Theme tokens, theme profiles, versioned theme registries, layout presets, and contrast diagnostics.
- Built-in standard, composite, extended, professional, and business components.
- HTML and MJML rendering with sanitization, CSS inlining, plain-text fallbacks, and render/output budgets.
- Trusted, application-owned plugins with setup, `beforeRender`, and `afterRender` lifecycle hooks.
- A local CLI for inspecting, validating, auditing, and rendering templates.
- Optional provider adapters for delivering rendered messages through Nodemailer/SMTP, Resend, SendGrid, or AWS SES v2.

## Workspace packages

| Package | Purpose |
| --- | --- |
| `@mailforge/core` | Email document contracts, validation, customization, and renderer interfaces. |
| `@mailforge/components` | Reusable standard, composite, professional, and business email components. |
| `@mailforge/templates` | Typed built-in, domain, specialized, and catalog email templates. |
| `@mailforge/themes` | Theme presets, registries, versioning, and accessibility diagnostics. |
| `@mailforge/email` | High-level engine that composes templates, components, themes, layouts, variables, plugins, and rendering. |
| `@mailforge/renderer-html` | Sanitized HTML rendering, CSS inlining, and plain-text generation. |
| `@mailforge/renderer-mjml` | MJML compilation with sanitization and plain-text output. |
| `@mailforge/plugin-sdk` | Contracts and lifecycle support for trusted application plugins. |
| `@mailforge/transport` | Optional adapters for delivering rendered email through application-owned providers. |
| `@mailforge/cli` | Local template inspection, validation, audit, and rendering commands. |

## Requirements and setup

- Node.js 20.19 or later
- pnpm 10 or later

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
```

Run the linter with `pnpm lint`.

## How MailForge renders an email

`@mailforge/email` is the facade most applications use. A render request moves
through a predictable pipeline:

1. Resolve a packaged, catalog, or application-registered template.
2. Validate template data and interpolate dynamic variables.
3. Apply patches, presets, localization, display settings, variants, theme, and
   layout options.
4. Expand reusable components and validate the resulting document.
5. Run trusted plugin hooks, enforce render budgets, compile MJML, then return
   HTML and a plain-text fallback.

The returned result is `{ subject, html, text }`. Rendering is separate from
delivery, so an application can preview, store, queue, or send the result using
its own provider and policies.

See [Report Ready](docs/REPORT_READY.md) for the new `report-ready` standalone, fully data-driven notification.

## Render a built-in template

```ts
import { createEmail } from "@mailforge/email";

const email = createEmail();
const message = await email.render("welcome", {
    data: {
        user: { firstName: "Sam" },
        actionUrl: "https://example.com/dashboard",
    },
    layoutPreset: "transactional",
});

console.log(message.subject);
console.log(message.html);
console.log(message.text);
```

Use `listBuiltinTemplates()` or `listTemplateCatalog()` to discover available templates and their data contracts. Template data is validated before rendering.

## Templates, components, and visual configuration

The template library includes concise built-in templates and a larger catalog.
Catalog entries provide an ID, category, title, and typed data contract. Query
them from the engine when building a template picker or admin UI:

```ts
import { createEmail } from "@mailforge/email";

const email = createEmail();
const marketingTemplates = email.listTemplateCatalog("marketing");
const themes = email.listThemes();
const layouts = email.listLayoutPresets();
```

Render options can tailor a message without changing its source template:

| Option | Use |
| --- | --- |
| `data` | Template values and dynamic variables. |
| `locale`, `fallbackLocale`, `direction` | Translate content and control left-to-right or right-to-left output. |
| `theme`, `themeName`, `themeProfile` | Apply token overrides, a registered theme, or a reusable profile. |
| `layout`, `layoutPreset` | Configure mail chrome or select an email-safe layout preset. |
| `display` | Adjust the subject, preheader, heading, buttons, or visible sections for one render. |
| `variant`, `organizationId` | Select a shared or tenant-scoped template variant. Tenant IDs must come from trusted authorization context. |
| `templateVersion`, `themeVersion` | Select explicitly published immutable versions. |
| `patches` | Insert, replace, remove or update components for one render. |
| `overrides` | Override props, styles and attrs across all templates by type, semantic role or stable node ID. |

Register components for reusable application-specific sections. Standard,
composite, extended, professional, and business components are available from
`@mailforge/components`; application registrations stay local to each email
engine.

## Customize safely

Each `createEmail()` call has isolated registries. Built-in templates and components are cloned before extension, so application customizations do not mutate the packaged defaults.

```ts
import { createEmail } from "@mailforge/email";

const email = createEmail();

email.extendTemplate("welcome", draft => {
    draft.body.unshift({
        id: "announcement",
        type: "text",
        props: { text: "A message from Acme" },
    });
});

const message = await email.render("welcome", {
    data: {
        user: { firstName: "Sam" },
        actionUrl: "https://example.com/dashboard",
    },
    variant: "branded",
});
```

For one-off changes, pass `overrides` or `patches` to `render()`.
Read [Universal template customization](docs/CUSTOMIZATION.md) for full examples and precedence. Use template presets, theme profiles, layout options, display options, and variants for reusable changes.

## Plugins and delivery

Plugins are trusted application code. A plugin can register templates and
components during setup, transform a cloned structured document in
`beforeRender`, and observe a cloned render result in `afterRender`. There is no
plugin sandbox, remote loading, or permission model; never load plugins from
template data, user input, or an untrusted database record.

`@mailforge/transport` is optional and only accepts a rendered message. It
provides adapters for Nodemailer/SMTP, Resend, SendGrid, and AWS SES v2, while
credentials, sender authorization, queues, retries, webhooks, unsubscribe
handling, and delivery monitoring remain application responsibilities.

## CLI

After building the workspace, run the CLI from the repository root:

```bash
node packages/cli/dist/cli.js help
node packages/cli/dist/cli.js list
node packages/cli/dist/cli.js inspect welcome
node packages/cli/dist/cli.js audit
node packages/cli/dist/cli.js init --dir ./mailforge-example
node packages/cli/dist/cli.js render welcome --data ./mailforge-example/welcome.data.json --out ./generated/welcome
```

Useful CLI commands include `themes`, `layouts`, `variants <template-id>`,
`versions <template-id>`, and `validate <template-id> --data <file>`. Use
`--json` with discovery and audit commands for machine-readable output. Render
commands also support `--theme`, `--layout`, `--variant`, `--locale`,
`--template-version`, `--config`, `--themes-file`, and `--variants-file`.

The CLI reads local JSON up to 1 MiB, always uses safe rendering, and writes
HTML and text files. It will not overwrite output unless `--force` is supplied;
it never sends email or loads remote code.

## Security model

MailForge sanitizes untrusted HTML and produces a plain-text fallback. Trusted rendering and plugins are for application-controlled code only. Keep provider credentials out of template data, and use `@mailforge/transport` only from an application that owns its delivery credentials, authorization, consent, retry, and monitoring policies.

## Development

| Command | Description |
| --- | --- |
| `pnpm build` | Build every workspace package with a build script. |
| `pnpm typecheck` | Type-check every workspace package. |
| `pnpm test` | Run workspace tests. |
| `pnpm lint` | Run ESLint across the repository. |

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the development workflow and [CHANGELOG.md](./CHANGELOG.md) for release notes.
Detailed guides are available in [docs/README.md](./docs/README.md), including the CLI, architecture, template, theme, compatibility, and release documentation.

## License

MIT. See [LICENSE](./LICENSE).
