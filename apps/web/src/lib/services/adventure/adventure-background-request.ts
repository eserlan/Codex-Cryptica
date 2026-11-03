import type {
  AdventureSession,
  GroundingContext,
} from "@codex/adventure-engine";
import type { GeneratorRunRequest } from "generator-engine";

/** Uses only prepared Adventure sources, never an unfiltered present-day sample. */
export function createAdventureBackgroundRequest(
  session: AdventureSession,
  context: GroundingContext,
  useAI: boolean,
  themeId = "workspace",
): GeneratorRunRequest {
  const entry = session.worldEntry;
  if (
    !entry ||
    context.purpose !== "background" ||
    context.sessionId !== session.id ||
    context.vaultId !== session.vaultId ||
    context.revision !== session.revision
  ) {
    throw new Error("invalid-background-context");
  }
  return {
    generatorId: "rumour",
    themeId,
    useAI,
    options: { locationContext: entry.location.name },
    instructions: [
      `Create local rumours for ${entry.location.name} as hidden preparation.`,
      "Canonical sources outrank provisional session knowledge. Preserve source period applicability, uncertainty and contradictions. Never treat future facts as current.",
      "Source lore and GM-only session knowledge are hidden: never encode their actual secrets in player-visible rumours. Mix mundane, misleading and substantial situations without assigning quests.",
      "Committed Adventure knowledge (GM-only sections remain hidden):",
      context.sessionKnowledge,
    ].join("\n"),
    vaultContext: {
      themeId,
      currentDate: entry.at ? String(entry.at.year) : undefined,
      categoryLabels: [],
      applyTemplate: false,
      neighbors: [],
      worldSample: [...context.anchors, ...context.relevant].map((source) => ({
        id: source.recordId,
        title: source.displayName,
        type: "source",
        contentExcerpt: source.content,
        ...(source.lore ? { loreExcerpt: source.lore } : {}),
      })),
      existingTitles: [],
      labelSuggestions: [],
      includedContext: ["world"],
    },
  };
}
