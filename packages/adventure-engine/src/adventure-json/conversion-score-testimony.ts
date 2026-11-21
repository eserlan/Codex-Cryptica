import type { ConversionAnswerKey } from "./conversion-answer-key";
import {
  fail,
  type ConversionScoreDimensionResult,
} from "./conversion-score-result";
import type { DocLike } from "./conversion-score-document";
import { textFoundIn } from "./conversion-score-text";
import { notApplicable } from "./conversion-score-result";

export function scoreAuthoredVsRumour(
  value: DocLike,
  key: ConversionAnswerKey,
): ConversionScoreDimensionResult {
  const testimonies = key.testimonies ?? [];
  if (testimonies.length === 0) return notApplicable();
  const details: string[] = [];
  const rumours = (value.rumours ?? []) as Array<{
    text?: string;
    truth?: string;
  }>;
  const docSecrets = (value.secrets ?? []) as Array<{ text?: string }>;
  for (const t of testimonies) {
    const found = rumours.some(
      (r) =>
        typeof r.text === "string" &&
        r.truth === t.truth &&
        textFoundIn(t.claim, r.text),
    );
    if (!found) details.push(`missing testimony ${t.id}`);
    const inSecret = docSecrets.some(
      (s) => typeof s.text === "string" && textFoundIn(t.claim, s.text),
    );
    if (inSecret) details.push(`testimony ${t.id} found in secret`);
  }
  return fail(details);
}
