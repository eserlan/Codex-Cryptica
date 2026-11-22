import type { ConversionAnswerKey } from "./conversion-answer-key";
import {
  fail,
  type ConversionScoreDimensionResult,
} from "./conversion-score-result";
import {
  playerVisibleStrings,
  type DocLike,
  type Entity,
} from "./conversion-score-document";
import { textFoundIn } from "./conversion-score-text";

export function scoreSecrets(
  value: DocLike,
  key: ConversionAnswerKey,
): ConversionScoreDimensionResult {
  const details: string[] = [];
  const keySecrets = key.secrets.filter((s) => s.gmOnly);
  const docSecrets = (value.secrets ?? []) as Entity[];
  for (const s of keySecrets) {
    const matched = docSecrets.some(
      (d) => d.id === s.id || textFoundIn(s.text, String(d["text"] ?? "")),
    );
    if (!matched) details.push(`missing secret ${s.id}`);
  }
  const pvStrings = playerVisibleStrings(value);
  for (const s of keySecrets) {
    const leak = pvStrings.find((p) => textFoundIn(s.text, p.value));
    if (leak) details.push(`leaked secret ${s.id} in ${leak.field}`);
  }
  return fail(details);
}
