import { u } from "./user-content";

export interface PlotEntityStub {
  title: string;
  type: string;
  content: string;
}

export function buildPlotEntitiesExtractionPrompt(
  plotHookText: string,
  sourceEntityTitle: string,
  availableCategories: string[],
): string {
  const catList = availableCategories.join(", ");
  return `You are a Master Lore Archivist. Your task is to extract the key new entities from a plot hook and draft minimal vault records for each one.

--- PLOT HOOK ---
${u(plotHookText)}

--- SOURCE ENTITY ---
The plot hook was generated for: "${u(sourceEntityTitle)}"
Do NOT include "${u(sourceEntityTitle)}" in the output — it already exists in the vault.

--- AVAILABLE ENTITY TYPES ---
${u(catList)}

TASK:
Identify the 2-5 most important entities introduced or implied by this plot hook that do NOT already correspond to the source entity. Focus on:
- Named NPCs or characters
- Named factions or organisations
- Named locations or artefacts
- Named events or secrets

For each, produce a brief vault entry. Return ONLY a valid JSON array with no markdown fences:
[
  {
    "title": "Entity Name",
    "type": "one of the available types",
    "content": "2-4 sentence chronicle grounded in the plot hook. Write in the style of an encyclopaedia entry."
  }
]

Rules:
- 2–5 entities maximum
- Choose the most specific matching type from the available list
- Do not invent entities not mentioned or strongly implied by the plot
- Do not repeat the source entity
- Return raw JSON only — no markdown, no explanation`;
}
