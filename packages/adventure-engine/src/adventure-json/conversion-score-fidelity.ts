import type {
  ActionableDetail,
  ConversionAnswerKey,
} from "./conversion-answer-key";
import {
  citesSection,
  ENTITY_COLLECTIONS,
  recordStrings,
  type DocLike,
  type Entity,
} from "./conversion-score-document";
import {
  fail,
  notApplicable,
  type ConversionScoreDimensionResult,
} from "./conversion-score-result";
import { textFoundIn } from "./conversion-score-text";

function recordHasText(rec: Entity, detail: string): boolean {
  let found = false;
  recordStrings("", rec, (_field, value) => {
    if (typeof value === "string" && textFoundIn(detail, value)) found = true;
  });
  return found;
}

function detailFindings(
  records: Entity[],
  key: ConversionAnswerKey,
  detail: ActionableDetail,
): string[] {
  const section = key.sections.find((s) => s.sourceId === detail.sourceId);
  if (!section) return [];
  const citing = records.filter((record) => citesSection(record, section));
  if (citing.some((record) => recordHasText(record, detail.detail))) return [];
  const cited =
    citing.length > 0
      ? `cited by: ${citing.map((record) => record.id).join(", ")}`
      : "no record cites this section";
  return [
    `missing ${detail.category} detail in ${section.sourceId} "${section.title}" (${cited}): ${detail.detail}`,
  ];
}

/**
 * Each key detail must appear in at least one string field of a record that
 * cites its section. `unresolved` records never count, so a note that a detail
 * was dropped cannot hide the omission.
 */
export function scoreFidelity(
  value: DocLike,
  key: ConversionAnswerKey,
): ConversionScoreDimensionResult {
  const details = key.actionableDetails ?? [];
  if (details.length === 0) return notApplicable();
  const records = ENTITY_COLLECTIONS.filter(
    (name) => name !== "unresolved",
  ).flatMap((name) => value[name] ?? []);
  return fail(
    details.flatMap((detail) => detailFindings(records, key, detail)),
  );
}
