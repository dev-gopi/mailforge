import type { RenderResult } from "@mailforge/core";
import type { MailForgeEmail } from "../createEmail.js";

export interface TemplatePreviewFixture {
    readonly id: string;
    readonly subject: string;
    readonly html: string;
    readonly text: string;
}

/**
 * Generate HTML/text preview fixtures in memory (no automatic file writes).
 * Pass sample data for templates with required dynamic variables.
 */
export async function generatePreviewFixtures(
    email: MailForgeEmail,
    samples: Readonly<Record<string, Record<string, unknown>>>,
): Promise<TemplatePreviewFixture[]> {
    const fixtures: TemplatePreviewFixture[] = [];
    for (const id of Object.keys(samples).sort()) {
        const data = samples[id];
        const result: RenderResult = data === undefined
            ? await email.render(id)
            : await email.render(id, { data });
        fixtures.push({ id, subject: result.subject, html: result.html, text: result.text });
    }
    return fixtures;
}
