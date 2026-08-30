/**
 * Discovery intent registry audit (#2566).
 *
 * Two jobs, deliberately separated:
 *
 *   errors   — decidable from the data (duplicate ids, paths, unowned intents,
 *              live discovery routes with no entry). Safe to fail a build on.
 *   warnings — possible overlap that needs a person. Reported, never fatal;
 *              the issue is explicit that fuzzy overlap must not become a
 *              brittle CI failure.
 *
 * Usage:
 *   bun scripts/discovery-audit.mjs           report, exit non-zero on errors
 *   bun scripts/discovery-audit.mjs --report  report only, always exit 0
 */
import {
  auditDiscoveryRegistry,
  findUnregisteredPaths,
  findOrphanedEntries,
  errorsOnly,
  warningsOnly,
} from "../apps/web/src/lib/content/discovery/audit.ts";
import { entries } from "../apps/web/src/lib/content/discovery/entries/index.ts";
import { listGovernedPaths } from "../apps/web/src/lib/content/discovery/governed-routes.ts";

const reportOnly = process.argv.includes("--report");

const governedPaths = listGovernedPaths();
const findings = [
  ...auditDiscoveryRegistry(entries),
  ...findUnregisteredPaths(governedPaths, entries),
  ...findOrphanedEntries(governedPaths, entries),
];

const errors = errorsOnly(findings);
const warnings = warningsOnly(findings);

const byCode = (list) => {
  const grouped = new Map();
  for (const finding of list) {
    grouped.set(finding.code, [...(grouped.get(finding.code) ?? []), finding]);
  }
  return grouped;
};

console.log(`Discovery intent registry: ${entries.length} entries\n`);

if (errors.length > 0) {
  console.log(`✖ ${errors.length} error(s)\n`);
  for (const [code, group] of byCode(errors)) {
    console.log(`  ${code}`);
    for (const finding of group) console.log(`    - ${finding.message}`);
    console.log("");
  }
}

if (warnings.length > 0) {
  console.log(`⚠ ${warnings.length} warning(s) — review, not a failure\n`);
  for (const [code, group] of byCode(warnings)) {
    console.log(`  ${code}`);
    for (const finding of group) console.log(`    - ${finding.message}`);
    console.log("");
  }
}

if (errors.length === 0 && warnings.length === 0) {
  console.log("✔ No findings.");
}

if (errors.length > 0 && !reportOnly) {
  process.exitCode = 1;
}
