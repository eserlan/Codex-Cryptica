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
- Does the vault context establish a culture, people, or faction this entity belongs to — and if so, does it document (directly or through example names of other entities from that culture) a naming convention or linguistic style? If yes, state it explicitly in the summary so the drafting stage can name the entity accordingly instead of defaulting to a generic style.

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

BANNED NAMES — read first, this is a hard constraint, not a preference:
Never title the entity, or name any secondary figure it mentions, any of: ${BANNED_NAMES.join(", ")}. This also bans hyphenated or compound variations of these (e.g. if "Vane" is banned, do not use "Vane-Smithe" either). These are generic fantasy clichés — invent something distinct and setting-appropriate instead.

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
- Naming style: if the Canonical Synthesis Summary states a culture-, people-, or faction-specific naming convention or linguistic style for this entity, the Name MUST follow it. Otherwise, choose a name that is thematically and culturally coherent with the world rather than a generic, culture-neutral fantasy name.
- Use markdown in the Lore section for section headings, bold names, and bullet lists.
- For character, npc, or person records, the Lore section MUST include a "## Personality & Voice" heading with concise markdown bullets covering temperament, conversational habits, speech rhythm, word choice, and in-character behavior rules.
- For character, npc, or person records, the Lore section MUST also include a "## Knowledge & Expertise" heading listing the specific domains, skills, and information this character plausibly knows, and their explicit knowledge limits or blind spots.
- Preserve specific developments, relationships, and historical context.
- Output ONLY the structured fields — no draft notes, no verification notes, no text before **Name:** or after the Lore section.

BEFORE YOU OUTPUT — silently verify, then correct if needed:
1. Banned names: does the Name, or any secondary figure named in Chronicle/Lore, match or contain (as a hyphenated/compound part) any entry in the BANNED NAMES list above? If so, rename before outputting.
2. Naming style: if the Canonical Synthesis Summary states a naming convention or linguistic style for this entity's culture/people/faction, does the Name actually follow it? If not, rename to match it.
3. Internal consistency: do Name, Type, Chronicle, and Lore agree with each other and with the Canonical Synthesis Summary — no contradictions in role, relationships, timeline, or established facts?
4. Format: does the output match the exact **Name:**/**Type:**/**Chronicle:**/**Lore:** structure above, with nothing else around it?
Fix anything that fails these checks before producing your final answer. Only the corrected, final structured record should appear in your output — never show your verification work.`;
}
