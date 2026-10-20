/**
 * Business / Enterprise Generator (#3627, spec 180) — deterministic checks
 * (FR-007) and repair. Every local document passes; AI output is checked and,
 * where needed, the failing sections are rebuilt from the tables.
 */

import type { Rng } from "./random-utils";
import { defaultRng, pickFrom } from "./random-utils";
import {
  CRIMINAL_WORDS,
  GENERIC_POOLS,
  PRICE_PATTERN,
} from "./business-tables";
import {
  BUSINESS_LABEL_FOR_KIND,
  BUSINESS_STAFF_RANGE,
  localSectionFor,
  pickUnique,
} from "./business-local";
import {
  BUSINESS_ALLOWED_LABELS,
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
  | "management-mismatch"
  | "relationship-label"
  | "size-staff";

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
    ...missing("operations", "How it earns", doc.operations.model),
    ...missing("operations", "Size", doc.operations.size),
    ...missing("operations", "Current position", doc.operations.position),
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
      section: `staff:${doc.staff[0]?.id ?? "staff-1"}`,
      code: "staff-count",
      detail: `${count} staff does not fit a ${doc.options.scale} business (${min} to ${max}).`,
    },
  ];
}

/** "A handful of regular staff": a claim that the business has a workforce. */
const CLAIMS_STAFF =
  /\b(handful|small|permanent|regular|loyal|core|dependable|several|two|three|few|many)\b[^.]*\b(staff|crews?|workers|employees|hands|apprentices|clerks)\b/i;
/** "No regular staff", "just the owner": a claim that the owner works alone. */
const CLAIMS_NO_STAFF =
  /\b(no (regular |permanent |hired |full-time )?(staff|employees|workers|crew)|without (any )?(regular |permanent )?(staff|employees)|sole (proprietor|trader|operator)|just the owner|owner alone|one-person|one person)\b/i;

/**
 * The size line must agree with the staff roster. A business with no key staff
 * must not claim a regular workforce, and one with staff must not claim to have
 * none. Casual labour and part-timers are fine either way.
 */
export function sizeStaffProblem(
  size: string,
  staffCount: number,
): string | null {
  if (
    staffCount === 0 &&
    CLAIMS_STAFF.test(size) &&
    !CLAIMS_NO_STAFF.test(size)
  )
    return `The size says "${size}" but no key staff are listed. List the staff, or say the owner works with casual labour.`;
  if (staffCount > 0 && CLAIMS_NO_STAFF.test(size))
    return `The size says "${size}" but ${staffCount} key staff are listed. Say the business has regular staff.`;
  return null;
}

function checkSizeStaff(doc: BusinessDocument): BusinessIssue[] {
  const detail = sizeStaffProblem(doc.operations.size, doc.staff.length);
  return detail
    ? [{ section: "operations", code: "size-staff" as const, detail }]
    : [];
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

/** A graph label must honestly describe its kind of party (FR-011). */
function checkRelationshipLabels(doc: BusinessDocument): BusinessIssue[] {
  return doc.relationships
    .filter((r) => !BUSINESS_ALLOWED_LABELS[r.kind].includes(r.label))
    .map((r) => ({
      section: "relationships" as const,
      code: "relationship-label" as const,
      detail: `"${r.label}" does not describe a ${r.kind} (${r.name}); use ${BUSINESS_ALLOWED_LABELS[r.kind].join(" or ")}.`,
    }));
}

/** Every failing check, across the whole document. Empty when the document is usable. */
export function checkBusiness(doc: BusinessDocument): BusinessIssue[] {
  return [
    ...checkRelationshipLabels(doc),
    ...checkRequiredFields(doc),
    ...checkStaffCount(doc),
    ...checkSizeStaff(doc),
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

/** Fixes the issues that touch one line: a relationship label and the size line. */
function fixSingleLines(
  doc: BusinessDocument,
  issues: BusinessIssue[],
  rng: Rng,
): { fixed: BusinessDocument; rest: BusinessIssue[] } {
  let fixed = doc;
  if (issues.some((i) => i.code === "relationship-label")) {
    fixed = {
      ...fixed,
      relationships: fixed.relationships.map((r) =>
        BUSINESS_ALLOWED_LABELS[r.kind].includes(r.label)
          ? r
          : { ...r, label: BUSINESS_LABEL_FOR_KIND[r.kind] },
      ),
    };
  }
  if (issues.some((i) => i.code === "size-staff")) {
    fixed = {
      ...fixed,
      operations: {
        ...fixed.operations,
        size: pickFrom(GENERIC_POOLS.sizeTemplates[fixed.options.scale], rng),
      },
    };
  }
  const rest = issues.filter(
    (i) => i.code !== "relationship-label" && i.code !== "size-staff",
  );
  return { fixed, rest };
}

/**
 * Rebuilds only the sections that failed. Hooks are rebuilt last, and only when
 * they failed or one of the sections they name changed.
 */
export function repairBusiness(
  doc: BusinessDocument,
  allIssues: BusinessIssue[],
  rng: Rng = defaultRng,
): BusinessDocument {
  if (allIssues.length === 0) return doc;
  // A wrong label or size line needs only that line fixed, not the section rebuilt.
  const { fixed: next0, rest: issues } = fixSingleLines(doc, allIssues, rng);
  if (issues.length === 0) return next0;
  let next = next0;
  // A staff-count issue is fixed by fitting the roster, never by rebuilding a section.
  const failing = new Set<string>(
    issues.filter((i) => i.code !== "staff-count").map((i) => i.section),
  );
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

// --- Names that appear without being introduced -----------------------------

/** Words that start a sentence, or an instruction, without being part of a name. */
const SENTENCE_STARTERS = new Set(
  (
    "The A An If When Without Because Before After While Unless Although But And Or So Yet This That These Those " +
    "Its Their His Her Our Your One Two Three Every Each Some Any Many Most All Both Either Neither Once Then " +
    "There Here What Who Which How Why Where In On At By For From With Of To As Not No Nothing Someone Anyone " +
    "Everyone Find Warn Trace Recover Negotiate Discover Learn Persuade Convince Help Stop Prove Expose Protect " +
    "Steal Deliver Escort Investigate Retrieve Uncover Secure Broker Track Identify Rescue Confront Intercept " +
    "Bargain Win Take Make Get Keep Hunt Follow Break Save Raid Sabotage Infiltrate Audit Settle Whoever Whatever"
  ).split(" "),
);

const CAPITALISED = /^\p{Lu}[\p{L}'’-]*$/u;
/** "GM" or "NPC": an abbreviation, never a name. */
const ABBREVIATION = /^\p{Lu}{2,}$/u;

function words(text: string): string[] {
  return text
    .split(/[^\p{L}'’-]+/u)
    .map((w) => w.replace(/['’]s$/, ""))
    .filter((w) => w.length >= 2);
}

/** Every name the document has introduced, as written. */
function introducedNames(doc: BusinessDocument): string[] {
  return [
    doc.identity.name,
    doc.leadership.name,
    ...doc.staff.map((p) => p.name),
    ...doc.relationships.map((r) => r.name),
    ...doc.dependencies.map((d) => d.input),
    doc.options.location,
    doc.options.businessType,
    doc.options.genre,
  ];
}

interface KnownNames {
  words: ReadonlySet<string>;
  full: readonly string[];
}

function knownNames(doc: BusinessDocument): KnownNames {
  const names = introducedNames(doc);
  return {
    words: new Set(names.flatMap(words).map((w) => w.toLowerCase())),
    full: names.map((n) => words(n).join(" ").toLowerCase()),
  };
}

/**
 * A lone word is known when it is part of an introduced name. A longer run is
 * known only when it sits inside an introduced name, or extends one with a
 * title: "Corwin Venn" is not "Iska Venn" plus "Corwin Doran".
 */
function isKnownRun(run: readonly string[], known: KnownNames): boolean {
  if (run.length === 1) return known.words.has(run[0].toLowerCase());
  const joined = run.join(" ").toLowerCase();
  return known.full.some(
    (name) =>
      name.includes(joined) || (name.includes(" ") && joined.includes(name)),
  );
}

/** Prose that may name people or parties. */
function proseOf(doc: BusinessDocument): string[] {
  return [
    ...Object.values(doc.identity),
    ...Object.values(doc.operations),
    doc.leadership.goal,
    doc.leadership.trait,
    doc.leadership.pressure ?? "",
    ...doc.staff.flatMap((p) => [p.goal, p.trait]),
    ...Object.values(doc.clientele),
    ...doc.dependencies.map((d) => d.ifItFails),
    ...doc.relationships.map((r) => r.reason),
    ...Object.values(doc.reputation),
    doc.pressure,
    doc.asset,
    doc.secret,
    doc.opportunity,
    doc.complication,
    ...doc.hooks,
    ...(doc.management ? Object.values(doc.management).flat() : []),
  ].filter((t): t is string => typeof t === "string" && t.trim() !== "");
}

/**
 * Runs of capitalised words in one sentence. A lone capitalised word at the
 * start of a sentence is grammar, not a name, so it is dropped; a longer run
 * keeps its words except a leading sentence-starter such as "The" or "Find".
 */
function nameRuns(sentence: string): string[][] {
  const tokens = sentence
    .split(/\s+/)
    .map((t) => t.replace(/^[("“]+|[,;:.)"”!?]+$/g, ""));
  const runs: Array<{ words: string[]; atStart: boolean }> = [];
  let current: { words: string[]; atStart: boolean } | null = null;
  tokens.forEach((token, i) => {
    const bare = token.replace(/['’]s$/, "");
    if (CAPITALISED.test(bare) && !ABBREVIATION.test(bare)) {
      current ??= { words: [], atStart: i === 0 };
      current.words.push(bare);
    } else if (current) {
      runs.push(current);
      current = null;
    }
  });
  if (current) runs.push(current);
  return runs
    .filter((r) => !(r.atStart && r.words.length === 1))
    .map((r) =>
      r.words.filter((w, i) => !(i === 0 && SENTENCE_STARTERS.has(w))),
    )
    .filter((words) => words.length > 0);
}

/** Every run of capitalised words across the given prose, one sentence at a time. */
function allNameRuns(texts: readonly string[]): string[][] {
  return texts.flatMap((text) =>
    text.split(/(?<=[.!?])\s+/).flatMap((sentence) => nameRuns(sentence)),
  );
}

/** Names found in the given prose that the document has not introduced. */
function scanForNames(
  texts: readonly string[],
  known: KnownNames,
): { multis: Set<string>; singles: Map<string, number> } {
  const singles = new Map<string, number>();
  const multis = new Set<string>();
  const unknownRuns = allNameRuns(texts).filter(
    (run) => !isKnownRun(run, known),
  );
  for (const run of unknownRuns) {
    if (run.length >= 2) multis.add(run.join(" "));
    else singles.set(run[0], (singles.get(run[0]) ?? 0) + 1);
  }
  return { multis, singles };
}

/**
 * Names that appear in the text without being introduced as the business, a
 * person or a party. A multi-word name counts once; a single capitalised word
 * counts only when it recurs, so a stray sentence start is not a name. Pass
 * `texts` to judge only the prose one stage wrote.
 */
export function findUnintroducedNames(
  doc: BusinessDocument,
  texts: readonly string[] = proseOf(doc),
): string[] {
  const { multis, singles } = scanForNames(texts, knownNames(doc));
  const repeated = [...singles].filter(([, n]) => n >= 2).map(([w]) => w);
  return [...multis, ...repeated];
}

// --- Quality checks on AI text (soft: one retry, then accepted) --------------

/** Words too common in a description to show that a feature was developed. */
const COMMON_WORDS = new Set(
  "their there which where while about every other these those would could should shop's owner's business keeps makes under inside outside through around before after never always again still being might whose until since often rarely nobody anyone anything something everything nothing that this with from have been were they them than then when what will your into over only also some such each most more much many very just like ones main city shop town work part kind runs lets keep gets goes does done made make take back down away once even ever here both".split(
    " ",
  ),
);

/** Lower-cased words of four letters or more, cut to a five-letter stem. */
function stems(text: string): Set<string> {
  return new Set(
    words(text)
      .map((w) => w.toLowerCase())
      .filter((w) => w.length >= 4 && !COMMON_WORDS.has(w))
      .map((w) => w.slice(0, 5)),
  );
}

/**
 * The unusual asset must develop the business's distinctive feature rather than
 * invent an unrelated one. Judged by shared word stems, so it is a heuristic.
 */
export function distinctiveProblem(
  distinctive: string,
  asset: string,
): string | null {
  const wanted = stems(distinctive);
  if (wanted.size === 0) return null;
  const used = stems(asset);
  if ([...wanted].some((s) => used.has(s))) return null;
  return `The unusual asset does not develop the distinctive feature ("${distinctive}"). Build the asset on it (why it works, who made it, who knows), and add a second asset only as well.`;
}

/** Words that address the player characters, in any genre. */
const ADDRESSES_PLAYERS =
  /\b(the (player )?characters|the party(?! (at|of|in|for) )|the adventurers|the heroes|the players|the pcs?|the group|the team|the investigators|the runners|the crew|adventurers|outsiders|newcomers|strangers|travell?ers|mercenaries|freelancers|anyone (brave|willing|bold|desperate)|your (party|characters|group|crew)|you)\b|\bPCs?\b/i;

/** Every hook must offer something to the player characters. */
export function hookAudienceProblems(hooks: readonly string[]): string[] {
  const missing = hooks
    .map((h, i) => [h, i + 1] as const)
    .filter(([h]) => !ADDRESSES_PLAYERS.test(h))
    .map(([, n]) => n);
  return missing.length
    ? [
        `Hook${missing.length > 1 ? "s" : ""} ${missing.join(", ")} must be written for the player characters (the characters, the party, the crew): who approaches or hires them, what they must do, what stands in the way.`,
      ]
    : [];
}

const KIN_WORDS =
  /\b(sister|brother|sibling|cousin|related|family (of|to|with)|son|daughter|uncle|aunt|nephew|niece|father|mother|parent|married|wife|husband|spouse|kin|twin)\b/i;

/** Two people sharing a surname must be said to be related. */
export function sharedSurnameProblems(
  people: ReadonlyArray<{ name: string; goal: string; trait: string }>,
): string[] {
  const bySurname = new Map<string, typeof people>();
  for (const p of people) {
    const parts = words(p.name);
    if (parts.length < 2) continue;
    const surname = parts[parts.length - 1].toLowerCase();
    bySurname.set(surname, [...(bySurname.get(surname) ?? []), p]);
  }
  return [...bySurname.values()]
    .filter(
      (group) =>
        group.length > 1 &&
        !group.some((p) => KIN_WORDS.test(`${p.goal} ${p.trait}`)),
    )
    .map(
      (group) =>
        `${group.map((p) => p.name).join(" and ")} share a surname. Say in a trait that they are related, or give them different surnames.`,
    );
}
