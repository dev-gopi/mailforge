import { createEmail } from "./packages/email/dist/index.js";
import { inspectEmailQuality } from "./packages/preview/dist/index.js";
import { getTemplatePreviewData } from "./apps/playground/template-preview-fixtures.mjs";

/**
 * Describes a registered agent automation job.
 */
export function describeJob(job) {
  return `Agent job: ${job}`;
}

/**
 * Audits a single rendered email template for deliverability, accessibility, and client safety.
 */
export async function auditTemplate(engine, templateName, sampleData) {
  const result = await engine.render(templateName, { data: sampleData });
  const quality = inspectEmailQuality(result.html);

  const findings = [];
  if (quality.exceedsGmailLimit) {
    findings.push(`[WARN] Size (${quality.sizeKb} KB) exceeds 102 KB limit. Gmail will clip this message.`);
  }
  if (quality.imagesMissingAlt > 0) {
    findings.push(`[WARN] ${quality.imagesMissingAlt} image(s) missing alt attribute.`);
  }
  if (quality.unsafeLinks.length > 0) {
    findings.push(`[FAIL] Unsafe link scheme(s) detected: ${quality.unsafeLinks.join(", ")}`);
  }
  if (!quality.hasUnsubscribe) {
    findings.push(`[WARN] Missing unsubscribe or preference link in email body.`);
  }

  return {
    template: templateName,
    subject: result.subject,
    sizeBytes: quality.sizeBytes,
    sizeKb: quality.sizeKb,
    score: quality.score,
    passed: quality.unsafeLinks.length === 0,
    findings,
  };
}

/**
 * Runs the automated repository QA agent across all primary MailForge templates.
 */
export async function runEmailAuditAgent(options = {}) {
  const email = createEmail({
    brand: {
      name: "MailForge Agent",
      primaryColor: "#2563eb",
      website: "https://mailforge.dev",
      supportEmail: "support@mailforge.dev",
    },
    footer: {
      message: "To update preferences or unsubscribe, visit your account settings.",
    },
    theme: "modern",
  });

  const templatesToAudit = options.template
    ? [options.template]
    : ["welcome", "newsletter", "promotion", "shipping-update", "otp", "password-reset", "order-confirmation", "invoice"];

  const results = [];
  for (const name of templatesToAudit) {
    const data = getTemplatePreviewData({ id: name, category: "transactional" });
    try {
      const audit = await auditTemplate(email, name, data);
      results.push(audit);
    } catch (err) {
      results.push({
        template: name,
        passed: false,
        score: 0,
        findings: [`[ERROR] Failed to render: ${err.message}`],
      });
    }
  }

  const passedCount = results.filter((r) => r.passed).length;
  const avgScore = (results.reduce((acc, r) => acc + (r.score ?? 0), 0) / (results.length || 1)).toFixed(1);

  return {
    job: describeJob("validate generated email templates"),
    timestamp: new Date().toISOString(),
    templatesCount: results.length,
    passedCount,
    avgScore: Number(avgScore),
    results,
  };
}

// CLI Execution entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Starting MailForge Template Audit Agent...\n");
  runEmailAuditAgent()
    .then((report) => {
      console.log(`[AGENT] ${report.job}`);
      console.log(`[AGENT] Audited ${report.templatesCount} templates | Passed: ${report.passedCount}/${report.templatesCount} | Avg Score: ${report.avgScore}/100\n`);

      for (const res of report.results) {
        const icon = res.passed ? "✔" : "✖";
        console.log(`${icon} [${res.template.padEnd(20)}] Quality Score: ${String(res.score).padStart(3)}/100 (${res.sizeKb ?? 0} KB)`);
        for (const finding of res.findings) {
          console.log(`   ${finding}`);
        }
      }
      console.log("\nAgent execution finished successfully.");
    })
    .catch((err) => {
      console.error("[AGENT ERROR]", err);
      process.exit(1);
    });
}

