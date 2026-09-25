import type { Diagnostic, DieSpec, RandomSource } from "./types";
import { findBraceProblems, parseReferences } from "./resolver";
import {
  dieFormula,
  dieRange,
  isBoundedDieSpec,
  MAX_TABLE_DIE_COUNT,
  MAX_TABLE_DIE_RANGE,
} from "./dice-notation";

/**
 * Source validation.
 *
 * Only a duplicate name blocks a save (FR-003a) — references bind by name, so
 * two sources sharing one would make resolution non-deterministic. Everything
 * else is a warning: FR-006 requires coverage problems to be *reported* without
 * blocking, because a half-finished table is a normal thing to save mid-edit.
 */
export function validateSource(
  source: RandomSource,
  existingNames: string[],
  knownSourceNames: string[] = [],
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const name = source.name.trim().toLowerCase();

  if (existingNames.some((n) => n.trim().toLowerCase() === name)) {
    diagnostics.push({
      severity: "error",
      code: "duplicate-name",
      message: `Another table or deck is already called "${source.name}". Names must be unique so references know which one you mean.`,
    });
  }

  const entries = source.entries ?? [];
  const cards = source.cards ?? [];
  if (entries.length === 0 && cards.length === 0) {
    diagnostics.push({
      severity: "warning",
      code: "empty-source",
      message:
        source.kind === "table"
          ? "This table has no entries yet, so there is nothing to roll."
          : "This deck has no cards yet, so there is nothing to draw.",
    });
  }

  // Coverage checks are meaningful only for ranged tables; weighted tables
  // cannot have gaps or overlaps by construction.
  if (source.selection?.mode === "ranged") {
    const die = source.selection.die;
    const { keepHighest, keepLowest } = die;
    const count = die.count ?? 1;

    const { min: low, max: high } = dieRange(die);
    if (!isBoundedDieSpec(die)) {
      diagnostics.push({
        severity: "warning",
        code: "invalid-die",
        message: `This die must use a whole-number range of at most ${MAX_TABLE_DIE_RANGE} possible results and roll no more than ${MAX_TABLE_DIE_COUNT} dice.`,
      });
    } else {
      if (keepHighest !== undefined && keepLowest !== undefined) {
        diagnostics.push({
          severity: "warning",
          code: "invalid-die",
          message:
            "This die keeps both the highest and the lowest dice, which is not possible. Keeping the highest wins.",
        });
      }
      const kept = keepHighest ?? keepLowest;
      if (kept !== undefined && kept > count) {
        diagnostics.push({
          severity: "warning",
          code: "invalid-die",
          message: `This die keeps ${kept} dice but only rolls ${count}, so the extra keep does nothing.`,
        });
      }

      const dieLabel = describeDie(die);
      const covered = new Map<number, number>();

      for (const entry of entries) {
        if (!entry.range) continue;
        const { min, max } = entry.range;
        if (min > high || max > high || min < low) {
          diagnostics.push({
            severity: "warning",
            code: "unreachable-entry",
            message: `"${truncate(entry.text)}" covers ${min}-${max}, which is outside a ${dieLabel} roll, so it can never come up.`,
            entryId: entry.id,
          });
          continue;
        }
        for (let v = min; v <= max; v++) {
          covered.set(v, (covered.get(v) ?? 0) + 1);
        }
      }

      const gaps: number[] = [];
      const overlaps: number[] = [];
      for (let v = low; v <= high; v++) {
        const count = covered.get(v) ?? 0;
        if (count === 0) gaps.push(v);
        if (count > 1) overlaps.push(v);
      }

      if (gaps.length > 0) {
        diagnostics.push({
          severity: "warning",
          code: "range-gap",
          message: `Nothing happens on ${describeValues(gaps)}. Those rolls have no result.`,
        });
      }
      if (overlaps.length > 0) {
        diagnostics.push({
          severity: "warning",
          code: "range-overlap",
          message: `More than one entry claims ${describeValues(overlaps)}. The first match wins.`,
        });
      }
    }
  }

  const texts = [
    ...entries.map((e) => ({ id: e.id, text: e.text })),
    ...cards.map((c) => ({
      id: c.id,
      text: `${c.body} ${c.reversedMeaning ?? ""}`,
    })),
  ];

  // Brace syntax that looks like a reference but will roll as literal text.
  for (const { id, text } of texts) {
    for (const problem of findBraceProblems(text)) {
      diagnostics.push({
        severity: "warning",
        code: "malformed-reference",
        message:
          problem.kind === "unclosed"
            ? "A { has no closing }, so that part will read as plain text."
            : "Empty braces name no table, so they will read as plain text.",
        entryId: id,
      });
    }
  }

  // Reference health, when the caller supplies the vault's source names.
  if (knownSourceNames.length > 0) {
    const known = new Set(knownSourceNames.map((n) => n.trim().toLowerCase()));
    for (const { id, text } of texts) {
      for (const ref of parseReferences(text)) {
        if (!known.has(ref.name.trim().toLowerCase())) {
          diagnostics.push({
            severity: "warning",
            code: "broken-reference",
            message: `${ref.raw} does not match any table or deck. It will show as unresolved when rolled.`,
            entryId: id,
          });
        }
      }
    }
  }

  return diagnostics;
}

function truncate(text: string, max = 40): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** Plain-language name for a die, e.g. "d10" or "4d6kh3+2". */
function describeDie(die: DieSpec): string {
  return dieFormula(die);
}

/** Renders a value list compactly: "3, 7-9" rather than "3, 7, 8, 9". */
function describeValues(values: number[]): string {
  const parts: string[] = [];
  let start = values[0];
  let prev = values[0];
  for (let i = 1; i <= values.length; i++) {
    const v = values[i];
    if (v !== prev + 1) {
      parts.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = v;
    }
    prev = v;
  }
  return parts.join(", ");
}
