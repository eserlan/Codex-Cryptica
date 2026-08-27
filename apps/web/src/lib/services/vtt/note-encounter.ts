import { themeIdToLabel } from "generator-engine";
import { generatorEngine } from "$lib/services/seo/generator-engine";

/** What a generated encounter needs to know about where it is happening. */
export interface NoteEncounterRequest {
  /** World theme id of the open vault, mapped to the generator's genre label. */
  themeId?: string | null;
  /** Free-text steer, e.g. the name of the tile the note sits on. */
  context?: string;
}

export interface NoteEncounterResult {
  body: string;
  /** True when AI was asked for but unavailable, and local tables answered instead. */
  aiFallback: boolean;
}

/** Seam for the generator, so the note flow can be driven by a fake in a test. */
export type NoteEncounterGenerator = typeof generatorEngine.generateEncounter;

/**
 * Generates an encounter as the prose body of a map note.
 *
 * A note holds one block of text rather than the labelled fields an entity
 * gets, so the generated title, summary, and detail are flattened into
 * something the GM can read straight off the map.
 */
export async function generateNoteEncounter(
  request: NoteEncounterRequest = {},
  generate: NoteEncounterGenerator = (options) =>
    generatorEngine.generateEncounter(options),
): Promise<NoteEncounterResult> {
  const output = await generate({
    genre: themeIdToLabel[request.themeId ?? "fantasy"] ?? "Classic Fantasy",
    context: request.context?.trim() || "",
    useAI: true,
  });

  const body = [output.title, output.summary, output.content]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join("\n\n");

  return { body, aiFallback: output.aiFallback === true };
}
