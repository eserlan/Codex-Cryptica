import rawKey from "../../../../fixtures/adventures/reference-one-shot/answer-key.json";
import {
  ConversionAnswerKeySchema,
  type ConversionAnswerKey,
} from "../../src/adventure-json/conversion-answer-key";
import {
  ENTITY_COLLECTIONS,
  type DocLike,
} from "../../src/adventure-json/conversion-score-document";

export function makeKey(
  overrides: Partial<ConversionAnswerKey> = {},
): ConversionAnswerKey {
  return { ...ConversionAnswerKeySchema.parse(rawKey), ...overrides };
}

export function makeDocument(overrides: Partial<DocLike> = {}): DocLike {
  return {
    ...Object.fromEntries(ENTITY_COLLECTIONS.map((name) => [name, []])),
    ...overrides,
  } as DocLike;
}
