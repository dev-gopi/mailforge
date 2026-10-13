#!/usr/bin/env node
import { runCli } from "./index.js";

void runCli(process.argv.slice(2)).catch((error: unknown) => {
  console.error(`MailForge CLI error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
