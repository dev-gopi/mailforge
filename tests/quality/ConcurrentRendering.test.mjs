/* global structuredClone */
/** Live checks against MailForge's built ESM engine. Run after pnpm build. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmail } from '../../packages/email/dist/index.js';

const dataFor = (name) => ({
  user: { firstName: name },
  actionUrl: `https://example.com/dashboard?name=${encodeURIComponent(name)}`,
});

test('parallel personalization does not mix recipients on one engine', async () => {
  const engine = createEmail({ brand: { name: 'Concurrent QA', primaryColor: '#2563eb' } });
  const names = Array.from({ length: 12 }, (_, index) => `RecipientUnique${index}XYZ`);
  const outputs = await Promise.all(names.map(name => engine.render('welcome', { data: dataFor(name) })));
  for (let i = 0; i < outputs.length; i++) {
    const result = outputs[i];
    assert.match(result.html, new RegExp(names[i]));
    assert.ok(result.text.includes(names[i]));
    assert.ok(result.subject.includes(names[i]));
    for (let j = 0; j < names.length; j++) {
      if (j !== i) assert.ok(!result.html.includes(names[j]), `Recipient ${names[j]} leaked into email for ${names[i]}`);
    }
  }
});

test('two independently configured engines retain separate branding', async () => {
  const a = createEmail({ brand: { name: 'BrandAlphaUnique', primaryColor: '#123456' } });
  const b = createEmail({ brand: { name: 'BrandBetaUnique', primaryColor: '#654321' } });
  const [first, second] = await Promise.all([
    a.render('welcome', { data: dataFor('AliceUnique') }),
    b.render('welcome', { data: dataFor('BobUnique') }),
  ]);
  assert.ok(first.html.includes('BrandAlphaUnique'));
  assert.ok(!first.html.includes('BrandBetaUnique'));
  assert.ok(second.html.includes('BrandBetaUnique'));
  assert.ok(!second.html.includes('BrandAlphaUnique'));
});

test('failed unsafe render does not poison concurrent valid render', async () => {
  const email = createEmail();
  const [bad, good] = await Promise.allSettled([
    email.render('welcome', { data: dataFor('UnsafeName'), theme: { colors: { primary: 'javascript:bad' } } }),
    email.render('welcome', { data: dataFor('ValidNameXYZ') }),
  ]);
  assert.equal(bad.status, 'rejected');
  assert.equal(good.status, 'fulfilled');
  assert.ok(good.value.html.includes('ValidNameXYZ'));
});

test('rendering leaves application-supplied template data unchanged', async () => {
  const engine = createEmail();
  const data = dataFor('ImmutablePerson');
  const before = structuredClone(data);
  await Promise.all(Array.from({ length: 4 }, () => engine.render('welcome', { data })));
  assert.deepEqual(data, before);
});
