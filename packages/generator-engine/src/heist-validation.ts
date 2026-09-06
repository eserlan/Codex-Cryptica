/**
 * Deterministic validation for generated heists (#2768).
 *
 * A single generation pass has to invent an interesting heist *and* police its
 * own logic, and those goals compete. This module is the first half of the
 * split: everything that can be checked by reading the document — duplicate or
 * empty sections, missing fields, wrong terminology for the heist type, banned
 * names, system mechanics in neutral output — is checked here, for free,
 * before the semantic review call.
 *
 * What is left over is genuinely semantic ("she wants to escape, so why does
 * she broadcast the theft?") and is what the unconditional repair pass fixes.
 * Passing these checks does not establish semantic consistency.
 *
 * Pure and framework-free: the same rulebook backs the runtime pipeline and
 * `scripts/heist-eval.ts`, so the sweep tool and the generator can never drift
 * apart on what "correct" means.
 */

import { heistConfig, HEIST_WORD_BUDGET } from "./public-heist";
import { BANNED_NAMES } from "./public-npc";

export interface HeistDraftFields {
  heistType: string;
  content: string;
  lore: string;
  /** Optional: enables the era-appropriate-titles check. */
  genre?: string;
}

export interface HeistFinding {
  /** Stable machine-readable rule id. */
  kind: string;
  /** One sentence the repair pass can act on directly. */
  message: string;
  /**
   * `structural` problems are contract breaks a reader would notice, and are
   * used to reject structurally worse repairs. `advisory` findings guide the
   * review without overriding a structural improvement — measured:
   * every repair triggered by length alone came back the same length, because
   * trimming is exactly the edit a "change as little as possible" instruction
   * discourages.
   */
  severity: "structural" | "advisory";
}

export interface HeistSection {
  heading: string;
  body: string;
}

export function splitHeistSections(markdown: string): HeistSection[] {
  const sections: HeistSection[] = [];
  let current: HeistSection | null = null;
  for (const line of (markdown || "").split("\n")) {
    const match = line.match(/^#{2,4}\s+(.+?)\s*$/);
    if (match) {
      if (current) sections.push(current);
      current = { heading: match[1].trim(), body: "" };
    } else if (current) {
      current.body += `${line}\n`;
    }
  }
  if (current) sections.push(current);
  return sections;
}

/** Lore sections every heist must carry, whatever its type. */
export const REQUIRED_LORE_SECTIONS = [
  "GM Quick Reference",
  "The Hidden Factor",
  "Security Rings",
  "Alarm Track",
  "Complications",
  "The Getaway",
  "Flashback Opportunities",
] as const;

/** Mechanics belonging to one game system, which System-neutral output bans. */
const SYSTEM_MECHANICS =
  /\b(saving throw|hit points?|\bDC\s?\d|advantage|disadvantage|\bd20\b|per round|one round)\b/i;

/** Wording that assumes the objective is an object being removed. */
const REMOVAL_WORDING = /\bthe prize\b|\bprize's\b|absence of/i;

/**
 * Corporate and industrial job titles, which read as anachronisms in a
 * pre-industrial setting — a Classic Fantasy vault does not employ a "Chief
 * Operator". Only checked for the genres where they cannot be right; the same
 * words are perfectly correct in Cyberpunk, Sci-Fi or Lancer.
 */
const MODERN_TITLES =
  /\b(chief operator|operator|manager|director|supervisor|technician|coordinator|executive|administrator)\b/i;
const PRE_INDUSTRIAL_GENRES = new Set([
  "Classic Fantasy",
  "Pirate",
  "Vampire / Gothic Noir",
]);

export { HEIST_WORD_BUDGET };

export function heistWordCount(draft: HeistDraftFields): number {
  return `${draft.content}\n${draft.lore}`.trim().split(/\s+/).filter(Boolean)
    .length;
}

/** Whether structural repairs are needed; semantic review runs regardless. */
export function needsRepair(findings: readonly HeistFinding[]): boolean {
  return findings.some((f) => f.severity === "structural");
}

/**
 * Check a generated heist against everything decidable without a model.
 * Returns one finding per broken rule, phrased as an instruction so the repair
 * prompt can pass them through verbatim.
 */
export function validateHeist(draft: HeistDraftFields): HeistFinding[] {
  const findings: HeistFinding[] = [];
  const add = (
    kind: string,
    message: string,
    severity: HeistFinding["severity"] = "structural",
  ) => findings.push({ kind, message, severity });

  const objective = heistConfig.objectives[draft.heistType];
  const contentSections = splitHeistSections(draft.content);
  const loreSections = splitHeistSections(draft.lore);
  const sections = [...contentSections, ...loreSections];
  const headings = sections.map((s) => s.heading);
  const whole = `${draft.content}\n${draft.lore}`;

  for (const heading of new Set(
    headings.filter((h, i) => headings.indexOf(h) !== i),
  )) {
    add(
      "duplicate-section",
      `"${heading}" appears more than once. Keep the better version and delete the other.`,
    );
  }

  for (const section of sections) {
    if (!section.body.trim()) {
      add(
        "empty-section",
        `"${section.heading}" has a heading but nothing under it. Write it, or remove the heading.`,
      );
    }
  }

  for (const required of [
    "The Score",
    "Casing the Target",
    ...REQUIRED_LORE_SECTIONS,
  ]) {
    if (!headings.includes(required)) {
      add("missing-section", `"${required}" is missing entirely. Add it.`);
    }
  }

  if (objective) {
    if (!headings.includes(objective.heading)) {
      add(
        "objective-heading",
        `A ${draft.heistType} job's objective section must be headed "${objective.heading}".`,
      );
    }
    if (!headings.includes(objective.momentHeading)) {
      add(
        "moment-heading",
        `The point-of-no-return section must be headed "${objective.momentHeading}" for a ${draft.heistType} job.`,
      );
    }
    if (
      draft.heistType !== "Theft" &&
      headings.includes("When the Prize Is Taken")
    ) {
      add(
        "theft-terminology",
        `A ${draft.heistType} job has no "prize taken" moment — that heading belongs to a Theft. Rename it to "${objective.momentHeading}" and rewrite the section around ${objective.completion}.`,
      );
    }
  }

  for (let level = 0; level <= 4; level += 1) {
    if (!whole.includes(`${level} —`)) {
      add(
        "alarm-level",
        `Alarm level ${level} is missing. All five levels must be present and each must escalate over the one before.`,
      );
    }
  }

  const defaults = (whole.match(/\(default\)/g) ?? []).length;
  if (defaults !== 1) {
    add(
      "default-marker",
      `Exactly one complication must be marked "(default)" — found ${defaults}.`,
    );
  }

  const flashbacks = sections.find(
    (s) => s.heading === "Flashback Opportunities",
  );
  if (flashbacks) {
    const count = (flashbacks.body.match(/^\s*-\s/gm) ?? []).length;
    if (count < 4 || count > 6) {
      add(
        "flashback-count",
        `"Flashback Opportunities" must list four to six entries — found ${count}.`,
      );
    }
  }

  if (SYSTEM_MECHANICS.test(whole)) {
    add(
      "system-mechanics",
      `No rules system was selected, so "${whole.match(SYSTEM_MECHANICS)?.[0]}" must be rewritten as a fictional consequence.`,
    );
  }

  if (draft.heistType !== "Theft" && REMOVAL_WORDING.test(whole)) {
    add(
      "removal-wording",
      `"${whole.match(REMOVAL_WORDING)?.[0]}" assumes something is being stolen, which a ${draft.heistType} job does not do. Use the objective's own terms.`,
    );
  }

  // The catch has to suit what the objective actually is: "carrying it costs
  // the bearer" is nonsense for an assassination target.
  const kind = heistConfig.catchKindByType[draft.heistType] ?? "object";
  const catchLine = (draft.content.split("**The catch**: ")[1] ?? "")
    .split("\n")[0]
    .trim();
  if (catchLine) {
    const labelled = Object.entries(heistConfig.catchesByKind).flatMap(
      ([poolKind, pool]) =>
        pool
          .map((entry) => entry.split(" — ")[0])
          .filter((label) => new RegExp(`^${label}\\b`, "i").test(catchLine))
          .map((label) => ({ poolKind, label })),
    );
    if (labelled.length && !labelled.some((m) => m.poolKind === kind)) {
      add(
        "catch-kind",
        `The catch "${labelled[0].label}" does not fit a ${draft.heistType} objective. Replace it with a complication that suits what the crew is actually doing.`,
      );
    }
  }

  // Some banned placeholder names are also ordinary words ("Cross", "Stone",
  // "Ash"). Only treat those as names in name-like contexts, or sentence-open
  // verbs such as "Cross the yard" become structural failures.
  const ambiguousNames = new Set(["Cross", "Vale", "Stone", "Grey", "Ash"]);
  for (const name of BANNED_NAMES) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const usedAsName = ambiguousNames.has(name)
      ? new RegExp(
          `(?:\\b(?:named|called|Captain|Keeper|Guard|Officer|Master|Mistress)\\s+${escaped}\\b|\\b${escaped}(?:'s|’s)\\b)`,
        ).test(whole)
      : new RegExp(`\\b${escaped}\\b`).test(whole);
    if (usedAsName) {
      add(
        "banned-name",
        `"${name}" is a banned placeholder name. Rename that entity everywhere it appears.`,
      );
      break;
    }
  }

  const seen = new Map<string, string>();
  for (const section of sections) {
    for (const sentence of section.body
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 45)) {
      const key = sentence.toLowerCase().replace(/[^a-z ]/g, "");
      const previous = seen.get(key);
      if (previous && previous !== section.heading) {
        add(
          "verbatim-repeat",
          `The same sentence appears under both "${previous}" and "${section.heading}". Keep it where it belongs and cut the other.`,
        );
      } else {
        seen.set(key, section.heading);
      }
    }
  }

  if (draft.genre && PRE_INDUSTRIAL_GENRES.has(draft.genre)) {
    const match = whole.match(MODERN_TITLES);
    if (match) {
      add(
        "anachronistic-title",
        `"${match[0]}" is a modern job title and does not belong in a ${draft.genre} setting. Use a rank or office that suits the era.`,
      );
    }
  }

  const words = heistWordCount(draft);
  if (words > HEIST_WORD_BUDGET) {
    add(
      "over-budget",
      `The result runs to ${words} words against a budget of ${HEIST_WORD_BUDGET}. Cut sentences that do not create a decision or change how the heist plays.`,
      "advisory",
    );
  }

  return findings;
}
