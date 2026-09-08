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

export function isDelveDraft(labels: string[] | undefined): boolean {
  return (
    labels?.some((label) =>
      ["dungeon", "delve", "dungeon-generator"].includes(label.toLowerCase()),
    ) ?? false
  );
}

/** Build a bounded delve context when handing a delve draft to the Boss / NPC generator (#1827). */
export function buildDelveBossContext(
  draft:
    | PlotTwistHandoffDraft
    | Pick<GeneratorOutput, "title" | "summary" | "content" | "lore">,
): string {
  const parts = [
    `[Delve Context]`,
    `Dungeon Location: ${draft.title}`,
    draft.summary,
    draft.lore || draft.content,
  ].filter((part): part is string => Boolean(part?.trim()));

  return parts.join("\n\n").slice(0, 4000);
}

/** Prefer the editable form premise, with the URL handoff as a navigation-safe fallback. */
export function resolvePlotTwistPremiseForGeneration(
  formPremise: string,
  handedOffPremise: string,
): string {
  return formPremise.trim() || handedOffPremise.trim();
}
