import { GENERIC_TEMPLATES } from "schema";

// Maps the AI-facing type label to the generic lore template key (shared
// with the app's manual entity-creation/revision flow) so a single
// extraction call produces lore with the same section structure a user
// would get from creating the entity by hand.
const TYPE_TEMPLATES: Array<{ type: string; templateKey: string }> = [
  { type: "Character", templateKey: "character" },
  { type: "Location", templateKey: "location" },
  { type: "Item", templateKey: "item" },
  { type: "Faction", templateKey: "faction" },
  { type: "Creature", templateKey: "creature" },
  { type: "Event", templateKey: "event" },
  { type: "Lore", templateKey: "note" },
];

const LORE_OUTLINE_SECTION = TYPE_TEMPLATES.map(
  ({ type, templateKey }) =>
    `--- ${type} ---\n${GENERIC_TEMPLATES[templateKey]}`,
).join("\n\n");

export const EXTRACTION_PROMPT = `
You are an expert Codex Archivist. Your task is to analyze the provided text and extract distinct semantic entities (Characters, Locations, Items, Lore, Factions, Creatures, Events).

### Extraction Strategy: Lenient & Inclusive
- **Be Lenient**: Capture all potential entities. It is better to have more entities that can be refined than to miss important figures or places.
- **Deep Discovery**: Also extract entities mentioned within the descriptions, lore, or notes of other entities. For example, if a character's history mentions an "Egyptologist" or a "Vampire Club", those should be extracted as their own entities if they aren't already.
- **One-Way Connections**: Prefer one-way connections to reduce redundancy. For example, if you describe Character A as the "boss of" Character B, you do not need to explicitly add "has boss" to Character B's links unless it provides unique semantic value.
- **Entity Candidates**: Look for proper nouns, titled figures, significant artifacts, named locations, unique events, and creatures/monsters.

For each identified entity:
1.  **Title**: A concise, unique name.
2.  **Type**: One of [Character, Location, Item, Lore, Faction, Creature, Event].
3.  **Chronicle**: A short (1-2 paragraph) Markdown summary. Focus on the entity's immediate relevance.
4.  **Lore**: Detailed background information, history, or complex data — the "deep dive" content. Structure it using the section headings from the outline below matching the entity's Type. Include every section from that outline; when the source text doesn't cover a section, generate reasonable content by inferring from what's already known rather than leaving it blank or omitting the section — but do not invent major facts unsupported by the text.
5.  **Frontmatter**: Generate YAML properties relevant to the type (e.g., "race", "gender", "status", "alignment" for Character; "region", "notable_districts" for Location).
6.  **Image**: Scan the text for any absolute URLs starting with http or https that point to images (.png, .jpg, .jpeg, .webp).
7.  **Connections**: Identify names of OTHER entities mentioned in the text. Provide a descriptive label for the relationship (e.g., "ally of", "located in", "belongs to").

LORE SECTION OUTLINES BY TYPE:
${LORE_OUTLINE_SECTION}

Output the result as a STRICT JSON Array of objects. Do not include markdown code fences around the JSON.
Schema:
[
  {
    "title": "string",
    "type": "string",
    "chronicle": "markdown string",
    "lore": "markdown string",
    "frontmatter": { "key": "value" },
    "imageUrl": "string",
    "detectedLinks": [
      { "target": "Entity Name", "label": "description of relationship" }
    ]
  }
]
`;
