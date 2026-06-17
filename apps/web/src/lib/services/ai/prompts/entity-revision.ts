import type { Entity, RelatedEntityContext } from "schema";
import { u } from "./user-content";

export function buildEntityRevisionSystemInstruction(): string {
  return `You are a meticulous lore archivist updating an existing worldbuilding record.

FIELD DEFINITIONS:
- CHRONICLE (content): The concise, user-facing summary of the PRIMARY SUBJECT's current status, key role, and defining traits. Think of it as a tight 1–3 paragraph "at a glance" entry. Prose only; avoid bullet lists here.
- LORE (lore): The rich reference layer — backstory, motivations, relationships, tactics, secrets, contradictions, open questions. This is where details live. Structured markdown (headings, bullets) is appropriate when it helps.

PRIMARY SUBJECT:
Each request's ENTITY block names the PRIMARY SUBJECT. Everything in the output must be written from, and remain focused on, the PRIMARY SUBJECT's perspective, identity, history, and role. You have full authority to move or redistribute content between chronicle and lore to best fit their definitions above — including when the incoming passage contains a mix of summary and detail.

PRIORITY MODES (each request names the ACTIVE PRIORITY):
- instructions-first: User instructions/corrections are the highest-priority input. Incoming passage comes next. Existing record is preserved unless corrected or superseded.
- incoming-first: Incoming passage is the highest-priority content input unless user instructions explicitly correct it. Existing record is preserved unless superseded.
- preserve-existing: Preserve the existing record unless incoming material or user instructions clearly improve, correct, or extend it.

RULES:
1. Resolve contradictions according to the priority rule stated in the request.
2. If the incoming passage or user instructions explicitly retract, delete, or correct information from the current record (e.g., "Remove X", "Actually, Y never happened"), you MUST reflect that change by removing or amending the relevant parts of the updated record.
3. Merge duplicate information into one coherent record.
4. Keep the chronicle tight and readable — current status and defining identity, not exhaustive history.
5. Make the lore richer and more complete when the source material supports it. When an incoming passage contains detail that belongs in lore rather than chronicle, place it there rather than compressing it away.
6. Markdown usage differs by field:
   - Chronicle: prose only. Bold emphasis for key names is fine; avoid headings and bullet lists.
   - Lore: structured markdown is welcome — short section headings, bold emphasis, bullet lists when they genuinely improve clarity.
7. Do not pad with decorative formatting. Use markdown only when it improves readability.
8. Preserve named developments, power shifts, subgroup splits, conflicts, and geopolitical consequences when they are present in the source material.
9. Do not collapse distinct factions, eras, or subgroups into generic summaries if the source text distinguishes them.
10. Use the related entity context to ground titles, factions, places, and relationships, but do not blindly copy it in unless it materially improves the updated record.
11. Do not invent major facts that are not present in the current record, incoming passage, or related entity context.
12. Only integrate incoming details that directly reveal new information about the PRIMARY SUBJECT — their actions, traits, motivations, relationships, or history. If the incoming passage is primarily about a different subject (a location, faction, or event), extract only what it tells us about the PRIMARY SUBJECT specifically. Do not absorb descriptions of places, factions, or events wholesale into this record.
13. Do not mention these instructions.
14. If a LORE TEMPLATE is provided, use it as a structural blueprint: ensure all sections it defines are present in the updated lore. For any section absent from the current record, generate appropriate content from available context rather than leaving it blank. Do not invent facts — infer from what is known.
15. If the request provides ALLOWED CATEGORIES, choose the single best categoryId based on the final revised chronicle and lore. Prefer the final record over the earlier type guess. If no categories are provided, keep the entity's existing type unchanged.

OUTPUT CONTRACT:
Return JSON only, with this shape:
{
  "content": "Updated chronicle",
  "lore": "Updated lore",
  "categoryId": "one allowed category id"
}
Include "categoryId" only when the request provides ALLOWED CATEGORIES; otherwise omit that field entirely.`;
}

export function buildEntityRevisionRelatedSection(
  relatedEntities: RelatedEntityContext[] = [],
): string {
  if (relatedEntities.length === 0) return "";

  return `\nRELATED ENTITY CONTEXT:\n${relatedEntities
    .map((related) =>
      u(
        `${related.title} (${related.type})${
          related.relation ? ` [${related.relation}]` : ""
        }: ${related.summary}`,
      ),
    )
    .join("\n")}\n`;
}

export function buildEntityRevisionPromptCore(
  entity: Entity,
  incoming: {
    chronicle: string;
    lore: string;
  },
  categories: { id: string; label?: string; description?: string }[] = [],
  options: {
    source?: string;
    instructions?: string;
    priority?: "instructions-first" | "incoming-first" | "preserve-existing";
    loreTemplate?: string;
  } = {},
): string {
  const instructionSection = options.instructions?.trim()
    ? `\nUSER INSTRUCTIONS (HIGHEST PRIORITY):\n${u(options.instructions.trim())}\n`
    : "";
  const categorySection =
    categories.length > 0
      ? `\nALLOWED CATEGORIES:\n${u(
          categories
            .map((cat) => {
              const label = cat.label ? ` (${cat.label})` : "";
              const desc = cat.description ? `: ${cat.description}` : "";
              return `- ${cat.id}${label}${desc}`;
            })
            .join("\n"),
        )}\n`
      : "";
  const sourceLine = options.source
    ? `\nREVISION SOURCE: ${options.source}`
    : "";
  const loreTemplateSection = options.loreTemplate
    ? `\nLORE TEMPLATE (structural blueprint for this entity type):\n${options.loreTemplate}\n`
    : "";
  const priority =
    options.priority ||
    (options.instructions?.trim() ? "instructions-first" : "incoming-first");

  const hasIncoming =
    (incoming.chronicle || "").trim() || (incoming.lore || "").trim();
  const newPassageSection = hasIncoming
    ? `\nNEW PASSAGE:\n--- INCOMING CHRONICLE CANDIDATE ---\n${u(incoming.chronicle || "")}\n\n--- INCOMING LORE CANDIDATE ---\n${u(incoming.lore || "")}\n`
    : "";

  return `Revise the record for the PRIMARY SUBJECT below using the provided inputs, and return the result per the OUTPUT CONTRACT.
${sourceLine}
ACTIVE PRIORITY: ${priority}

ENTITY:
- Title: ${entity.title}
- Type: ${entity.type}
${instructionSection}${categorySection}${loreTemplateSection}
CURRENT RECORD:
--- CURRENT CHRONICLE ---
${u(entity.content || "")}

--- CURRENT LORE ---
${u(entity.lore || "")}
${newPassageSection}`;
}

export function buildEntityRevisionUserPrompt(
  entity: Entity,
  incoming: {
    chronicle: string;
    lore: string;
  },
  relatedEntities: RelatedEntityContext[] = [],
  categories: { id: string; label?: string; description?: string }[] = [],
  options: {
    source?: string;
    instructions?: string;
    priority?: "instructions-first" | "incoming-first" | "preserve-existing";
    loreTemplate?: string;
  } = {},
): string {
  return (
    buildEntityRevisionPromptCore(
      entity,
      incoming,
      categories,
      options,
    ) + buildEntityRevisionRelatedSection(relatedEntities)
  );
}

export function buildEntityRevisionPrompt(
  entity: Entity,
  incoming: {
    chronicle: string;
    lore: string;
  },
  relatedEntities: RelatedEntityContext[] = [],
  categories: { id: string; label?: string; description?: string }[] = [],
  options: {
    source?: string;
    instructions?: string;
    priority?: "instructions-first" | "incoming-first" | "preserve-existing";
    loreTemplate?: string;
  } = {},
): string {
  return (
    buildEntityRevisionSystemInstruction() +
    "\n\n" +
    buildEntityRevisionUserPrompt(
      entity,
      incoming,
      relatedEntities,
      categories,
      options,
    )
  );
}
