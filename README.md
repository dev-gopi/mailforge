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
