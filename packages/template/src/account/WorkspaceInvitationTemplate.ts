import { z } from "zod";
import { DocumentValidator, type EmailDocument, type EmailNode } from "@mailforge/core";
import { contentSection } from "../shared/TemplateNodes.js";

/** An independently validated, reusable editorial workspace invitation design. */
const clean = (max: number) => z.string().trim().min(1).max(max)
    .refine(value => !/[\p{Cc}\p{Cf}]/u.test(value), "Control characters are not allowed");
const httpsUrl = z.url().max(2048).refine(value => {
    const url = new URL(value);
    return url.protocol === "https:" && !!url.hostname && !url.username && !url.password;
}, "A credential-free absolute HTTPS URL is required");
const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a six-digit hex color");
const fonts = z.enum([
    "Arial, Helvetica, sans-serif", "Verdana, Geneva, sans-serif",
    "Tahoma, Arial, sans-serif", "Georgia, Times New Roman, serif",
]);
const designSchema = z.object({
    canvas: hex.optional(), surface: hex.optional(), plum: hex.optional(), coral: hex.optional(),
    heroTitle: hex.optional(), heroMuted: hex.optional(), text: hex.optional(), muted: hex.optional(),
    border: hex.optional(), workspacePanel: hex.optional(), workspaceBorder: hex.optional(),
    avatar: hex.optional(), avatarText: hex.optional(), workspaceTitle: hex.optional(),
    footer: hex.optional(), buttonText: hex.optional(), serifFont: fonts.optional(), bodyFont: fonts.optional(),
}).strict();

export const workspaceInvitationEditorialSchema = z.object({
    brandName: clean(100), workspaceName: clean(140),
    workspaceInitial: z.string().trim().regex(/^\P{C}$/u, "Use exactly one visible character"),
    recipientFirstName: clean(120), inviterName: clean(120), roleName: clean(100),
    expiryDays: z.number().int().min(1).max(365),
    invitationUrl: httpsUrl, supportUrl: httpsUrl, year: z.number().int().min(2000).max(2200),
    companyAddress: clean(350),
    categoryLabel: clean(80).default("WORKSPACE INVITE"),
    kicker: clean(100).default("A NOTE FROM YOUR TEAM"),
    headingFirst: clean(80).default("You're"), headingSecond: clean(80).default("invited"),
    heroSubtitle: clean(240).default("There's a place for you at the table."),
    greetingPrefix: clean(50).default("Hi"), invitationMessage: clean(300).default("invited you to join their workspace."),
    workspaceLabel: clean(80).default("YOUR NEW WORKSPACE"), roleLabel: clean(50).default("Role"),
    buttonLabel: clean(80).default("Accept invitation →"),
    expirationPrefix: clean(100).default("This invitation expires in"),
    ignoreNotice: clean(240).default("Not expecting this invitation? You can safely ignore this email."),
    supportPrefix: clean(60).default("Need help?"), supportLabel: clean(60).default("Contact support"),
    design: designSchema.optional(),
}).strict();
export type WorkspaceInvitationEditorialData = z.input<typeof workspaceInvitationEditorialSchema>;

/** Synthetic example only. Generate one-time invitation tokens on the server, never here. */
export const workspaceInvitationEditorialPreviewData: WorkspaceInvitationEditorialData = {
    brandName: "kindred", workspaceName: "Fieldnotes", workspaceInitial: "F",
    recipientFirstName: "Jordan", inviterName: "Tessa Carter", roleName: "Member",
    expiryDays: 7, invitationUrl: "https://example.com/invitations/sample",
    supportUrl: "https://example.com/support", year: 2026,
    companyAddress: "88 Grove Street, Portland, OR 97205",
};

const palette = {
    canvas: "#F4F0EB", surface: "#FFFDF9", plum: "#452A40", coral: "#D76750",
    heroTitle: "#FFFAF5", heroMuted: "#DAC9D2", text: "#382A38", muted: "#82757E",
    border: "#E8DFD9", workspacePanel: "#FCF5EF", workspaceBorder: "#EEDFD5",
    avatar: "#E9CCBD", avatarText: "#673F50", workspaceTitle: "#3B2A39",
    footer: "#93848A", buttonText: "#FFFFFF",
};
type Styles = NonNullable<EmailNode["styles"]>;
const node = (id: string, value: string, styles: Styles, role?: string): EmailNode => ({
    id, type: "text", props: { text: value }, styles,
    ...(role ? { attrs: { "data-mf-style": role } } : {}),
});
/** Produces only typed MailForge nodes; no copied HTML or executable style strings. */
export function buildWorkspaceInvitationEditorialTemplate(input?: unknown): EmailDocument {
    const d = workspaceInvitationEditorialSchema.parse(input ?? workspaceInvitationEditorialPreviewData);
    const o = d.design;
    // Resolve concrete defaults independently so optional fields cannot inject undefined into EmailNode.styles.
    const c = {
        canvas: o?.canvas ?? palette.canvas, surface: o?.surface ?? palette.surface,
        plum: o?.plum ?? palette.plum, coral: o?.coral ?? palette.coral,
        heroTitle: o?.heroTitle ?? palette.heroTitle, heroMuted: o?.heroMuted ?? palette.heroMuted,
        text: o?.text ?? palette.text, muted: o?.muted ?? palette.muted,
        border: o?.border ?? palette.border, workspacePanel: o?.workspacePanel ?? palette.workspacePanel,
        workspaceBorder: o?.workspaceBorder ?? palette.workspaceBorder,
        avatar: o?.avatar ?? palette.avatar, avatarText: o?.avatarText ?? palette.avatarText,
        workspaceTitle: o?.workspaceTitle ?? palette.workspaceTitle,
        footer: o?.footer ?? palette.footer, buttonText: o?.buttonText ?? palette.buttonText,
    };
    const serif = o?.serifFont ?? "Georgia, Times New Roman, serif";
    const sans = o?.bodyFont ?? "Arial, Helvetica, sans-serif";
    const textStyle: Styles = { fontFamily: sans, fontSize: 15, lineHeight: "24px", color: c.text, padding: "0" };
    const label: Styles = { fontFamily: sans, fontSize: 11, lineHeight: "17px", fontWeight: "bold",
        letterSpacing: "1.8px", color: c.muted, padding: "0" };
    const body: EmailNode[] = [
        // Consumes existing reusable before/after shell support, leaving branding outside the card.
        { id: "invite-editorial-brand", type: "section",
            attrs: { "data-mf-placement": "before-shell", "data-mf-columns": "keep-mobile" },
            styles: { padding: "10px 6px 24px", backgroundColor: c.canvas }, children: [
                { id: "invite-editorial-brand-left", type: "column", styles: { width: "57%", padding: "0" }, children: [
                    { id: "invite-editorial-brand-name", type: "rich-text", props: { segments: [
                        { text: d.brandName, strong: true, color: c.plum },
                        { text: ".", strong: true, color: c.coral },
                    ] }, styles: { fontFamily: serif, fontSize: 26, lineHeight: "32px", letterSpacing: "-1px", padding: "0" } },
                ] },
                { id: "invite-editorial-brand-right", type: "column", styles: { width: "43%", padding: "0" }, children: [
                    node("invite-editorial-brand-label", d.categoryLabel, {
                        ...label, fontSize: 11, lineHeight: "32px", textAlign: "right" }, "eyebrow"),
                ] },
            ] },
        contentSection("invite-editorial-hero", [
            { id: "invite-editorial-kicker", type: "rich-text", props: { segments: [
                { text: d.kicker, strong: true, color: "#F5B39F" },
                { text: "  ━━━━━", color: "#CB8A88" },
            ] }, styles: { fontFamily: sans, fontSize: 11, lineHeight: "17px", letterSpacing: "2px",
                padding: "0 0 23px" } },
            node("invite-editorial-heading-first", d.headingFirst, { fontFamily: serif,
                fontSize: 49, lineHeight: "54px", letterSpacing: "-1.3px", color: c.heroTitle, padding: "0" }),
            { id: "invite-editorial-heading", type: "rich-text", props: { segments: [
                { text: d.headingSecond, color: c.heroTitle },
                { text: ".", color: "#F1A78E" },
            ] }, attrs: { "data-mf-style": "hero-title" }, styles: { fontFamily: serif,
                fontSize: 49, lineHeight: "54px", letterSpacing: "-1.3px", padding: "0 0 19px" } },
            node("invite-editorial-hero-subtitle", d.heroSubtitle, { ...textStyle,
                color: c.heroMuted, fontSize: 15, lineHeight: "23px" }, "hero-subtitle"),
        ], "47px 49px 45px", c.plum),
        contentSection("invite-editorial-introduction", [
            node("invite-editorial-greeting", `${d.greetingPrefix} ${d.recipientFirstName},`, {
                ...textStyle, padding: "0 0 2px" }, "body"),
            { id: "invite-editorial-intro-copy", type: "rich-text", props: { segments: [
                { text: d.inviterName, strong: true, color: c.text },
                { text: ` ${d.invitationMessage}`, color: c.text },
            ] }, attrs: { "data-mf-style": "body" }, styles: { ...textStyle, padding: "0" } },
        ], "39px 49px 22px", c.surface),
        // MJML requires section > column > leaf, so the workspace avatar and copy
        // are two columns of one section (never nested section inside a column).
        { id: "invite-editorial-workspace-panel", type: "section", attrs: {
            "data-mf-columns": "keep-mobile", "data-mf-style": "panel-outer",
        }, styles: { padding: "17px 49px 25px", backgroundColor: c.workspacePanel }, children: [
            { id: "invite-editorial-workspace-avatar-col", type: "column",
                styles: { width: "68px", padding: "0" }, children: [
                node("invite-editorial-workspace-avatar", d.workspaceInitial, {
                    fontFamily: serif, fontWeight: "bold", fontSize: 23,
                    lineHeight: "52px", textAlign: "center", color: c.avatarText,
                    backgroundColor: c.avatar, padding: "0" }),
            ] },
            { id: "invite-editorial-workspace-details", type: "column",
                styles: { width: "75%", padding: "0" }, children: [
                node("invite-editorial-workspace-label", d.workspaceLabel, {
                    ...label, fontSize: 10, lineHeight: "15px", color: "#9A7776", padding: "0 0 5px" }),
                node("invite-editorial-workspace-name", d.workspaceName, {
                    ...textStyle, fontFamily: serif, fontWeight: "bold", fontSize: 20,
                    lineHeight: "26px", color: c.workspaceTitle }),
                node("invite-editorial-role", `${d.roleLabel}: ${d.roleName}`, {
                    ...textStyle, fontSize: 13, lineHeight: "20px", color: c.muted }),
            ] },
        ] },
        contentSection("invite-editorial-action-area", [
            { id: "invite-editorial-action", type: "button", props: {
                text: d.buttonLabel, href: d.invitationUrl }, attrs: { "data-mf-style": "primary-action" },
                styles: { fontFamily: sans, fontSize: 15, fontWeight: "bold", lineHeight: "20px",
                    innerPadding: "15px 25px", borderRadius: "0px", padding: "0", textAlign: "left",
                    backgroundColor: c.coral, color: c.buttonText } },
            node("invite-editorial-expiry", `${d.expirationPrefix} ${d.expiryDays} ${d.expiryDays === 1 ? "day" : "days"}.`, {
                ...textStyle, fontSize: 13, lineHeight: "21px", color: c.muted, padding: "18px 0 0" }),
        ], "0 49px 26px", c.surface),
        contentSection("invite-editorial-fine-print", [
            { id: "invite-editorial-divider", type: "divider", styles: {
                color: c.border, padding: "0 0 18px" } },
            node("invite-editorial-ignore", d.ignoreNotice, { ...textStyle,
                fontSize: 12, lineHeight: "20px", color: c.muted }),
        ], "0 49px 37px", c.surface),
        contentSection("invite-editorial-footer", [
            { id: "invite-editorial-support", type: "link", props: {
                href: d.supportUrl, prefix: `${d.supportPrefix} `, text: d.supportLabel,
            }, styles: { ...textStyle, textAlign: "center", fontSize: 12, lineHeight: "19px",
                color: c.plum, padding: "0" } },
            node("invite-editorial-copyright", `© ${d.year} ${d.brandName}. ${d.companyAddress}`, {
                ...textStyle, textAlign: "center", fontSize: 12, lineHeight: "19px", color: c.footer }),
        ], "24px 16px 8px", c.canvas, { "data-mf-placement": "after-shell" }),
    ];
    const document: EmailDocument = {
        schemaVersion: "1.0", id: "workspace-invitation-editorial", version: "1.0.0",
        subject: `You're invited to ${d.workspaceName}`,
        preheader: `${d.inviterName} invited you to join ${d.workspaceName}. Accept your invitation.`,
        head: { title: `You're invited to ${d.workspaceName}`, bodyBackgroundColor: c.canvas },
        metadata: { category: "saas", catalog: "builtin", designFamily: "invitation" },
        body,
        header: { id: "invite-editorial-empty-header", type: "container" },
        footer: { id: "invite-editorial-empty-footer", type: "container" },
        copyright: { id: "invite-editorial-empty-copyright", type: "container" },
    };
    new DocumentValidator().validateOrThrow(document);
    return document;
}
