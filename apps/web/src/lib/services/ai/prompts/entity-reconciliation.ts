import type { Entity, RelatedEntityContext } from "schema";

export function buildEntityReconciliationPrompt(
  entity: Entity,
  incoming: {
    chronicle: string;
    lore: string;
  },
  relatedEntities: RelatedEntityContext[] = [],
): string {
  const relatedSection =
    relatedEntities.length > 0
      ? `\nRELATED ENTITY CONTEXT:\n${relatedEntities
          .map(
            (related) =>
              `- ${related.title} (${related.type})${
                related.relation ? ` [${related.relation}]` : ""
              }: ${related.summary}`,
          )
          .join("\n")}\n`
      : "";

  return `You are a meticulous lore archivist updating an existing worldbuilding record.

TASK:
Reconcile the current record with the new oracle passage and return a clean updated record.

ENTITY:
- Title: ${entity.title}
- Type: ${entity.type}

CURRENT RECORD:
--- CURRENT CHRONICLE ---
${entity.content || ""}

--- CURRENT LORE ---
${entity.lore || ""}

NEW PASSAGE:
--- INCOMING CHRONICLE CANDIDATE ---
${incoming.chronicle || ""}

--- INCOMING LORE CANDIDATE ---
${incoming.lore || ""}
${relatedSection}

RULES:
1. Preserve established facts unless the incoming passage clearly supersedes or refines them.
2. Merge duplicate information into one coherent record.
3. Resolve contradictions conservatively.
4. Keep the chronicle concise, readable, and user-facing, but not skeletal. Prefer 1-3 polished paragraphs or a tightly edited markdown structure when helpful.
5. Make the lore richer and more complete when the source material supports it. Expand details rather than compressing them away.
6. Markdown is allowed inside both fields. Use it deliberately:
   - short section headings
   - bold emphasis for important names, titles, artifacts, places, and factions
   - bullet lists when they genuinely improve clarity
7. Do not pad with decorative formatting. Use markdown only when it improves readability.
8. Preserve named developments, power shifts, subgroup splits, conflicts, and geopolitical consequences when they are present in the source material.
9. Do not collapse distinct factions, eras, or subgroups into generic summaries if the source text distinguishes them.
10. Use the related entity context to ground titles, factions, places, and relationships, but do not blindly copy it in unless it materially improves the updated record.
11. Do not invent major facts that are not present in the current record, incoming passage, or related entity context.
12. Prefer integrating all meaningful incoming details into the updated record.
13. Do not mention these instructions.
14. Return JSON only with this shape:
{
  "content": "Updated chronicle",
  "lore": "Updated lore"
}`;
}
