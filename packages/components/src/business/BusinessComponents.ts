import { z } from "zod";
import { tablePropsSchema, type EmailNode } from "@mailforge/core";
import type { ReusableComponentDefinition } from "../contracts/ComponentRenderer.types.js";
import type { ComponentCatalog } from "../registry/ComponentCatalog.js";

const short = z.string().min(1).max(160);
const body = z.string().min(1).max(600);
const money = z.string().min(1).max(50);
const link = z.url().refine(v => {
    const u = new URL(v);
    return (u.protocol === "https:" || u.protocol === "http:") && !u.username && !u.password;
}, "Absolute HTTP(S) URL without credentials required");
const text = (id: string, value: string, role = "body"): EmailNode => ({
    id, type: "text", props: { text: value }, attrs: { "data-mf-style": role },
});
const heading = (id: string, value: string): EmailNode => ({
    id, type: "heading", props: { text: value, level: 2 }, attrs: { "data-mf-style": "title" },
});
const button = (id: string, label: string, href: string): EmailNode => ({
    id, type: "button", props: { text: label, href }, attrs: { "data-mf-style": "primary-action" },
});
const panel = (id: string, children: EmailNode[]): EmailNode => ({
    id, type: "section", children: [{ id: `${id}-column`, type: "column", children }],
});
const makeTable = (id: string, headers: string[], rows: string[][], caption?: string, alignments?: Array<"left" | "center" | "right">): EmailNode => ({
    id, type: "table", props: { headers, rows, ...(caption ? { caption } : {}), ...(alignments ? { alignments } : {}) },
});
const define = (name: string, schema: z.ZodType, render: ReusableComponentDefinition["render"], description: string): ReusableComponentDefinition => ({
    name, version: "1.0.0", description, allowChildren: false, schema, render,
});
const product = z.object({ name: short, price: money, description: z.string().max(400).optional(), imageUrl: link.optional(), imageAlt: z.string().min(1).max(160).optional() }).strict()
    .refine(v => !v.imageUrl || Boolean(v.imageAlt), "Image alternative text is required");
const promo = z.object({ title: short, detail: body, actionText: short.optional(), actionUrl: link.optional() }).strict()
    .refine(v => Boolean(v.actionText) === Boolean(v.actionUrl), "Provide both actionText and actionUrl");
const tableSchema = tablePropsSchema;

/** Build the accessible image and text nodes shared by product-card and product-grid renderers. */
function productNodes(id: string, value: z.output<typeof product>): EmailNode[] {
    return [
        ...(value.imageUrl ? [{ id: `${id}-image`, type: "image", props: { src: value.imageUrl, alt: value.imageAlt! } } satisfies EmailNode] : []),
        heading(`${id}-name`, value.name),
        text(`${id}-price`, value.price, "eyebrow"),
        ...(value.description ? [text(`${id}-description`, value.description)] : []),
    ];
}
/**
 * Return fresh, validated definitions for the business-oriented component catalog.
 *
 * Definitions are recreated for each call so a caller cannot mutate the shared
 * built-in component configuration.
 */
export function getBusinessComponentDefinitions(): ReusableComponentDefinition[] {
    const invoiceLine = z.object({ description: short, quantity: z.number().int().min(1).max(99999), unitPrice: money, amount: money }).strict();
    const plan = z.object({ name: short, price: money, features: z.array(short).min(1).max(12) }).strict();
    const metric = z.object({ label: short, value: short }).strict();
    const feature = z.object({ title: short, description: body }).strict();
    const event = z.object({ title: short, date: short, location: short, actionText: short.optional(), actionUrl: link.optional() }).strict()
        .refine(v => Boolean(v.actionText) === Boolean(v.actionUrl), "Action and URL required together");
    return [
        define("mf-data-table", tableSchema, (p,c) => ({ id:c.nodeId,type:"table",props:structuredClone(p) as EmailNode["props"] }), "Validated, accessible, escaped data table"),
        define("mf-invoice-table", z.object({ title: short.optional(), currency: z.string().regex(/^[A-Z]{3}$/), lines: z.array(invoiceLine).min(1).max(60), total: money }).strict(), (p,c) => {
            const v = z.object({ title: short.optional(), currency: z.string().regex(/^[A-Z]{3}$/), lines: z.array(invoiceLine).min(1).max(60), total: money }).strict().parse(p);
            return makeTable(c.nodeId, ["Item","Qty","Unit price","Amount"], [
                ...v.lines.map(x => [x.description,String(x.quantity),`${v.currency} ${x.unitPrice}`,`${v.currency} ${x.amount}`]),
                ["Total","","",`${v.currency} ${v.total}`],
            ], v.title, ["left","right","right","right"]);
        }, "Invoice lines and supplied total; no floating-point arithmetic"),
        define("mf-pricing-comparison", z.object({ title: short.optional(), plans: z.array(plan).min(2).max(4) }).strict(), (p,c) => {
            const v = z.object({ title: short.optional(), plans: z.array(plan).min(2).max(4) }).strict().parse(p);
            const featureRows = Array.from({length:Math.max(...v.plans.map(x=>x.features.length))},(_,i)=>v.plans.map(x=>x.features[i] ?? "—"));
            return makeTable(c.nodeId,v.plans.map(x=>x.name),[v.plans.map(x=>x.price),...featureRows],v.title);
        }, "Side-by-side plans with readable fallback"),
        define("mf-transaction-summary", z.object({ title: short.optional(), items: z.array(z.object({label:short,value:short}).strict()).min(1).max(24) }).strict(), (p,c) => {
            const v = z.object({ title: short.optional(), items: z.array(z.object({label:short,value:short}).strict()).min(1).max(24) }).strict().parse(p);
            return makeTable(c.nodeId,["Detail","Value"],v.items.map(x=>[x.label,x.value]),v.title);
        }, "Transaction reference, method, status and amount rows"),
        define("mf-product-card", product, (p,c) => panel(c.nodeId,productNodes(c.nodeId,product.parse(p))), "Single product card with optional accessible image"),
        define("mf-product-grid", z.object({ products: z.array(product).min(1).max(8) }).strict(), (p,c) => {
            const v = z.object({ products: z.array(product).min(1).max(8) }).strict().parse(p);
            // Two MJML columns per row. Mobile clients may stack columns.
            return Array.from({length:Math.ceil(v.products.length/2)},(_,i):EmailNode=>({
                id:`${c.nodeId}-row-${i}`, type:"section", children:v.products.slice(i*2,i*2+2).map((x,j)=>({
                    id:`${c.nodeId}-col-${i}-${j}`, type:"column", children:productNodes(`${c.nodeId}-product-${i*2+j}`,x),
                })),
            }));
        }, "Two-column product gallery with MJML mobile stacking"),
        define("mf-coupon-code", z.object({ code:z.string().min(2).max(64).regex(/^[A-Za-z0-9_-]+$/), label: short.optional(), details: z.string().max(240).optional() }).strict(), (p,c) => {
            const v = z.object({ code:z.string().min(2).max(64).regex(/^[A-Za-z0-9_-]+$/), label: short.optional(), details: z.string().max(240).optional() }).strict().parse(p);
            return panel(c.nodeId,[...(v.label?[heading(`${c.nodeId}-title`,v.label)]:[]),text(`${c.nodeId}-code`,v.code,"promotional-code"),...(v.details?[text(`${c.nodeId}-detail`,v.details,"muted")]:[])]);
        }, "Highlighted discount code"),
        define("mf-discount-banner", promo, (p,c) => {
            const v = promo.parse(p);
            return panel(c.nodeId,[heading(`${c.nodeId}-title`,v.title),text(`${c.nodeId}-details`,v.detail),...(v.actionText&&v.actionUrl?[button(`${c.nodeId}-action`,v.actionText,v.actionUrl)]:[])]);
        }, "Sale/offer promotional banner"),
        define("mf-event-card", event, (p,c) => {
            const v = event.parse(p);
            return panel(c.nodeId,[heading(`${c.nodeId}-title`,v.title),text(`${c.nodeId}-date`,v.date),text(`${c.nodeId}-location`,v.location,"muted"),...(v.actionText&&v.actionUrl?[button(`${c.nodeId}-action`,v.actionText,v.actionUrl)]:[])]);
        }, "Event date, location and optional RSVP button"),
        define("mf-ticket-card", z.object({ event:short,attendee:short,ticketCode:short,admission:short.optional() }).strict(), (p,c) => {
            const v = z.object({ event:short,attendee:short,ticketCode:short,admission:short.optional() }).strict().parse(p);
            return makeTable(c.nodeId,["Ticket field","Details"],[["Event",v.event],["Attendee",v.attendee],["Ticket",v.ticketCode],...(v.admission?[["Admission",v.admission]]:[])]);
        }, "Structured event ticket details without externally generated QR codes"),
        define("mf-avatar", z.object({ src:link,alt:short,name:short.optional() }).strict(), (p,c) => {
            const v = z.object({ src:link,alt:short,name:short.optional() }).strict().parse(p);
            return panel(c.nodeId,[{id:`${c.nodeId}-image`,type:"image",props:{src:v.src,alt:v.alt},styles:{width:72}},...(v.name?[text(`${c.nodeId}-name`,v.name)]:[])]);
        }, "Accessible profile avatar"),
        define("mf-profile-card", z.object({name:short,role:short,organization:short,imageUrl:link.optional(),imageAlt:short.optional()}).strict().refine(v=>!v.imageUrl||Boolean(v.imageAlt),"Image alternative text is required"), (p,c) => {
            const v = z.object({name:short,role:short,organization:short,imageUrl:link.optional(),imageAlt:short.optional()}).strict().parse(p);
            return panel(c.nodeId,[...(v.imageUrl?[{id:`${c.nodeId}-image`,type:"image",props:{src:v.imageUrl,alt:v.imageAlt!},styles:{width:80}} satisfies EmailNode]:[]),heading(`${c.nodeId}-name`,v.name),text(`${c.nodeId}-role`,v.role),text(`${c.nodeId}-org`,v.organization,"muted")]);
        }, "Person/organization profile card"),
        define("mf-feature-grid", z.object({features:z.array(feature).min(1).max(8)}).strict(), (p,c) => {
            const v = z.object({features:z.array(feature).min(1).max(8)}).strict().parse(p);
            return Array.from({length:Math.ceil(v.features.length/2)},(_,i):EmailNode=>({id:`${c.nodeId}-row-${i}`,type:"section",children:v.features.slice(i*2,i*2+2).map((f,j)=>({id:`${c.nodeId}-col-${i}-${j}`,type:"column",children:[heading(`${c.nodeId}-name-${i}-${j}`,f.title),text(`${c.nodeId}-desc-${i}-${j}`,f.description)]}))}));
        }, "Feature blocks with responsive two-column rows"),
        define("mf-metric-grid", z.object({metrics:z.array(metric).min(1).max(12)}).strict(), (p,c) => {
            const v = z.object({metrics:z.array(metric).min(1).max(12)}).strict().parse(p);
            return makeTable(c.nodeId,["Metric","Value"],v.metrics.map(x=>[x.label,x.value]));
        }, "Structured metric summary"),
        define("mf-alert-banner", z.object({severity:z.enum(["info","success","warning","danger"]),title:short,message:body}).strict(), (p,c) => {
            const v = z.object({severity:z.enum(["info","success","warning","danger"]),title:short,message:body}).strict().parse(p);
            return panel(c.nodeId,[text(`${c.nodeId}-severity`,v.severity.toUpperCase(),"eyebrow"),heading(`${c.nodeId}-title`,v.title),text(`${c.nodeId}-message`,v.message)]);
        }, "Semantic alert with severity text and accessible content"),
        define("mf-verification-panel", z.object({title:short,code:z.string().min(4).max(16).regex(/^[A-Za-z0-9 -]+$/),expiresIn:short.optional(),notice:body.optional()}).strict(), (p,c) => {
            const v = z.object({title:short,code:z.string().min(4).max(16).regex(/^[A-Za-z0-9 -]+$/),expiresIn:short.optional(),notice:body.optional()}).strict().parse(p);
            return panel(c.nodeId,[heading(`${c.nodeId}-title`,v.title),text(`${c.nodeId}-code`,v.code,"promotional-code"),...(v.expiresIn?[text(`${c.nodeId}-expiry`,v.expiresIn,"muted")]:[]),...(v.notice?[text(`${c.nodeId}-notice`,v.notice,"body")]:[])]);
        }, "Readable verification code and expiration information"),
    ];
}
/** Stable names exposed by the built-in business component catalog. */
export const BUSINESS_COMPONENT_NAMES = [
    "mf-data-table","mf-invoice-table","mf-pricing-comparison","mf-transaction-summary",
    "mf-product-card","mf-product-grid","mf-coupon-code","mf-discount-banner",
    "mf-event-card","mf-ticket-card","mf-avatar","mf-profile-card",
    "mf-feature-grid","mf-metric-grid","mf-alert-banner","mf-verification-panel",
] as const;
/** Register every business component with a caller-owned component catalog. */
export function registerBusinessComponents(catalog: ComponentCatalog): void {
    for (const definition of getBusinessComponentDefinitions()) catalog.register(definition);
}
