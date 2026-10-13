import { performance } from "node:perf_hooks";

const start = performance.now();
for (let index = 0; index < 1000; index += 1) JSON.stringify({ index });
console.log(`Serialization benchmark: ${(performance.now() - start).toFixed(2)}ms`);
