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

export function isFactionDraft(labels: string[] | undefined): boolean {
  return (
    labels?.some((label) =>
      [
        "faction-generator",
        "vampire-clan",
        "nomad-clan",
        "dark-fantasy-faction",
      ].includes(label.toLowerCase()),
    ) ?? false
  );
}

/** Build a bounded faction context when handing a faction draft to the Roster generator (#2808). */
export function buildFactionRosterContext(
  draft:
    | PlotTwistHandoffDraft
    | Pick<GeneratorOutput, "title" | "summary" | "content" | "lore">,
): string {
  const parts = [
    `[Faction Context]`,
    `Faction: ${draft.title}`,
    draft.summary,
    draft.content,
    draft.lore,
  ].filter((part): part is string => Boolean(part?.trim()));

  return parts.join("\n\n").slice(0, 4000);
}

export function isFactionRosterDraft(labels: string[] | undefined): boolean {
  return (
    labels?.some((label) =>
      ["faction-roster", "faction-roster-generator"].includes(
        label.toLowerCase(),
      ),
    ) ?? false
  );
}

/**
 * Build a bounded context when handing one roster member's section to the
 * NPC generator (#2808) — the member's own markdown section, plus which
 * roster it came from so the NPC generator knows the faction tie exists.
 */
export function buildRosterMemberContext(
  memberMarkdown: string,
  rosterTitle: string,
): string {
  const parts = [
    `[Faction Roster Member]`,
    `From roster: ${rosterTitle}`,
    memberMarkdown,
  ].filter((part): part is string => Boolean(part?.trim()));

  return parts.join("\n\n").slice(0, 4000);
}
