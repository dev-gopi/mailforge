import { performance } from "node:perf_hooks";
import { createEmail } from "../../packages/email/dist/index.js";
import { compileTemplate, MemoryCache } from "../../packages/core/dist/index.js";

async function runBenchmark(name, iterations, fn) {
  // Warm-up phase
  for (let i = 0; i < Math.min(10, iterations); i += 1) {
    await fn(i);
  }

  const startMem = process.memoryUsage().heapUsed;
  const start = performance.now();

  for (let i = 0; i < iterations; i += 1) {
    await fn(i);
  }

  const durationMs = performance.now() - start;
  const endMem = process.memoryUsage().heapUsed;
  const memDeltaKb = ((endMem - startMem) / 1024).toFixed(2);
  const opsPerSec = ((iterations / durationMs) * 1000).toFixed(0);
  const avgMs = (durationMs / iterations).toFixed(3);

  console.log(
    `[BENCH] ${name.padEnd(36)} | ${String(iterations).padStart(6)} ops | ${durationMs.toFixed(2).padStart(8)} ms | ${avgMs.padStart(7)} ms/op | ${String(opsPerSec).padStart(8)} ops/s | mem: ${memDeltaKb} KB`,
  );

  return { name, iterations, durationMs, avgMs, opsPerSec };
}

async function main() {
  console.log("===============================================================================");
  console.log(" MailForge Performance & Rendering Benchmark Suite");
  console.log(" Node:", process.version, "| OS:", process.platform, process.arch);
  console.log("===============================================================================\n");

  // 1. Template Compiler Benchmark
  const rawTpl = "Hello {{ user.name }}, your order #{{ order.id }} has shipped to {{ address.city }}!";
  const compiled = compileTemplate(rawTpl);
  const tplData = {
    user: { name: "Alex Mercer" },
    order: { id: "ORD-99420" },
    address: { city: "San Francisco" },
  };

  await runBenchmark("compileTemplate (pre-compiled eval)", 20000, () => {
    compiled(tplData);
  });

  await runBenchmark("compileTemplate (full parse & render)", 5000, () => {
    compileTemplate(rawTpl, tplData);
  });

  // 2. In-Memory Cache Benchmark
  const cache = new MemoryCache({ maxSize: 1000 });
  await runBenchmark("MemoryCache (set & get cycle)", 10000, (i) => {
    const key = `key-${i % 200}`;
    cache.set(key, { index: i, value: "cached-data" });
    cache.get(key);
  });

  // 3. Full Email Engine Rendering Benchmark
  const email = createEmail({
    brand: {
      name: "BenchBrand",
      primaryColor: "#2563eb",
    },
  });

  const renderData = {
    user: { firstName: "Jane Doe" },
    actionUrl: "https://example.com/welcome?token=bench123",
  };

  await runBenchmark("MailForgeEmail.render (welcome)", 200, async () => {
    await email.render("welcome", { data: renderData });
  });

  // 4. Concurrent Rendering Benchmark
  const startConcurrent = performance.now();
  const batchSize = 100;
  const promises = [];
  for (let i = 0; i < batchSize; i += 1) {
    promises.push(
      email.render("welcome", {
        data: {
          user: { firstName: `User${i}` },
          actionUrl: `https://example.com/invite?id=${i}`,
        },
      }),
    );
  }
  const results = await Promise.all(promises);
  const concurrentDuration = performance.now() - startConcurrent;
  console.log(
    `[BENCH] ${"Concurrent render batch (100 parallel)".padEnd(36)} | ${String(batchSize).padStart(6)} ops | ${concurrentDuration.toFixed(2).padStart(8)} ms | ${(concurrentDuration / batchSize).toFixed(3).padStart(7)} ms/op | ${((batchSize / concurrentDuration) * 1000).toFixed(0).padStart(8)} ops/s | status: ${results.length === 100 ? "OK" : "FAIL"}`,
  );

  console.log("\n===============================================================================");
  console.log(" Benchmark completed successfully.");
  console.log("===============================================================================");
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
