# Changelog

All notable changes to MailForge are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and MailForge uses [Semantic Versioning](https://semver.org/).

## Unreleased

### Added

- New `report-ready` (reference 03) template with validated data, theme-aware report summary and safe inline links.

- Shared root TypeScript, ESLint, and Vitest configuration.
- Workspace package metadata and development scripts.

## 0.1.0 - 2026-10-12

### Added

- Core email document types, structural validation, and component validation.
- Built-in email components, including safe HTTP, CID, and base64 image sources.
- Document patching and customization support.
- HTML and MJML renderers with HTML sanitization, CSS inlining, and plain-text output.
