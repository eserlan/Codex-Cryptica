import type { GeneratorOutput } from "./generator-engine";

/** Build a bounded premise when handing a public draft to Plot Twist. */
export function buildPlotTwistPremise(
  draft: Pick<GeneratorOutput, "title" | "summary" | "content" | "lore">,
): string {
  return [draft.title, draft.summary, draft.content, draft.lore]
    .filter((part): part is string => Boolean(part?.trim()))
    .join("\n\n")
    .slice(0, 4000);
}
