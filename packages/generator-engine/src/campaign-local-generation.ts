import { isTitleBanned } from "./campaign-generator-registry";
import {
  assertValidLanguageFallback,
  LanguageGenerationError,
} from "./campaign-generator-language";
import type {
  CampaignGeneratorDefinition,
  GeneratedDraft,
  GeneratorOutput,
  GeneratorRunRequest,
} from "./campaign-generator-types";

const MAX_LOCAL_TITLE_ATTEMPTS = 5;

/** The table-based draft used when AI is off, unavailable or failed. */
export function generateLocalDraft(
  generator: CampaignGeneratorDefinition,
  request: GeneratorRunRequest,
  bannedNames: Set<string>,
): GeneratedDraft {
  let output: GeneratorOutput;
  try {
    output = generator.generate(request);
  } catch (error) {
    if (request.generatorId === "language") {
      throw new LanguageGenerationError(
        "The local language generator could not produce a valid profile. Please try again.",
      );
    }
    throw error;
  }
  if (request.generatorId === "language") {
    assertValidLanguageFallback(output, bannedNames);
    return generator.mapOutputToDraft(output, request);
  }
  for (
    let attempt = 0;
    attempt < MAX_LOCAL_TITLE_ATTEMPTS &&
    isTitleBanned(output.title, bannedNames);
    attempt++
  ) {
    output = generator.generate(request);
  }
  return generator.mapOutputToDraft(output, request);
}
