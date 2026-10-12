# Contributing to MailForge

Thanks for contributing. MailForge is a TypeScript workspace, and every change should keep the affected package buildable, type-safe, and tested.

## Prerequisites

- Node.js 20.19 or later
- pnpm 10 or later

## Local setup

```bash
git clone <repository-url>
cd mailforge
pnpm install
```

Run the repository checks before opening a pull request:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

To work on one package, use pnpm's filter option:

```bash
pnpm --filter @mailforge/core test
pnpm --filter @mailforge/renderer-html typecheck
```

## Development guidelines

- Keep public types and runtime validation in sync.
- Use ESM imports with explicit `.js` extensions for local TypeScript modules.
- Prefer `import type` when an import is used only as a type.
- Preserve strict TypeScript settings, including `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`.
- Treat untrusted email HTML and URLs as hostile input. Keep sanitizer and protocol checks in place unless a change includes equivalent protection.
- Add focused tests for behavior changes and regressions.

## Pull requests

Use a concise, imperative title. Describe the user-visible change, the packages affected, and the verification you ran. Keep unrelated formatting or refactoring out of the pull request.

When a change affects a released package, add a user-facing entry under `Unreleased` in [CHANGELOG.md](./CHANGELOG.md).
