/* global structuredClone */
/**
 * Task 8.5.19: opt-in preview fixtures ONLY. Not production defaults.
 * Every amount, metric and ticket below is explicitly demo data supplied to
 * the existing typed catalog builder via createEmail().render().
 */
import { getTemplatePreviewData } from '../template-preview-fixtures.mjs';

export const STRUCTURED_REVIEW_CASES = Object.freeze([
  {
    slug: 'billing-invoice', id: 'invoice-overdue', category: 'billing',
    marker: 'DEMO-SERVICE-8519',
    details: { billing: {
      referenceId: 'DEMO-INV-8519', currency: 'USD', amount: '36.00',
      lineItems: [
        { description: 'DEMO-SERVICE-8519', quantity: 2, unitPrice: '12.00', lineTotal: '24.00' },
        { description: 'Demo setup fee', quantity: 1, unitPrice: '12.00', lineTotal: '12.00' },
      ],
    } },
  },
  {
    slug: 'marketing-products', id: 'product-recommendation', category: 'marketing',
    marker: 'DEMO-PRODUCT-8519',
    details: { marketing: { products: [
      { name: 'DEMO-PRODUCT-8519', priceLabel: 'USD 20.00', description: 'Example only — not a real offer' },
      { name: 'Demo accessory', priceLabel: 'USD 8.00', description: 'Optional recommendation copy' },
    ] } },
  },
  {
    slug: 'events-ticket', id: 'event-ticket-issued', category: 'events',
    marker: 'DEMO-TICKET-8519',
    details: { event: {
      name: 'Demo Technology Summit',
      startsAt: '2026-11-05T10:00:00+05:30',
      endsAt: '2026-11-05T12:00:00+05:30',
      venue: 'Online demonstration',
      ticketCode: 'DEMO-TICKET-8519', admission: 'Demo General Admission',
    } },
  },
  {
    slug: 'saas-metrics', id: 'usage-limit-reached', category: 'saas',
    marker: 'DEMO-METRIC-8519',
    details: { saas: { workspaceName: 'Demo Workspace', usagePercent: 82, metrics: [
      { label: 'DEMO-METRIC-8519', value: '4,200' },
      { label: 'Demo active jobs', value: '16' },
    ] } },
  },
  {
    slug: 'authentication-security', id: 'login-attempt-blocked', category: 'authentication',
    marker: 'DEMO-DEVICE-8519',
    details: { security: {
      device: 'DEMO-DEVICE-8519', location: 'Demo Test Lab',
      occurredAt: '2026-10-13T18:30:00+05:30',
    } },
  },
]);

/** Do not mutate fixtures shared by the default 1,100-preview generator. */
export function structuredReviewData(reviewCase) {
  if (!STRUCTURED_REVIEW_CASES.includes(reviewCase)) throw new Error('Unknown structured review case');
  const base = getTemplatePreviewData({ id: reviewCase.id, category: reviewCase.category });
  return { ...base, ...structuredClone(reviewCase.details) };
}

/** Pure matrix check; the existing PreviewQuality checks still inspect every email. */
export function inspectStructuredReviewMatrix(entries, cases, themes) {
  const errors = [];
  if (!Array.isArray(entries) || !Array.isArray(cases) || !Array.isArray(themes) || !themes.length) {
    return ['Invalid structured review inputs'];
  }
  const keys = new Set();
  const expected = new Set(cases.flatMap(item => themes.map(theme => `${item.slug}\0${theme}`)));
  if (entries.length !== expected.size) errors.push(`Expected ${expected.size} structured previews but found ${entries.length}`);
  for (const entry of entries) {
    if (!entry || typeof entry.slug !== 'string' || typeof entry.theme !== 'string') {
      errors.push('Invalid structured preview entry');
      continue;
    }
    const key = `${entry.slug}\0${entry.theme}`;
    if (!expected.has(key)) errors.push(`Unexpected structured preview: ${entry.slug}/${entry.theme}`);
    if (keys.has(key)) errors.push(`Duplicate structured preview: ${entry.slug}/${entry.theme}`);
    keys.add(key);
  }
  for (const key of expected) {
    if (!keys.has(key)) errors.push(`Missing structured preview: ${key.replace('\0', '/')}`);
  }
  return errors;
}
