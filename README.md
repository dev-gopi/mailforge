# MailForge

MailForge is a TypeScript monorepo for defining, validating, customizing, and rendering transactional email documents. It provides a structured email document model, built-in component validation, and HTML and MJML renderers.

## Packages

| Package | Purpose |
| --- | --- |
| `@mailforge/core` | Document types, validation, component registry, document customization, and renderer contracts. |
| `@mailforge/renderer-html` | Safe or trusted HTML email rendering, CSS inlining, and plain-text generation. |
| `@mailforge/renderer-mjml` | MJML rendering with HTML sanitization and plain-text output. |

## Requirements

- Node.js 20.19 or later
- pnpm 10 or later

## Setup

```bash
pnpm install
pnpm typecheck
pnpm test
```

Build all workspace packages with:

```bash
pnpm build
```

## Core document example

```ts
import {
    DocumentValidator,
    type EmailDocument,
} from "@mailforge/core";

const document: EmailDocument = {
    schemaVersion: "1.0",
    id: "welcome-email",
    version: "1.0.0",
    subject: "Welcome to MailForge",
    body: [
        {
            id: "welcome-title",
            type: "heading",
            props: {
                text: "Welcome!",
            },
        },
    ],
};

new DocumentValidator().validateOrThrow(document);
```

## HTML rendering example

```ts
import { HtmlRenderer } from "@mailforge/renderer-html";

const result = await new HtmlRenderer().render({
    subject: "Welcome",
    html: "<h1>Welcome to MailForge</h1>",
});

console.log(result.html);
console.log(result.text);
```

`HtmlRenderer` sanitizes untrusted HTML. Supplying custom CSS requires `{ trust: "trusted" }`; use trusted rendering only for content you control.

## Extending templates and components

`createEmail()` provides isolated registries per engine. Built-in templates and
components are never mutated: registration, overrides, and extensions are cloned
before storage.

```ts
import { z } from "zod";
import { createEmail } from "@mailforge/email";

const email = createEmail();

// Persistently derive a packaged template. The callback may add, remove,
// replace, or reorder document nodes.
email.extendTemplate("welcome", draft => {
    draft.body.unshift({
        id: "announcement",
        type: "text",
        props: { text: "A message from Acme" },
    });
});

// Reuse the default template name with the derived version.
await email.render("welcome", { data: {
    user: { firstName: "Sam" },
    actionUrl: "https://example.com/dashboard",
} });

// Register a new component, then use it in any registered template.
email.registerComponent({
    name: "notice",
    version: "1.0.0",
    allowChildren: false,
    schema: z.object({ message: z.string().min(1) }),
    render: (props, context) => ({
        id: context.nodeId,
        type: "text",
        props: { text: String(props.message) },
    }),
});
```

Use `overrideTemplate()` to replace a registered or packaged template,
`unregisterTemplate()` to remove a custom override, and `overrideComponent()` or
`unregisterComponent()` for registered reusable components. One-off changes can
also use `render(..., { patches })`, while `renderCustomizedBuiltin()` and
template presets keep customizations non-persistent.

## Development commands

| Command | Description |
| --- | --- |
| `pnpm build` | Build every workspace package with a build script. |
| `pnpm typecheck` | Type-check every workspace package. |
| `pnpm test` | Run workspace tests. |
| `pnpm lint` | Run ESLint across the repository. |

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the development workflow and [CHANGELOG.md](./CHANGELOG.md) for release notes.

## License

MIT. See [LICENSE](./LICENSE).
