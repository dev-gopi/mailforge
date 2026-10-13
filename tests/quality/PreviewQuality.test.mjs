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

// Task 8.5.19: release matrix regression coverage
const releaseThemes = [
  'modern', 'minimal', 'corporate', 'dark', 'premium', 'ocean',
  'forest', 'sunset', 'elegant', 'playful',
];
const makeReleaseMatrix = ids => ids.flatMap(id => releaseThemes.flatMap(theme => [
  { id, theme, variant: 'default' },
  ...(theme === 'modern' ? [{ id, theme, variant: 'no-heading' }] : []),
]));

test('accepts 100 templates across 10 themes plus modern/no-heading (1100 previews)', () => {
  const ids = Array.from({ length: 100 }, (_, i) => `template-${i}`);
  const entries = makeReleaseMatrix(ids);
  assert.equal(entries.length, 1100);
  assert.deepEqual(inspectPreviewManifest({ catalogCount: 100, failed: 0, errors: [], entries }, releaseThemes), []);
});

test('rejects a missing complete theme instead of trusting the themes found in the manifest', () => {
  const entries = makeReleaseMatrix(['welcome']).filter(row => row.theme !== 'playful');
  const result = inspectPreviewManifest({ catalogCount: 1, failed: 0, errors: [], entries }, releaseThemes);
  assert.ok(result.some(message => message.includes('Expected 11 template/theme samples')));
  assert.ok(result.some(message => message.includes('Missing default preview: welcome/playful')));
});

test('rejects missing default/no-heading previews, unexpected variants and template-count mismatch', () => {
  const entries = makeReleaseMatrix(['welcome']);
  const missing = inspectPreviewManifest({
    catalogCount: 1, failed: 0, errors: [],
    entries: entries.filter(row => !(row.theme === 'modern' && row.variant === 'no-heading')),
  }, releaseThemes);
  assert.ok(missing.some(message => message.includes('Missing no-heading preview')));
  const invalid = inspectPreviewManifest({
    catalogCount: 2, failed: 0, errors: [],
    entries: [...entries, { id: 'welcome', theme: 'corporate', variant: 'no-heading' }],
  }, releaseThemes);
  assert.ok(invalid.some(message => message.includes('Unexpected preview variant')));
  assert.ok(invalid.some(message => message.includes('distinct templates')));
});
