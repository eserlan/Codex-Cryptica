import {
  DEFAULT_GENERATOR_KEYS,
  getCatalogueEntry,
} from "./generator-catalogue";
import {
  GENERATOR_SUGGESTIONS_MAX,
  GENERATOR_SUGGESTIONS_MIN,
  type GeneratorSuggestion,
} from "./types";

/**
 * Makes the model's generator picks safe to show (#3228, FR-013, FR-015).
 *
 * Unknown keys are dropped rather than shown, duplicates removed, and the list
 * is capped. Too few valid picks are topped up from the default set, and no
 * valid picks at all falls back to the whole default set, so the "develop
 * further" section is never empty.
 */
const DEFAULT_REASON = "A good place to keep developing most ideas.";

function defaultSuggestion(key: string): GeneratorSuggestion {
  return { generatorKey: key, reason: DEFAULT_REASON };
}

export function normaliseSuggestions(
  raw: GeneratorSuggestion[],
): GeneratorSuggestion[] {
  const seen = new Set<string>();
  const valid: GeneratorSuggestion[] = [];
  for (const item of raw) {
    if (!getCatalogueEntry(item.generatorKey)) continue;
    if (seen.has(item.generatorKey)) continue;
    seen.add(item.generatorKey);
    valid.push(item);
  }

  if (valid.length === 0) {
    return DEFAULT_GENERATOR_KEYS.map(defaultSuggestion);
  }

  for (const key of DEFAULT_GENERATOR_KEYS) {
    if (valid.length >= GENERATOR_SUGGESTIONS_MIN) break;
    if (seen.has(key)) continue;
    seen.add(key);
    valid.push(defaultSuggestion(key));
  }

  return valid.slice(0, GENERATOR_SUGGESTIONS_MAX);
}
