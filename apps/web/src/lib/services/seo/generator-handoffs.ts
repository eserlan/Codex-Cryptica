import type { GeneratorOutput } from "./generator-engine";

export interface PlotTwistHandoffDraft {
  title: string;
  summary?: string;
  content?: string;
  lore?: string;
  labels?: string[];
}

/** Build a bounded premise when handing a public draft to Plot Twist. */
export function buildPlotTwistPremise(
  draft:
    | PlotTwistHandoffDraft
    | Pick<GeneratorOutput, "title" | "summary" | "content" | "lore">,
): string {
  return [draft.title, draft.summary, draft.content, draft.lore]
    .filter((part): part is string => Boolean(part?.trim()))
    .join("\n\n")
    .slice(0, 4000);
}

export function isQuestHookDraft(labels: string[] | undefined): boolean {
  return (
    labels?.some((label) =>
      ["quest-generator", "rpg-quest"].includes(label.toLowerCase()),
    ) ?? false
  );
}

/** Prefer the editable form premise, with the URL handoff as a navigation-safe fallback. */
export function resolvePlotTwistPremiseForGeneration(
  formPremise: string,
  handedOffPremise: string,
): string {
  return formPremise.trim() || handedOffPremise.trim();
}
