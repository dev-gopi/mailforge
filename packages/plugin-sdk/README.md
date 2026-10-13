# MailForge Plugin SDK (Task 7.9)

Plugins are **trusted application code**, not executable user-uploaded content.
Never load unknown plugins from an email template, a database row, or an untrusted request.

```typescript
import { createEmail, type MailForgePlugin } from "@mailforge/email";

const plugin: MailForgePlugin = {
    name: "example-plugin",
    version: "1.0.0",
    setup(host) {
        host.registerTemplate({
            schemaVersion: "1.0", id: "example-plugin-email", version: "1.0.0",
            subject: "Welcome", body: [{ id: "greeting", type: "text", props: { text: "Hello" } }],
        });
    },
    beforeRender(document) {
        // Receives a clone and must return a synchronous document or mutate the draft.
        return document;
    },
    afterRender(result) {
        // Receives a clone. Use only for trusted observations, not user data logging.
        void result.subject;
    },
};
const mail = createEmail();
mail.usePlugin(plugin);
const output = await mail.render("example-plugin-email");
console.log(output.subject);
```

`setup` registrations are collected first. If setup fails, none are committed.
If committing registered templates/components fails, newly committed items from this
plugin are rolled back; earlier registrations belonging to the application remain.

Hooks run in registration order in the *structured-document MJML pipeline*.
`beforeRender` runs after customization/visibility and before theme processing,
final validation and resource limits. `afterRender` runs after compilation and
receives a defensive copy; if a hook throws, rendering rejects.
`renderHtml()` does not use the structured-document plugin hooks.

No sandbox, OS-process isolation, async hook support, dynamic plugin loading,
remote plugin execution or permissions system is provided. Your application is
responsible for plugin trust and authorization. Plugin registries are isolated
by `MailForgeEmail` instance. Plugins should not retain customer data in memory.
