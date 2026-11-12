import {
  currentLocationContext,
  type AdventureSession,
  type GroundingContext,
} from "@codex/adventure-engine";
import type { GeneratorRunRequest } from "generator-engine";
import { worldStyleForTheme } from "./world-style";

/** Uses only prepared Adventure sources, never an unfiltered present-day sample. */
export function createAdventureBackgroundRequest(
  session: AdventureSession,
  context: GroundingContext,
  useAI: boolean,
  themeId = "workspace",
): GeneratorRunRequest {
  const location = currentLocationContext(session);
  const style = worldStyleForTheme(themeId);
  if (
    !location ||
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
    options: { locationContext: location.name },
    instructions: [
      `Create local rumours for ${location.name} as hidden preparation.`,
      ...(style
        ? [
            `World style: ${style.name}. ${style.description} Rumours must be native to this genre: use its vocabulary, institutions and tone, and never import tropes from other genres.`,
          ]
        : []),
      "Canonical sources outrank provisional session knowledge. Preserve source period applicability, uncertainty and contradictions. Never treat future facts as current.",
      "Source lore and GM-only session knowledge are hidden: never encode their actual secrets in player-visible rumours. Mix mundane, misleading and substantial situations without assigning quests.",
      "Committed Adventure knowledge (GM-only sections remain hidden):",
      context.sessionKnowledge,
    ].join("\n"),
    vaultContext: {
      themeId,
      currentDate: session.worldEntry?.at
        ? String(session.worldEntry.at.year)
        : undefined,
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
