# Theme reference

> Generated directly from `@mailforge/themes`. Theme customization remains public and supported.

- `modern`
- `minimal`
- `corporate`
- `dark`
- `premium`
- `ocean`
- `forest`
- `sunset`
- `elegant`
- `playful`

Use `createEmail({ theme: { preset: "modern" } })`, or configure theme overrides using
`resolveEmailTheme`, `mergeEmailTheme`, and `defineThemeOverrides`.
Email-client dark-mode handling must be tested in actual clients before certification.

## Activity notification design overrides

The `activity-notification` template accepts `data.design` with color
keys (`accent`, `button`, `surface`, `canvas`, `text`, `muted`,
`quoteBackground`, `quoteBorder`, `cardBorder`) and a safe font stack.
The general `theme`/`themeName` API still controls default branding, the outer
card width/radius/background, and the email-wide visual system.
See [the template guide](ACTIVITY_NOTIFICATION.md).


### Password reset security palette

`password-reset-secure` supports `data.design` palette overrides (`accent`, `canvas`, `surface`, `panel`, `panelText`, `border`, `text`, `muted`) and an approved `fontFamily`. Standard public `theme`, `themeName`, `layoutPreset`, `display` and `patches` render options remain supported.

## Override precedence for all templates

`themeName`/`theme` control general palette, typography and spacing defaults.
Built-ins may provide explicit node styles, which have historically taken
priority over theme values. For exact appearance control across **every**
template, use `overrides.byType`, `overrides.byRole`, and `overrides.byId`.
See [CUSTOMIZATION.md](CUSTOMIZATION.md).
