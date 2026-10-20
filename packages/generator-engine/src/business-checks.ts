/**
 * Business / Enterprise Generator (#3627, spec 180) — deterministic checks
 * (FR-007) and repair. Every local document passes; AI output is checked and,
 * where needed, the failing sections are rebuilt from the tables.
 */

import type { Rng } from "./random-utils";
import { defaultRng } from "./random-utils";
import { CRIMINAL_WORDS, PRICE_PATTERN } from "./business-tables";
import {
  BUSINESS_STAFF_RANGE,
  localSectionFor,
  pickUnique,
} from "./business-local";
import {
  businessSectionLabel,
  type BusinessDocument,
  type BusinessSectionId,
} from "./business-state";

export type BusinessIssueCode =
  | "missing"
  | "hook-unanchored"
  | "legit-secret-criminal"
  | "staff-count"
  | "inventory-list"
  | "management-mismatch";

export interface BusinessIssue {
  section: BusinessSectionId;
  code: BusinessIssueCode;
  detail: string;
}

const HOOK_COUNT: readonly [number, number] = [2, 3];

function blank(value: string | undefined): boolean {
  return !value || value.trim() === "";
}

function missing(
  section: BusinessSectionId,
  label: string,
  value: string | undefined,
): BusinessIssue[] {
  return blank(value)
    ? [{ section, code: "missing", detail: `${label} is empty.` }]
    : [];
}

/** Names and key words that a hook may use to tie back to the business. */
export function hookAnchors(doc: BusinessDocument): string[] {
  const words = [doc.pressure, doc.asset, doc.secret]
    .join(" ")
    .split(/[^A-Za-z]+/)
    .filter((w) => w.length >= 6);
  return [
    doc.leadership.name,
    ...doc.staff.map((p) => p.name),
    ...doc.relationships.map((r) => r.name),
    ...doc.dependencies.map((d) => d.input),
    ...words,
  ].filter((a) => a && a.trim() !== "");
}

function identityIssues(doc: BusinessDocument): BusinessIssue[] {
  return [
    ...missing("identity", "Business name", doc.identity.name),
    ...missing("identity", "Business type", doc.identity.type),
    ...missing("identity", "Description", doc.identity.description),
    ...missing("identity", "Reputation line", doc.identity.reputationLine),
    ...missing("identity", "Distinctive feature", doc.identity.distinctive),
  ];
}

function operationsIssues(doc: BusinessDocument): BusinessIssue[] {
  return [
    ...missing("operations", "What it provides", doc.operations.provides),
    ...missing("operations", "Who pays", doc.operations.payers),
    ...missing("operations", "Why it is here", doc.operations.whyHere),
    ...missing("operations", "Main income", doc.operations.mainIncome),
  ];
}

function leadershipAndStaffIssues(doc: BusinessDocument): BusinessIssue[] {
  const issues = [
    ...missing("leadership", "Leader name", doc.leadership.name),
    ...missing("leadership", "Leader goal", doc.leadership.goal),
    ...missing("leadership", "Leader trait", doc.leadership.trait),
  ];
  for (const p of doc.staff) {
    if (blank(p.name) || blank(p.role) || blank(p.trait)) {
      issues.push({
        section: `staff:${p.id}`,
        code: "missing",
        detail: "A staff member is incomplete.",
      });
    }
  }
  return issues;
}

function clienteleAndReputationIssues(doc: BusinessDocument): BusinessIssue[] {
  return [
    ...missing("clientele", "Typical clientele", doc.clientele.typical),
    ...missing("clientele", "Valuable clientele", doc.clientele.valuable),
    ...missing("clientele", "Undesirable clientele", doc.clientele.undesirable),
    ...missing("reputation", "Perception", doc.reputation.perception),
    ...missing("reputation", "Consequence", doc.reputation.consequence),
  ];
}

function connectionIssues(doc: BusinessDocument): BusinessIssue[] {
  const issues: BusinessIssue[] = [];
  if (doc.dependencies.length < 1)
    issues.push({
      section: "dependencies",
      code: "missing",
      detail: "No dependency.",
    });
  for (const d of doc.dependencies) {
    if (blank(d.input) || blank(d.ifItFails)) {
      issues.push({
        section: "dependencies",
        code: "missing",
        detail: "A dependency is incomplete.",
      });
    }
  }
  if (doc.relationships.length < 1)
    issues.push({
      section: "relationships",
      code: "missing",
      detail: "No relationship.",
    });
  for (const r of doc.relationships) {
    if (blank(r.name) || blank(r.reason)) {
      issues.push({
        section: "relationships",
        code: "missing",
        detail: "A relationship is incomplete.",
      });
    }
  }
  return issues;
}

function hookCountIssues(doc: BusinessDocument): BusinessIssue[] {
  if (doc.hooks.length >= HOOK_COUNT[0] && doc.hooks.length <= HOOK_COUNT[1])
    return [];
  return [
    {
      section: "hooks",
      code: "missing",
      detail: "Adventure hooks must number 2 to 3.",
    },
  ];
}

function checkRequiredFields(doc: BusinessDocument): BusinessIssue[] {
  return [
    ...identityIssues(doc),
    ...operationsIssues(doc),
    ...leadershipAndStaffIssues(doc),
    ...clienteleAndReputationIssues(doc),
    ...missing("pressure", "Current pressure", doc.pressure),
    ...missing("asset", "Unusual asset", doc.asset),
    ...missing("secret", "Secret", doc.secret),
    ...missing("opportunity", "Opportunity", doc.opportunity),
    ...missing("complication", "Complication", doc.complication),
    ...connectionIssues(doc),
    ...hookCountIssues(doc),
  ];
}

function checkStaffCount(doc: BusinessDocument): BusinessIssue[] {
  const [min, max] = BUSINESS_STAFF_RANGE[doc.options.scale];
  const count = doc.staff.length;
  if (count >= min && count <= max) return [];
  return [
    {
      section: doc.staff[0] ? `staff:${doc.staff[0].id}` : "identity",
      code: "staff-count",
      detail: `${count} staff does not fit a ${doc.options.scale} business (${min} to ${max}).`,
    },
  ];
}

function checkSecret(doc: BusinessDocument): BusinessIssue[] {
  if (doc.options.legitimacy !== "legitimate") return [];
  const lower = doc.secret.toLowerCase();
  const hit = CRIMINAL_WORDS.find((w) => lower.includes(w));
  return hit
    ? [
        {
          section: "secret",
          code: "legit-secret-criminal",
          detail: `A legitimate business's secret reads as criminal ("${hit}").`,
        },
      ]
    : [];
}

function checkHooks(doc: BusinessDocument): BusinessIssue[] {
  const anchors = hookAnchors(doc).map((a) => a.toLowerCase());
  return doc.hooks
    .filter((hook) => {
      const lower = hook.toLowerCase();
      return !anchors.some((a) => lower.includes(a));
    })
    .map((hook) => ({
      section: "hooks" as const,
      code: "hook-unanchored" as const,
      detail: `A hook names nothing established in the business: "${hook.slice(0, 60)}".`,
    }));
}

function textBySection(
  doc: BusinessDocument,
): Array<[BusinessSectionId, string]> {
  const pairs: Array<[BusinessSectionId, string]> = [
    ["identity", Object.values(doc.identity).join(" ")],
    ["operations", Object.values(doc.operations).join(" ")],
    ["clientele", Object.values(doc.clientele).join(" ")],
    ["reputation", Object.values(doc.reputation).join(" ")],
    ["pressure", doc.pressure],
    ["asset", doc.asset],
    ["secret", doc.secret],
    ["opportunity", doc.opportunity],
    ["complication", doc.complication],
    ["hooks", doc.hooks.join(" ")],
    [
      "dependencies",
      doc.dependencies.map((d) => `${d.input} ${d.ifItFails}`).join(" "),
    ],
    [
      "relationships",
      doc.relationships.map((r) => `${r.name} ${r.reason}`).join(" "),
    ],
  ];
  for (const p of [doc.leadership, ...doc.staff]) {
    pairs.push([
      p.id === "lead" ? "leadership" : `staff:${p.id}`,
      `${p.goal} ${p.trait} ${p.pressure ?? ""}`,
    ]);
  }
  return pairs;
}

function checkInventory(doc: BusinessDocument): BusinessIssue[] {
  return textBySection(doc)
    .filter(([, text]) => PRICE_PATTERN.test(text))
    .map(([section]) => ({
      section,
      code: "inventory-list" as const,
      detail: "Prices or coin amounts do not belong in a business description.",
    }));
}

function checkManagement(doc: BusinessDocument): BusinessIssue[] {
  const issues: BusinessIssue[] = [];
  const wantsManager = doc.options.playersOwn;
  if (wantsManager !== (doc.management !== undefined)) {
    issues.push({
      section: "management",
      code: "management-mismatch",
      detail: wantsManager
        ? "Players own this business, but the management section is missing."
        : "The management section is present, but the players do not own this business.",
    });
  }
  if (wantsManager !== (doc.leadership.role === "manager")) {
    issues.push({
      section: "leadership",
      code: "management-mismatch",
      detail: wantsManager
        ? "Leadership should be a manager the party employs."
        : "Leadership should be the owner.",
    });
  }
  return issues;
}

/** Every failing check, across the whole document. Empty when the document is usable. */
export function checkBusiness(doc: BusinessDocument): BusinessIssue[] {
  return [
    ...checkRequiredFields(doc),
    ...checkStaffCount(doc),
    ...checkSecret(doc),
    ...checkHooks(doc),
    ...checkInventory(doc),
    ...checkManagement(doc),
  ];
}

/** Sections whose text a hook may name. A change to one of them can break an anchor. */
const ANCHOR_SECTIONS = new Set<string>([
  "leadership",
  "relationships",
  "dependencies",
  "pressure",
  "asset",
  "secret",
]);

const REPAIR_ORDER: BusinessSectionId[] = [
  "identity",
  "operations",
  "clientele",
  "reputation",
  "pressure",
  "asset",
  "secret",
  "opportunity",
  "complication",
  "dependencies",
  "relationships",
  "leadership",
  "management",
];

/** Trims extra staff, or adds placeholders, until the count fits the scale. */
function fitStaffToScale(doc: BusinessDocument, rng: Rng): BusinessDocument {
  const [min, max] = BUSINESS_STAFF_RANGE[doc.options.scale];
  const staff =
    doc.staff.length > max ? doc.staff.slice(0, max) : [...doc.staff];
  while (staff.length < min) {
    const role = pickUnique(
      ["Apprentice", "Bookkeeper", "Security and muscle", "Trusted specialist"],
      1,
      rng,
    )[0];
    staff.push({
      id: `staff-${staff.length + 1}`,
      name: `${role} ${staff.length + 1}`,
      role,
      goal: "Stay on and learn the trade.",
      trait: "Keeps their head down and does the work.",
    });
  }
  return { ...doc, staff };
}

/**
 * Rebuilds only the sections that failed. Hooks are rebuilt last, and only when
 * they failed or one of the sections they name changed.
 */
export function repairBusiness(
  doc: BusinessDocument,
  issues: BusinessIssue[],
  rng: Rng = defaultRng,
): BusinessDocument {
  if (issues.length === 0) return doc;
  let next = doc;
  const failing = new Set<string>(issues.map((i) => i.section));
  const changed = new Set<string>();

  for (const section of REPAIR_ORDER) {
    if (!failing.has(section)) continue;
    next = localSectionFor(next, section, rng);
    changed.add(section);
  }

  if (issues.some((i) => i.code === "staff-count")) {
    next = fitStaffToScale(next, rng);
    changed.add("staff");
  }

  for (const issue of issues) {
    if (issue.section.startsWith("staff:") && issue.code === "missing") {
      next = localSectionFor(next, issue.section, rng);
      changed.add("staff");
    }
  }

  const hooksFailed =
    failing.has("hooks") || issues.some((i) => i.code === "hook-unanchored");
  const anchorChanged = [...changed].some(
    (c) => ANCHOR_SECTIONS.has(c) || c === "staff",
  );
  if (hooksFailed || anchorChanged) {
    next = localSectionFor(next, "hooks", rng);
  }

  return next;
}

export { businessSectionLabel };
