export const CANONICAL_CONVERSION_PROMPT = `Convert the tabletop RPG adventure I provide into a valid Codex Cryptica Adventure JSON v1 document.

Schema: https://codexcryptica.com/schemas/adventure-json/v1.json
Guide: https://codexcryptica.com/adventure-import

Strict output rules:
1. Return ONLY valid JSON matching Adventure JSON v1 (no Markdown fences, no prose outside the JSON).
2. Top-level required fields:
   - "formatVersion": "adventure-json/v1"
   - "id": slug matching /^[a-z0-9_-]{3,64}$/i
   - "title": 1-200 characters
   - "version": strict SemVer (e.g. "1.0.0")
   - "premise": { "background": string, "hook": string, "theme"?: string[], "tone"?: string }
   - "source": { "title": string, "authors"?: string[], "publisher"?: string, "publishedDate"?: string, "url"?: string, "license"?: string }
   - Optional "system": { "name": string, "targetParty"?: { "sizeMin"?: number, "sizeMax"?: number, "levelMin"?: number, "levelMax"?: number } }
   - All 11 collection arrays (use [] when empty): "locations", "actors", "factions", "scenes", "encounters", "clues", "rumours", "items", "secrets", "endings", "unresolved".
3. Epistemic honesty (CRITICAL):
   - Every entity requires "epistemicStatus": "explicit" | "inferred" | "ambiguous" | "unresolved".
   - Do NOT invent missing facts merely to fill fields.
   - If the source text is silent, omit optional fields. If it is contradictory or unclear, record an entry in "unresolved" with "epistemicStatus": "ambiguous" or "unresolved".
4. Visibility & secrets:
   - Use "visibility": "player-visible" | "gm-only".
   - Every entry in "secrets" MUST have "visibility": "gm-only".
   - Do NOT promote NPC testimony, rumours, or in-world handouts to objective truth unless the authored text confirms them.
5. Structural integrity:
   - Every entity ID across all collections must be unique and non-empty.
   - All cross-references (parentLocationId, locationId, factionId, sceneId, targetSceneId, actorIds, placedLocationId, placedActorId, placedSceneId, leadTargetId, relatedEntityIds, relatedEntityId) must point to existing IDs and never self-reference.
   - Location parentLocationId chains must not form cycles.
   - Every non-entry scene (scenes[1..n]) must be reachable via scene branches from scenes[0], with no inescapable mandatory dead-end loops.
6. Provenance & copyright:
   - Add optional "sourceRef" ({ page, pageEnd, chapter, section, anchor, textQuote }) when known.
   - Write concise structured summaries, key dialogue, and room briefs rather than copying large blocks of prose verbatim.
   - Include only authored adventure structure; omit playthrough state or session history.`;

export interface GuideFieldRule {
  field: string;
  requirement: string;
  notes: string;
}

export const TOP_LEVEL_RULES: GuideFieldRule[] = [
  {
    field: "formatVersion",
    requirement: 'Literal "adventure-json/v1"',
    notes: "Identifies the interchange contract version.",
  },
  {
    field: "id",
    requirement: "Slug (/^[a-z0-9_-]{3,64}$/i)",
    notes: "Stable lowercase identifier for the adventure.",
  },
  {
    field: "title",
    requirement: "String (1-200 characters)",
    notes: "Human-readable adventure title.",
  },
  {
    field: "version",
    requirement: 'Strict SemVer (e.g. "1.0.0")',
    notes: "Semantic version of the converted JSON package.",
  },
  {
    field: "premise",
    requirement: "{ background, hook, theme?, tone? }",
    notes: "Core setup and inciting hook for the adventure.",
  },
  {
    field: "source",
    requirement:
      "{ title, authors?, publisher?, publishedDate?, url?, license?, documentHash? }",
    notes: "Attribution metadata for the original authored adventure.",
  },
  {
    field: "system",
    requirement: "Optional { name, targetParty? }",
    notes: "System name and optional party size or level range.",
  },
];

export const COLLECTION_RULES: Array<{
  name: string;
  purpose: string;
}> = [
  {
    name: "locations",
    purpose:
      "Places, rooms, and regions with optional parentLocationId hierarchy and connections.",
  },
  {
    name: "actors",
    purpose:
      "NPCs, patrons, antagonists, and creatures with role, motivation, and faction/location links.",
  },
  {
    name: "factions",
    purpose:
      "Organisations, guilds, and power blocs with goals and party disposition.",
  },
  {
    name: "scenes",
    purpose:
      "Playable beats starting at scenes[0], linked by transition branches.",
  },
  {
    name: "encounters",
    purpose:
      "Obstacles, social conflicts, or hazards with alternativeSolutions ({ method, description }).",
  },
  {
    name: "clues",
    purpose:
      "Discoverable leads pointing to targets (leadTargetId) and placed in locations, actors, or scenes.",
  },
  {
    name: "rumours",
    purpose:
      "In-world claims tagged with truth (true, false, partially-true, unverified).",
  },
  {
    name: "items",
    purpose: "Notable objects, keys, or relics tied to a location or actor.",
  },
  {
    name: "secrets",
    purpose:
      'Hidden truths behind the curtain. Must always carry visibility: "gm-only".',
  },
  {
    name: "endings",
    purpose: "Possible resolutions and their triggering conditions.",
  },
  {
    name: "unresolved",
    purpose:
      "Explicitly recorded gaps, ambiguities, or contradictions in the source text.",
  },
];

export const EPISTEMIC_STATUSES: Array<{
  status: string;
  meaning: string;
}> = [
  {
    status: "explicit",
    meaning: "Directly stated in the source adventure text.",
  },
  {
    status: "inferred",
    meaning:
      "Reasonably deduced from adjacent context without inventing new lore.",
  },
  {
    status: "ambiguous",
    meaning: "Source text allows multiple conflicting interpretations.",
  },
  {
    status: "unresolved",
    meaning:
      "Source text is silent or contradictory; recorded without guessing.",
  },
];

export const TROUBLESHOOTING_ERRORS: Array<{
  code: string;
  cause: string;
  fix: string;
}> = [
  {
    code: "SCHEMA_VALIDATION_ERROR",
    cause:
      "Missing required field, unknown property (strict mode), or invalid slug/SemVer format.",
    fix: "Ensure all 11 collection arrays are present (even if []), remove extra keys, and verify id and version formats.",
  },
  {
    code: "INVALID_VISIBILITY",
    cause:
      'An entry in secrets has visibility: "player-visible" or omits visibility.',
    fix: 'Set visibility: "gm-only" on every item inside the secrets array.',
  },
  {
    code: "UNRESOLVED_REFERENCE",
    cause:
      "A parentLocationId, locationId, sceneId, targetSceneId, or actorIds entry points to an ID that does not exist.",
    fix: "Verify every referenced ID is defined in the matching collection and check for typos or self-references.",
  },
  {
    code: "UNREACHABLE_SCENE",
    cause:
      "A scene after scenes[0] has no inbound branch path from the opening scene.",
    fix: "Add a branch from scenes[0] or an intermediate scene so every non-entry scene is reachable.",
  },
  {
    code: "HIERARCHY_CYCLE",
    cause: "Two or more locations form a loop through parentLocationId.",
    fix: "Break the cycle so location containment forms a strict tree pointing toward top-level regions.",
  },
];
