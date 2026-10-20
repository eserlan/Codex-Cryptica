import { extractProperNouns } from "./campaign-context";
import {
  checkGenreFidelity,
  checkParagraphRedundancy,
  checkSentenceRepetition,
  checkUnitContradictions,
  type ResolvedTome,
} from "./public-tome";
import {
  addBannedNameFindings,
  type DraftCheck,
  type JsonObject,
} from "./staged-runtime";

export { addBannedNameFindings };

function allStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(allStrings);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(allStrings);
  }
  return [];
}

function checkWordCoverage(source: string, targetText: string): boolean {
  const words = source
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 4);
  if (words.length < 3) return true;
  const matched = words.filter((w) => targetText.includes(w)).length;
  return matched / words.length >= 0.3;
}

function checkProvenanceRequiredFields(
  draft: JsonObject,
  hard: string[],
): void {
  const required = [
    { key: "title", label: "field: title" },
    { key: "summary", label: "field: summary" },
    { key: "physicalDescription", label: "section: physicalDescription" },
    { key: "provenance", label: "section: provenance" },
  ];
  for (const item of required) {
    const val = draft[item.key];
    if (!val || typeof val !== "string" || !val.trim()) {
      hard.push(`Missing or empty required ${item.label}`);
    }
  }
}

function checkCanonicalFacts(
  draft: JsonObject,
  hard: string[],
): Record<string, unknown> | undefined {
  const facts = draft.canonicalFacts as Record<string, unknown> | undefined;
  if (!facts || typeof facts !== "object") {
    hard.push("Missing required object: canonicalFacts");
    return undefined;
  }
  const requiredFactKeys = [
    "centralRule",
    "productionMethod",
    "errorSource",
    "bookClaim",
    "deception",
    "objectiveTruth",
    "actionableClue",
  ];
  for (const key of requiredFactKeys) {
    if (typeof facts[key] !== "string" || !(facts[key] as string).trim()) {
      hard.push(`canonicalFacts is missing or has empty field: ${key}`);
    }
  }
  return facts;
}

// fallow-ignore-next-line complexity
function checkGroundTruthElements(draft: JsonObject, hard: string[]): void {
  const gt = draft.groundTruth;
  if (!gt) {
    hard.push("Missing required field or section: groundTruth");
    return;
  }
  if (typeof gt === "object") {
    const r = gt as Record<string, unknown>;
    if (!r.bookClaims && !r.claims && !r["What the Book Claims"]) {
      hard.push("groundTruth missing claim element");
    }
    if (!r.deception && !r.flaw && !r["The Deception / Flaw"]) {
      hard.push("groundTruth missing deception element");
    }
    if (!r.objectiveTruth && !r.truth && !r["The Objective Truth"]) {
      hard.push("groundTruth missing objective truth element");
    }
    if (!r.actionableClue && !r.clue && !r["Actionable Clue"]) {
      hard.push("groundTruth missing actionable clue element");
    }
  } else if (typeof gt === "string") {
    if (!/book claims|claims/i.test(gt)) {
      hard.push("groundTruth missing claim element");
    }
    if (!/deception|flaw/i.test(gt)) {
      hard.push("groundTruth missing deception element");
    }
    if (!/objective truth|reality/i.test(gt)) {
      hard.push("groundTruth missing objective truth element");
    }
    if (!/actionable clue|clue/i.test(gt)) {
      hard.push("groundTruth missing actionable clue element");
    }
  }
}

// fallow-ignore-next-line complexity
function checkProvenanceConsistency(
  draft: JsonObject,
  resolved: ResolvedTome,
  facts: Record<string, unknown> | undefined,
  avoidNames: string[],
  hard: string[],
  soft: string[],
): void {
  const combinedPhysical =
    `${resolved.exactDamage}\n${draft.physicalDescription || ""}\n${draft.provenance || ""}`.toLowerCase();
  const unitIssues: string[] = [];
  checkUnitContradictions(combinedPhysical, unitIssues);
  for (const issue of unitIssues) {
    hard.push(issue);
  }

  addBannedNameFindings([String(draft.title || "")], avoidNames, hard);
  if (avoidNames.length > 0) {
    const textToCheck = `${draft.title || ""} ${draft.summary || ""}`;
    addBannedNameFindings(extractProperNouns(textToCheck), avoidNames, hard);
  }

  const combinedText = `${draft.title || ""} ${draft.summary || ""} ${draft.physicalDescription || ""} ${draft.provenance || ""}`;
  const genreIssues: string[] = [];
  checkGenreFidelity(combinedText, resolved.genre, genreIssues);
  for (const issue of genreIssues) {
    soft.push(issue);
  }

  if (
    facts &&
    typeof facts.errorSource === "string" &&
    facts.errorSource.trim()
  ) {
    const errorSource = facts.errorSource.trim();
    const provenance = String(draft.provenance || "");
    const properNouns = extractProperNouns(errorSource);
    if (properNouns.length > 0) {
      const anyPresent = properNouns.some((pn) =>
        provenance.toLowerCase().includes(pn.toLowerCase()),
      );
      if (!anyPresent) {
        soft.push(
          `errorSource names a figure ("${properNouns.join(", ")}") absent from Provenance & Transmission`,
        );
      }
    }
  }
}

// fallow-ignore-next-line complexity
export function checkTomeProvenanceStage(
  draft: JsonObject,
  resolved: ResolvedTome,
  avoidNames: string[] = [],
): DraftCheck {
  const hard: string[] = [];
  const soft: string[] = [];

  checkProvenanceRequiredFields(draft, hard);
  const facts = checkCanonicalFacts(draft, hard);
  checkGroundTruthElements(draft, hard);
  checkProvenanceConsistency(draft, resolved, facts, avoidNames, hard, soft);

  return { hard, soft };
}

// fallow-ignore-next-line complexity
function checkQuickChecksElements(quickChecks: unknown, hard: string[]): void {
  if (!quickChecks) {
    hard.push("Missing or empty required section: quickChecks");
  } else if (typeof quickChecks === "object") {
    const qc = quickChecks as Record<string, unknown>;
    const hasFailure = Boolean(
      qc.failureCondition || qc.failure || qc["The Failure Condition"],
    );
    const hasDeciphering = Boolean(
      qc.deciphering || qc.decipher || qc.translation || qc["Deciphering"],
    );
    if (!hasFailure) {
      hard.push("Quick Checks & Mechanics is missing a failure condition");
    }
    if (!hasDeciphering) {
      hard.push("Quick Checks & Mechanics is missing a deciphering rule");
    }
  } else if (typeof quickChecks === "string") {
    if (!/failure|consequence|backfire|flaw/i.test(quickChecks)) {
      hard.push("Quick Checks & Mechanics is missing a failure condition");
    }
    if (!/decipher|translation|reading|language/i.test(quickChecks)) {
      hard.push("Quick Checks & Mechanics is missing a deciphering rule");
    }
  }
}

function checkRevelationsEchoes(
  stage1: JsonObject,
  stage2Text: string,
  soft: string[],
): void {
  const facts = (stage1.canonicalFacts as Record<string, unknown>) ?? {};
  const centralRule =
    typeof facts.centralRule === "string" ? facts.centralRule : "";
  const objectiveTruth =
    typeof facts.objectiveTruth === "string" ? facts.objectiveTruth : "";

  if (centralRule.length > 10 && !checkWordCoverage(centralRule, stage2Text)) {
    soft.push(
      "Stage 1 centralRule is not reflected in Contents or Quick Checks",
    );
  }

  if (
    objectiveTruth.length > 10 &&
    !checkWordCoverage(objectiveTruth, stage2Text)
  ) {
    soft.push(
      "Stage 1 objectiveTruth is not reflected in Contents or Quick Checks",
    );
  }
}

// fallow-ignore-next-line complexity
export function checkTomeRevelationsStage(
  draft: JsonObject,
  stage1: JsonObject,
  resolved: ResolvedTome,
  avoidNames: string[] = [],
): DraftCheck {
  const hard: string[] = [];
  const soft: string[] = [];

  const contents =
    typeof draft.contents === "string" ? draft.contents.trim() : "";
  if (!contents) {
    hard.push("Missing or empty required section: contents");
  }

  const risks = typeof draft.risks === "string" ? draft.risks.trim() : "";
  if (!risks) {
    hard.push("Missing or empty required section: risks");
  }

  checkQuickChecksElements(draft.quickChecks, hard);

  const hasExcerpt =
    /(?:^|\n)\s*>\s+\S+/m.test(contents) ||
    /["“][^"”]{15,}["”]/.test(contents) ||
    /(?:###?\s*|\*\*|:\s*|translated\s+)(?:excerpt|passage|translation)\b/i.test(
      contents,
    );
  if (contents && !hasExcerpt) {
    hard.push(
      "Contents & Revelations is missing a translated excerpt or notable passage",
    );
  }

  if (avoidNames.length > 0) {
    const textToCheck = `${contents} ${risks}`;
    addBannedNameFindings(extractProperNouns(textToCheck), avoidNames, hard);
  }

  const stage2Text =
    `${contents}\n${risks}\n${allStrings(draft.quickChecks).join("\n")}`.toLowerCase();
  checkRevelationsEchoes(stage1, stage2Text, soft);

  const stage1Text = `${stage1.physicalDescription || ""}\n\n${stage1.provenance || ""}`;
  const redundancyIssues: string[] = [];
  checkParagraphRedundancy(
    `${contents}\n\n${risks}`,
    stage1Text,
    redundancyIssues,
  );
  for (const issue of redundancyIssues) {
    soft.push(issue);
  }

  return { hard, soft };
}

export function countAdventureHooks(hooksRaw: unknown): number {
  if (Array.isArray(hooksRaw)) return hooksRaw.length;
  if (typeof hooksRaw === "string") {
    const matches = hooksRaw.match(
      /(?:^|\n)\s*(?:[1-9]\.|\*\*[1-9]\*\*|-|\*)\s+\S+/g,
    );
    return matches ? matches.length : 0;
  }
  return 0;
}

// fallow-ignore-next-line complexity
export function checkTomeHooksStage(
  draft: JsonObject,
  stage1: JsonObject,
  _stage2: JsonObject,
  resolved: ResolvedTome,
  avoidNames: string[] = [],
): DraftCheck {
  const hard: string[] = [];
  const soft: string[] = [];

  const hookCount = countAdventureHooks(draft.adventureHooks);
  if (hookCount < 3) {
    hard.push(`Fewer than 3 adventure hooks found (${hookCount})`);
  }

  const hooksText = allStrings(draft.adventureHooks).join("\n\n");
  const combinedHooksPhysical =
    `${resolved.exactDamage}\n${hooksText}`.toLowerCase();
  const unitIssues: string[] = [];
  checkUnitContradictions(combinedHooksPhysical, unitIssues);
  for (const issue of unitIssues) {
    hard.push(issue);
  }

  const facts = (stage1.canonicalFacts as Record<string, unknown>) ?? {};
  const canonicalValues = Object.values(facts).filter(
    (v): v is string => typeof v === "string" && v.length > 5,
  );
  for (const fact of canonicalValues) {
    const factWords = fact
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4);
    if (factWords.length >= 2) {
      const factSubject = factWords[0];
      if (
        hooksText.toLowerCase().includes(factSubject) &&
        !checkWordCoverage(fact, hooksText)
      ) {
        hard.push(
          `Adventure hooks contradict or corrupt canonical fact: "${fact}"`,
        );
      }
    }
  }

  if (avoidNames.length > 0) {
    addBannedNameFindings(extractProperNouns(hooksText), avoidNames, hard);
  }

  const repIssues: string[] = [];
  checkSentenceRepetition(hooksText, repIssues);
  for (const issue of repIssues) {
    soft.push(issue);
  }

  return { hard, soft };
}
