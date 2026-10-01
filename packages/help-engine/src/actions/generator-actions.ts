import { GENERATORS, type GeneratorId } from "../registry/generators.generated";
import type { HelpChunk } from "../bundle/types";
import type { ActionRef } from "./types";

/** More than this and the model is choosing between near-identical buttons. */
export const MAX_GENERATOR_ACTIONS = 3;

const labelOf = new Map<string, string>(GENERATORS.map((g) => [g.id, g.label]));

/**
 * "Open this generator" actions for the generators the retrieved chunks are
 * about, in retrieval order, at most three. Never all of them: offering every
 * generator would bloat the prompt and make the choice meaningless. Each is
 * still checked by `validateAction` before the user sees it.
 */
export function generatorActionRefs(chunks: readonly HelpChunk[]): ActionRef[] {
  const refs: ActionRef[] = [];
  const seen = new Set<string>();
  for (const chunk of chunks) {
    if (!chunk.sourceId.startsWith("generator:")) continue;
    const id = chunk.sourceId.slice("generator:".length);
    const label = labelOf.get(id);
    if (!label || seen.has(id)) continue;
    seen.add(id);
    refs.push({
      id: `generators.open-${id}`,
      action: {
        type: "openGenerator",
        generatorId: id as GeneratorId,
        label: `Open the ${label} generator`,
      },
    });
    if (refs.length >= MAX_GENERATOR_ACTIONS) break;
  }
  return refs;
}
