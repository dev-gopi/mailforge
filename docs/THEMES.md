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
