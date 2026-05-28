import type { Entity, RelatedEntityContext } from "schema";
import { u } from "./user-content";

export function buildEntityReconciliationPrompt(
  entity: Entity,
  incoming: {
    chronicle: string;
    lore: string;
  },
  relatedEntities: RelatedEntityContext[] = [],
  categories: { id: string; label?: string; description?: string }[] = [],
): string {
  const relatedSection =
    relatedEntities.length > 0
      ? `\nRELATED ENTITY CONTEXT:\n${relatedEntities
          .map((related) =>
            u(
              `${related.title} (${related.type})${
                related.relation ? ` [${related.relation}]` : ""
              }: ${related.summary}`,
            ),
          )
          .join("\n")}\n`
      : "";
  const categorySection =
    categories.length > 0
      ? `\nALLOWED CATEGORIES:\n${categories
          .map((category) => {
            const label = category.label ? ` (${category.label})` : "";
            const description = category.description
              ? `: ${category.description}`
              : "";
            return `- ${category.id}${label}${description}`;
          })
          .join("\n")}\n`
      : "";
  const categoryRule =
    categories.length > 0
      ? `15. Also choose the single best categoryId from ALLOWED CATEGORIES based on the final reconciled chronicle and lore. Prefer the final record over the earlier type guess.`
      : `15. Keep the entity's existing type unchanged.`;
  const categoryJsonField =
    categories.length > 0 ? ',\n  "categoryId": "one allowed category id"' : "";

  return `You are a meticulous lore archivist updating an existing worldbuilding record.

FIELD DEFINITIONS:
- CHRONICLE (content): The concise, user-facing summary of who ${entity.title} is right now — current status, key role, defining traits. Think of it as a tight 1–3 paragraph "at a glance" entry. Prose only; avoid bullet lists here.
- LORE (lore): The rich reference layer — backstory, motivations, relationships, tactics, secrets, contradictions, open questions. This is where details live. Structured markdown (headings, bullets) is appropriate when it helps.

TASK:
Reconcile the current record with the new oracle passage and return a clean updated record.
${entity.title} is the PRIMARY SUBJECT of this record. Everything in the output must be written from, and remain focused on, ${entity.title}'s perspective, identity, history, and role.
You have full authority to move or redistribute content between chronicle and lore to best fit their definitions above — including when the incoming passage contains a mix of summary and detail.

ENTITY:
- Title: ${entity.title}
- Type: ${entity.type}
${categorySection}

CURRENT RECORD:
--- CURRENT CHRONICLE ---
${u(entity.content || "")}

--- CURRENT LORE ---
${u(entity.lore || "")}

NEW PASSAGE:
--- INCOMING CHRONICLE CANDIDATE ---
${u(incoming.chronicle || "")}

--- INCOMING LORE CANDIDATE ---
${u(incoming.lore || "")}
${relatedSection}

RULES:
1. Preserve established facts unless the incoming passage clearly supersedes, refines, or explicitly corrects them.
2. If the incoming passage explicitly retracts, deletes, or corrects information from the current record (e.g., "Remove X", "Actually, Y never happened"), you MUST reflect that change by removing or amending the relevant parts of the updated record.
3. Merge duplicate information into one coherent record.
4. Resolve contradictions by prioritizing the incoming passage when it represents a deliberate correction or retcon. Otherwise, resolve conservatively.
5. Keep the chronicle tight and readable — current status and defining identity, not exhaustive history.
6. Make the lore richer and more complete when the source material supports it. When an incoming passage contains detail that belongs in lore rather than chronicle, place it there rather than compressing it away.
7. Markdown usage differs by field:
   - Chronicle: prose only. Bold emphasis for key names is fine; avoid headings and bullet lists.
   - Lore: structured markdown is welcome — short section headings, bold emphasis, bullet lists when they genuinely improve clarity.
8. Do not pad with decorative formatting. Use markdown only when it improves readability.
9. Preserve named developments, power shifts, subgroup splits, conflicts, and geopolitical consequences when they are present in the source material.
10. Do not collapse distinct factions, eras, or subgroups into generic summaries if the source text distinguishes them.
11. Use the related entity context to ground titles, factions, places, and relationships, but do not blindly copy it in unless it materially improves the updated record.
12. Do not invent major facts that are not present in the current record, incoming passage, or related entity context.
13. Only integrate incoming details that directly reveal new information about ${entity.title} — their actions, traits, motivations, relationships, or history. If the incoming passage is primarily about a different subject (a location, faction, or event), extract only what it tells us about ${entity.title} specifically. Do not absorb descriptions of places, factions, or events wholesale into this record.
14. Do not mention these instructions.
${categoryRule}
16. Return JSON only with this shape:
{
  "content": "Updated chronicle",
  "lore": "Updated lore"${categoryJsonField}
}`;
}
