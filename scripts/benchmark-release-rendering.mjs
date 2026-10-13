#!/usr/bin/env node
/** Lightweight repeatable benchmark. This does not define a universal pass/fail performance threshold. */
import { performance } from 'node:perf_hooks';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createEmail } from '../packages/email/dist/index.js';
import { getTemplatePreviewData } from './template-preview-fixtures.mjs';

const iterations = 20;
const email = createEmail({ brand: { name: 'MailForge QA', primaryColor: '#2563eb' } });
const catalog = email.listBuiltinCatalog();
const ids = ['welcome', 'invoice', 'service-outage'];
const percentile = (sorted, value) => sorted[Math.max(0, Math.ceil(sorted.length * value) - 1)];
const results = [];
for (const id of ids) {
  const definition = catalog.find(entry => entry.id === id);
  if (!definition) throw new Error(`Required benchmark template not found: ${id}`);
  const data = getTemplatePreviewData(definition);
  await email.render(id, { data }); // warm-up
  const measurements = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const result = await email.render(id, { data });
    if (!result.html || !result.text) throw new Error(`Empty rendering for ${id}`);
    measurements.push(performance.now() - start);
  }
  measurements.sort((a, b) => a - b);
  results.push({ id, iterations, p50Ms: Number(percentile(measurements, 0.50).toFixed(2)),
    p95Ms: Number(percentile(measurements, 0.95).toFixed(2)),
    maxMs: Number(measurements.at(-1).toFixed(2)) });
}
const output = path.resolve('generated/template-audit/render-benchmark.json');
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, JSON.stringify({ createdAt: new Date().toISOString(), node: process.version, results }, null, 2) + '\n');
for (const item of results) console.log(`${item.id}: p50=${item.p50Ms}ms p95=${item.p95Ms}ms max=${item.maxMs}ms`);
console.log(`Benchmark saved: ${output}`);
