import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  STRUCTURED_REVIEW_CASES, structuredReviewData, inspectStructuredReviewMatrix,
} from '../../scripts/lib/Stage8519Review.mjs';

const themes = ['modern', 'minimal', 'corporate', 'dark', 'premium', 'ocean', 'forest', 'sunset', 'elegant', 'playful'];
const entries = STRUCTURED_REVIEW_CASES.flatMap(item => themes.map(theme => ({ slug: item.slug, theme })));

test('five independent, purpose-specific structured review cases are present', () => {
  assert.equal(STRUCTURED_REVIEW_CASES.length, 5);
  assert.equal(new Set(STRUCTURED_REVIEW_CASES.map(item => item.id)).size, 5);
  assert.deepEqual(new Set(STRUCTURED_REVIEW_CASES.map(item => item.category)),
    new Set(['billing', 'marketing', 'events', 'saas', 'authentication']));
});
test('case fixtures are explicitly caller-supplied and do not change base preview data', () => {
  for (const item of STRUCTURED_REVIEW_CASES) {
    const a = structuredReviewData(item);
    const b = structuredReviewData(item);
    assert.ok(a.recipientName && a.actionUrl && item.marker);
    assert.notEqual(a, b);
    assert.deepEqual(a, b);
  }
  assert.throws(() => structuredReviewData({}), /Unknown structured review case/);
});
test('financial demo fixture supplies, rather than computes, every amount', () => {
  const item = STRUCTURED_REVIEW_CASES.find(row => row.category === 'billing');
  const data = structuredReviewData(item);
  assert.equal(data.billing.amount, '36.00');
  assert.equal(data.billing.currency, 'USD');
  assert.equal(data.billing.lineItems.length, 2);
});
test('marketing demo still carries the required unsubscribe URL', () => {
  const item = STRUCTURED_REVIEW_CASES.find(row => row.category === 'marketing');
  assert.match(structuredReviewData(item).unsubscribeUrl, /^https:\/\//);
});
test('all structured scenarios have distinct valid markers in test-supplied values', () => {
  assert.equal(new Set(STRUCTURED_REVIEW_CASES.map(item => item.marker)).size, 5);
  for (const item of STRUCTURED_REVIEW_CASES) {
    assert.ok(JSON.stringify(structuredReviewData(item)).includes(item.marker));
  }
});
test('full 5 x 10 scenario/theme matrix is accepted', () => {
  assert.deepEqual(inspectStructuredReviewMatrix(entries, STRUCTURED_REVIEW_CASES, themes), []);
});
test('missing or duplicate scenario renders are caught', () => {
  assert.ok(inspectStructuredReviewMatrix(entries.slice(1), STRUCTURED_REVIEW_CASES, themes)
    .some(message => message.includes('Missing')));
  assert.ok(inspectStructuredReviewMatrix([...entries, entries[0]], STRUCTURED_REVIEW_CASES, themes)
    .some(message => message.includes('Duplicate')));
});
test('unknown theme and malformed manifest entries are rejected', () => {
  assert.ok(inspectStructuredReviewMatrix([{ slug: 'billing-invoice', theme: 'unknown' }], STRUCTURED_REVIEW_CASES, themes)
    .some(message => message.includes('Unexpected')));
  assert.ok(inspectStructuredReviewMatrix([null], STRUCTURED_REVIEW_CASES, themes)
    .some(message => message.includes('Invalid')));
});
