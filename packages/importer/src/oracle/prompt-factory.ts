export const EXTRACTION_PROMPT = `
You are an expert Codex Archivist. Your task is to analyze the provided text and extract distinct semantic entities (Characters, Locations, Items, Lore, Factions).

### Extraction Strategy: Lenient & Inclusive
- **Be Lenient**: Capture all potential entities. It is better to have more entities that can be refined than to miss important figures or places.
- **Deep Discovery**: Also extract entities mentioned within the descriptions, lore, or notes of other entities. For example, if a character's history mentions an "Egyptologist" or a "Vampire Club", those should be extracted as their own entities if they aren't already.
- **Entity Candidates**: Look for proper nouns, titled figures, significant artifacts, named locations, and unique events.

For each identified entity:
1.  **Title**: A concise, unique name.
2.  **Type**: One of [Character, Location, Item, Lore, Faction].
3.  **Chronicle**: A short (1-2 paragraph) Markdown summary. Focus on the entity's immediate relevance.
4.  **Lore**: Detailed background information, history, or complex data. This is the "deep dive" content.
5.  **Frontmatter**: Generate YAML properties relevant to the type (e.g., "race", "gender", "status", "alignment" for Character; "region", "notable_districts" for Location).
6.  **Image**: Scan the text for any absolute URLs starting with http or https that point to images (.png, .jpg, .jpeg, .webp).
7.  **Connections**: Identify names of OTHER entities mentioned in the text. Provide a descriptive label for the relationship (e.g., "ally of", "located in", "belongs to").

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
