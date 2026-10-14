# Changelog

All notable changes to MailForge are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and MailForge uses [Semantic Versioning](https://semver.org/).

## Unreleased

### Added

- Universal per-render `overrides` for all built-in and custom emails: target components by type, semantic role or ID without changing template source. Preserves `patches`, themes, layouts and data validation.
- Shared, validated `applyDocumentOverrides` helper, public types, regression tests, and customization examples.


- New `report-ready` (reference 03) template with validated data, theme-aware report summary and safe inline links.

- Shared root TypeScript, ESLint, and Vitest configuration.
- Workspace package metadata and development scripts.

## 0.1.0 - 2026-10-12

### Added

- Core email document types, structural validation, and component validation.
- Built-in email components, including safe HTTP, CID, and base64 image sources.
- Document patching and customization support.
- HTML and MJML renderers with HTML sanitization, CSS inlining, and plain-text output.

- Added `activity-notification` standalone built-in template (#102), reusable escaped rich text, a configurable quote panel, optional outside-card footer placement and mobile-preserved brand columns.

- Added built-in `password-reset-secure` (#103) with configurable security content, indigo design and a safe reusable `before-shell` layout placement. Preserves the existing `password-reset` template and previous registrations.

- Added `order-shipped-notice` (#104), a standalone Sky Route shipment email with
  caller-controlled milestones and a reusable structured-node `buildProgressSteps` helper.
  Kept `shipping-update`, `order-delivered`, and all previously registered templates unchanged.

- Added `workspace-invitation-editorial` (#105), a standalone configurable account invitation with strict validation, sample renderer, catalog exports, regression tests and documented public overrides. Existing 104 templates remain available.
