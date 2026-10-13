# MailForge professional theme presets

`@mailforge/themes` now provides ten built-in presets. Existing theme IDs and their values are unchanged:
`modern`, `minimal`, `corporate`. New: `dark`, `premium`, `ocean`, `forest`, `sunset`, `elegant`, `playful`.

Each preset has the same validated `ThemeColors`, `ThemeTypography`, `ThemeSpacing`, and `ThemeAppearance` tokens as modern. The library uses the existing `ThemeRegistry`, `ThemeVersionRegistry`, `resolveEmailTheme()`, and `auditThemeContrast()`; it does not insert a second theme engine.

```ts
import { getThemePreset, listThemeCatalog, resolveEmailTheme, ThemeRegistry } from "@mailforge/themes";

console.log(listThemeCatalog());
const theme = resolveEmailTheme({
  preset: "premium",
  colors: { primary: "#123456" },
  appearance: { cardRadius: 8 },
});
const tenant = new ThemeRegistry();
tenant.register({ name: "acme-dark", extends: "dark", overrides: { colors: { primary: "#4c1d95" } } });
console.log(getThemePreset("forest"), theme, tenant.resolve("acme-dark"));
```

Use with `@mailforge/email`:

```ts
const engine = createEmail({ brand: { name: "Acme" }, theme: "ocean" });
const result = await engine.render("welcome", { data: { user: { firstName: "Ada" }, actionUrl: "https://example.com" } });
```

**Important:** Supplying `brand.primaryColor` is an intentional explicit override and wins over a preset's default primary color. An explicit `theme.colors.primary` override wins over both. The local playground discovers built-ins dynamically from `engine.listThemes()`; rebuild the email and themes packages before restarting it.

The static contrast tests check text/surface, muted/surface, text/background and white/primary button-label combinations. Actual rendered client appearance (especially Outlook and dark mode) still needs real-device/inbox verification; a theme name does not certify compatibility.

### Verification

```bash
corepack pnpm --filter @mailforge/themes build
corepack pnpm exec vitest run packages/themes/tests/ExpandedThemes.test.ts packages/themes/tests/ThemeLibrary.test.ts packages/themes/tests/ThemeCatalog.test.ts packages/themes/tests/ThemeRegistry.test.ts
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm lint
```
