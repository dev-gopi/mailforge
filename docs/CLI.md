# MailForge CLI

The CLI is part of the existing `packages/cli` package. It performs local inspection, validation and rendering; it never sends email. Run it using the built `packages/cli/dist/cli.js`, or the `mailforge` binary after the CLI is installed.

```bash
node packages/cli/dist/cli.js help
node packages/cli/dist/cli.js list --json
node packages/cli/dist/cli.js inspect welcome --json
node packages/cli/dist/cli.js themes --json
node packages/cli/dist/cli.js layouts --json
node packages/cli/dist/cli.js audit --json
node packages/cli/dist/cli.js init --dir ./my-email-project
node packages/cli/dist/cli.js validate welcome --data ./my-email-project/welcome.data.json
node packages/cli/dist/cli.js render welcome --data ./my-email-project/welcome.data.json --out ./generated/welcome
```

Additional options include `--theme`, `--theme-name`, `--themes-file`, `--variants-file`, `--variant`, `--layout`, `--locale`, `--brand`, `--color`, `--template-version`, `--no-heading` and `--force`. Run `help` for the complete current list.

Rendering output is HTML and plain text. Config and render-option JSON files may be supplied, but the CLI rejects trusted/unsafe rendering and validates URLs, contracts and rendering budgets.

