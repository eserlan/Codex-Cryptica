import { u } from "./user-content";
import { BANNED_NAMES } from "generator-engine";

export function buildCreationLoreSynthesisPrompt(
  query: string,
  vaultContext: string,
): string {
  return `You are a Master Archivist and Lore Synthesizer. A new entity is being added to the world, and you must resolve how it fits into the existing canonical continuity.

VAULT CONTEXT (The established world):
${u(vaultContext)}

USER REQUEST (The new entity):
${u(query)}

TASK:
Identify established lore, connections, factions, geography, or historical events from the vault that are relevant to this new entity. 
Synthesize how this new entity fits into the existing world. 
Consider:
- Where would they be located?
- To which factions might they belong or oppose?
- What historical events might they have been part of?
- What existing design patterns or cultural traditions should they follow?

Output a "Canonical Synthesis Summary" that ensures the new entity is lore-native and consistent with the vault. Avoid inventing major canon-breaking events; instead, weave the new entity into the existing tapestry.`;
}

export function buildStructuredDraftingPrompt(
  synthesisSummary: string,
  userQuery: string,
  categories: string[] = [],
): string {
  const validTypes =
    categories.length > 0
      ? categories.join(" | ")
      : "npc | faction | location | item | event | concept";

  return `You are a Structured Lore Drafter. Your task is to generate a formal world-building record based on a Canonical Synthesis Summary and a user request.

CANONICAL SYNTHESIS SUMMARY:
${synthesisSummary}

USER REQUEST:
${u(userQuery)}

DRAFTING REQUIREMENTS:
Use this exact format:
**Name:** [Entity Title]
**Type:** [One of: ${validTypes}]
**Chronicle:** [Polished player-facing summary, 1-3 sentences]
**Lore:** [Detailed GM-facing notes, history, and secrets using markdown]

GUIDELINES:
- Prioritize the details from the Canonical Synthesis Summary.
- Ensure the Name and Type are accurate to the user's intent.
- Use markdown in the Lore section for section headings, bold names, and bullet lists.
- For character, npc, or person records, the Lore section MUST include a "## Personality & Voice" heading with concise markdown bullets covering temperament, conversational habits, speech rhythm, word choice, and in-character behavior rules.
- For character, npc, or person records, the Lore section MUST also include a "## Knowledge & Expertise" heading listing the specific domains, skills, and information this character plausibly knows, and their explicit knowledge limits or blind spots.
- Preserve specific developments, relationships, and historical context.
- Naming rules: Names for the entity or any secondary figures MUST NEVER include generic fantasy cliché placeholders: ${BANNED_NAMES.join(", ")}.
- Output ONLY the structured fields.`;
}
