# MailForge CLI — Stage 8.3

The CLI calls `@mailforge/email` directly. It does not send email, load remote code or require a database.

## Local usage

From the monorepo root, build the packages first:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm build
node packages/cli/dist/cli.js help
node packages/cli/dist/cli.js list
node packages/cli/dist/cli.js inspect welcome
node packages/cli/dist/cli.js themes
node packages/cli/dist/cli.js layouts
node packages/cli/dist/cli.js variants welcome
node packages/cli/dist/cli.js audit
node packages/cli/dist/cli.js init --dir ./mailforge-example
node packages/cli/dist/cli.js validate welcome --data ./mailforge-example/welcome.data.json
node packages/cli/dist/cli.js render welcome --data ./mailforge-example/welcome.data.json --config ./mailforge-example/mailforge.config.json --out ./generated/cli-welcome --layout transactional --variant premium
```

Generated files: `generated/cli-welcome.html` and `.txt`. The CLI refuses to overwrite them unless `--force` is provided.

For saved custom registries, use `--themes-file ./themes.json` and `--variants-file ./variants.json` with JSON previously exported through the MailForge public APIs. No plugins or executable JavaScript files are loaded automatically.

Run `node packages/cli/dist/cli.js help` for all options.

## Safety and limitations

* Reads local JSON with a 1 MiB limit and uses Zod-backed MailForge rendering for validation.
* Rendering uses `trust: 'safe'`; `trust: 'trusted'` is rejected even if requested via an options JSON file.
* Exported outputs are local files, never sent to email providers.
* `versions` shows only explicitly published **in-memory** versions; packaged template version metadata appears under `inspect`.
* CLI versions/themes/variants management is read-only unless a registry file is explicitly imported; it does not provide durable storage or mutate the calling application.
* Browser preview is available separately through `apps/playground`.
