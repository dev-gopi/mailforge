import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inspectEmailPreview, inspectPreviewManifest } from '../../scripts/lib/PreviewQuality.mjs';

const entry = { id: 'welcome', category: 'account', subject: 'Welcome' };
const html = '<!doctype html><html lang="en" dir="ltr"><head><meta name="viewport" content="width=device-width"></head><body><a href="https://example.com">Open</a><img src="https://example.com/logo.png" alt="Logo"></body></html>';
const inspect = (override = {}) => inspectEmailPreview({ html, text: 'Welcome to MailForge', entry, ...override });

test('accepts a simple valid accessible preview', () => {
  assert.deepEqual(inspect().errors, []);
});
test('rejects scripts and inline event handlers', () => {
  const result = inspect({ html: html.replace('</body>', '<script>alert(1)</script><a onclick="evil()">Hi</a></body>') });
  assert.ok(result.errors.some(message => message.includes('script')));
  assert.ok(result.errors.some(message => message.includes('event-handler')));
});
test('rejects encoded JavaScript links', () => {
  const result = inspect({ html: html.replace('https://example.com', 'jav&#x61;script&#58;alert(1)') });
  assert.ok(result.errors.some(message => message.includes('Unsafe link')));
});
test('requires image alt, including for decorative images', () => {
  const result = inspect({ html: html.replace(' alt="Logo"', '') });
  assert.ok(result.errors.some(message => message.includes('alt attribute')));
});
test('rejects missing direction and missing plain-text output', () => {
  const result = inspect({ html: html.replace(' dir="ltr"', ''), text: '   ' });
  assert.ok(result.errors.some(message => message.includes('direction')));
  assert.ok(result.errors.some(message => message.includes('Plain-text')));
});
test('requires unsubscribe content for marketing', () => {
  const result = inspect({ entry: { id: 'campaign', category: 'marketing', subject: 'Offer' } });
  assert.ok(result.errors.some(message => message.includes('unsubscribe')));
});
test('rejects over-budget output', () => {
  const result = inspect({ maxHtmlBytes: 100 });
  assert.ok(result.errors.some(message => message.includes('exceeds')));
});
test('accepts a complete unique four-variant manifest', () => {
  const rows = ['modern/default', 'modern/no-heading', 'corporate/default', 'minimal/default'].map(value => {
    const [theme, variant] = value.split('/');
    return { id: 'welcome', theme, variant };
  });
  assert.deepEqual(inspectPreviewManifest({ catalogCount: 1, failed: 0, entries: rows, errors: [] }), []);
});
test('rejects incomplete or duplicate manifests', () => {
  const rows = [{ id: 'welcome', theme: 'modern', variant: 'default' }];
  const messages = inspectPreviewManifest({ catalogCount: 1, failed: 1, errors: [{}], entries: [...rows, ...rows] });
  assert.ok(messages.some(message => message.includes('rendering failures')));
  assert.ok(messages.some(message => message.includes('Expected')));
  assert.ok(messages.some(message => message.includes('Duplicate')));
});
