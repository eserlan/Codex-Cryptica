/**
 * Discovery intent registry — coverage report (#2566 follow-up).
 *
 * The audit answers "what is wrong?". This answers "what is missing?", which is
 * the question worth asking when choosing what to build next.
 *
 * Read-only and always exits 0. It is a planning aid, never a gate — the issue
 * that introduced the registry was explicit that derived reports must not
 * become blockers.
 *
 * Usage:
 *   bun scripts/discovery-report.mjs          human-readable
 *   bun scripts/discovery-report.mjs --json   machine-readable
 */
import {
  buildReport,
  clusterCoverage,
  JOB_ORDER,
} from "../apps/web/src/lib/content/discovery/report.ts";
import { entries } from "../apps/web/src/lib/content/discovery/entries/index.ts";

const report = buildReport(entries);

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const pad = (value, width) => String(value).padEnd(width);
const { totals } = report;

console.log(`\nDiscovery intent registry — coverage\n`);
console.log(
  `  ${totals.entries} entries (${totals.indexable} indexable) across ${totals.clusters} clusters`,
);
console.log(
  `  ${totals.aliases} intent aliases absorbed without minting URLs (${totals.ratio.toFixed(1)} per page)`,
);

console.log(`\n\nBy family\n`);
for (const [kind, count] of report.families) {
  console.log(`  ${pad(kind, 12)} ${count}`);
}

// --- cluster × job matrix -------------------------------------------------
// +2 so the longest cluster name still has a gap before the first column.
const NAME_WIDTH =
  Math.max(8, ...clusterCoverage(entries).map((row) => row.cluster.length)) + 2;
const COL = 11;

console.log(`\n\nCluster × user job\n`);
console.log(
  "  " +
    pad("cluster", NAME_WIDTH) +
    JOB_ORDER.map((job) => pad(job.slice(0, COL - 1), COL)).join(""),
);
console.log("  " + "-".repeat(NAME_WIDTH + JOB_ORDER.length * COL));

for (const row of clusterCoverage(entries)) {
  const cells = JOB_ORDER.map((job) =>
    pad(row.byJob.get(job)?.length ?? "·", COL),
  ).join("");
  console.log("  " + pad(row.cluster, NAME_WIDTH) + cells);
}

// --- what to build next ---------------------------------------------------
console.log(`\n\nCoverage gaps — candidates, not defects\n`);
if (report.gaps.length === 0) {
  console.log("  None.");
} else {
  for (const gap of report.gaps) {
    console.log(`  ${gap.message}`);
  }
}

if (report.missingExamples.length > 0) {
  const all = report.missingExamples.length === totals.clusters;
  console.log(
    `\n\nNo "see-an-example" page in ${report.missingExamples.length} of ${totals.clusters} clusters${
      all ? " — the whole job is unserved sitewide" : ""
    }\n`,
  );
  for (const cluster of report.missingExamples.slice(0, 12)) {
    console.log(`  ${cluster}`);
  }
  if (report.missingExamples.length > 12) {
    console.log(`  … and ${report.missingExamples.length - 12} more`);
  }
}

console.log(
  `\n\nA gap is a question, not a task. Add a page only when it does a job no\n` +
    `existing page does — see docs/discovery-intent-registry.md.\n`,
);
