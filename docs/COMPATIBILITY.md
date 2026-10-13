# Compatibility and quality evidence

MailForge renders HTML and plain text. Its static quality checks and preview galleries are useful development tools, **not substitutes for tests in real email clients**.

## Automated

The default generator targets 100 templates across ten themes, plus the existing `modern/no-heading` variants (1,100 previews). Task 8.5.19 also adds 50 opt-in structured-data samples. Run the documented build, test, preview and audit commands in `docs/RELEASING.md`.

## Manual release acceptance

Review desktop and mobile widths, typography, contrast, image fallbacks, links, alignment, tables, dark-mode behavior and text-only fallback. Review representative designs across all 12 layout families and data-rich templates.

Test in real Gmail, Outlook (including Windows desktop), Apple Mail and relevant mobile clients if claiming compatibility. Record the client version, platform, test date, scenario and outcome. A passing static audit by itself cannot certify any particular email client or assistive technology.
