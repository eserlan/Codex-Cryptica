import { u } from "./user-content";
import type { ConnectedEntityPromptContext } from "schema";

export function buildRelatedEntityGenerationPrompt(
  sourceEntity: {
    title: string;
    type: string;
    content?: string;
    lore?: string;
  },
  targetType: string,
  relationship: string,
  customInstructions: string = "",
  connectedEntities: ConnectedEntityPromptContext[] = [],
  categories: { id: string; label?: string }[] = [],
  templateOutline: string = "",
): string {
  const allowedCategoriesStr = categories.map((c) => c.id).join(", ");
  const isSurpriseMe =
    targetType.toLowerCase() === "surprise me" ||
    targetType.toLowerCase() === "surprise_me";

  const targetTypeRule = isSurpriseMe
    ? `Since the user selected "Surprise Me", you must dynamically choose the most creative and logically fitting target type from the active list of allowed categories: [${allowedCategoriesStr}].`
    : `The target type MUST be strictly: "${targetType}".`;

  const neighborsContextStr =
    connectedEntities.length > 0
      ? `\nDIRECT GRAPH NEIGHBORS OF ${sourceEntity.title}:\n` +
        connectedEntities
          .map((c) =>
            u(
              `- ${c.title} (${c.type}) [Relation: ${c.relation}]: ${c.content}`,
            ),
          )
          .join("\n") +
        "\n"
      : "";

  const templateRule = templateOutline.trim()
    ? `IMPORTANT: You must structure the "description" field using the following markdown outline template headings and structure:\n${u(templateOutline)}\n`
    : "";

  return `You are a Master Archivist and Lore Synthesizer. Your task is to generate a new, grounded, context-aware entity based on a source entity and its surrounding world context.

SOURCE ENTITY (Origin):
- Title: ${sourceEntity.title}
- Type: ${sourceEntity.type}
- Chronicle: ${u(sourceEntity.content || "")}
- Lore: ${u(sourceEntity.lore || "")}
${neighborsContextStr}
ALLOWED CATEGORIES IN VAULT:
[${allowedCategoriesStr}]

GENERATION INSTRUCTIONS:
1. ${targetTypeRule}
2. The relationship/link from the Source Entity ("${sourceEntity.title}") to this new entity is: "${u(relationship)}". Ground the generation around this relationship.
3. Keep the generation context-aware. Ground the new entity in the existing lore of "${sourceEntity.title}" and its direct graph neighbors, but invent creative details to make it an inspiring addition.
4. Name the new entity using the vault's established setting, cultures, factions, languages, themes, and tone. For characters especially, infer naming conventions from the source entity and direct graph neighbors, then create a culturally and thematically coherent name. MUST NEVER use generic fantasy cliché placeholders or banned names (Aethel, Vane, Elara, Valerius, Kael, Kaelen, Theron, Zara, Aldric, Kane, Drake, Maren, Cross, Vale, Stone, Grey, Ash, Cole, Thorne, Voss, Julian, Julianne, Halloway, Oakhaven, Oakhollow, Millbrook, Riverdale, Silas, Vesper). Avoid modern default names, joke names, and names that clash with the setting unless the supplied lore clearly supports that contrast.
5. ${templateRule}
6. Custom instructions from the user to incorporate: "${u(customInstructions)}"
7. Normative constraint: You must use the term "Labels" for all metadata categorization. Do NOT suggest "tags" or mention "tags" anywhere. Return suggested metadata attributes under the "labels" property.

RESPONSE FORMAT:
Return JSON only with this shape:
{
  "name": "Name of the new entity",
  "type": "The selected type (must be one of the allowed categories: [${allowedCategoriesStr}])",
  "summary": "Chronicle summary: player-facing, 1-3 sentences.",
  "description": "Lore content: Rich GM-facing details. If a template outline was provided, format this field using the template's headings.",
  "labels": ["suggested-label-1", "suggested-label-2"],
  "plotHook": "An optional plot hook linking this new entity back to the world/source entity",
  "relationshipBack": "A relationship label from the Source Entity → New Entity (e.g. \\"${relationship}\\" or similar logical variant)"
}`;
}
