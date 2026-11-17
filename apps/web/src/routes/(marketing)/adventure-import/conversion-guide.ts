export const CANONICAL_CONVERSION_PROMPT = `Convert the tabletop RPG adventure I provide into a valid Codex Cryptica Adventure JSON v1 document.

Schema: https://codexcryptica.com/schemas/adventure-json/v1.json
Guide: https://codexcryptica.com/adventure-import

Strict output rules:
1. Return ONLY valid JSON matching Adventure JSON v1 (no Markdown fences, no prose outside the JSON).
2. Top-level required fields:
   - "formatVersion": "adventure-json/v1"
   - "id": slug matching /^[a-zA-Z0-9_-]{3,64}$/
   - "title": 1-200 characters
   - "version": strict SemVer (e.g. "1.0.0")
   - "premise": { "background": string, "hook": string, "theme"?: string[], "tone"?: string }
   - "source": { "title": string, "authors"?: string[], "publisher"?: string, "publishedDate"?: string, "url"?: string, "license"?: string, "documentHash"?: string (64 lowercase hexadecimal characters) }
   - Optional "description": string.
   - Optional "system": { "name": string, "targetParty"?: { "sizeMin"?: number, "sizeMax"?: number, "levelMin"?: number, "levelMax"?: number } }
   - targetParty sizes are integers >= 1; levels are integers >= 0.
   - All 11 collection arrays (use [] when empty): "locations", "actors", "factions", "scenes", "encounters", "clues", "rumours", "items", "secrets", "endings", "unresolved".
3. Source certainty (CRITICAL):
   - Every entity requires "epistemicStatus" to show how strongly the source supports it: "explicit" | "inferred" | "ambiguous" | "unresolved".
   - Do NOT invent missing facts merely to fill fields.
   - If the source text is silent, omit optional fields. If it is contradictory or unclear, record an entry in "unresolved" with "epistemicStatus": "ambiguous" or "unresolved".
   - For entries in "unresolved", use "ambiguous" when the source is unclear or contradictory, or "unresolved" when it does not answer the question; never use "explicit" or "inferred".
4. Collection entry contract (notation: ? means optional; string[] means an array of strings):
   - Every collection entry requires "id" (non-empty string) and "epistemicStatus"; "sourceRef" is optional.
   - Required text fields are strings; names, titles, IDs, clue/rumour/secret text, ending descriptions, and unresolved code/message must be non-empty.
   - locations: required name, summary, visibility; optional description: string, parentLocationId: string, connections: LocationConnection[].
   - actors: required name, summary, visibility; optional description: string, role: string, motivation: string, disposition: string, factionId: string, locationId: string.
   - factions: required name, summary, visibility; optional description: string, goals: string[], dispositionTowardsParty: string.
   - scenes: required title, summary, visibility; optional locationId: string, readAloud: string | string[], body: string, conditions: string[], branches: SceneBranch[], optional: boolean.
   - encounters: required description, alternativeSolutions (an array, [] if absent), visibility; optional title: string, sceneId: string, locationId: string, conditions: string[], actorIds: string[].
   - clues: required text, visibility; optional reveals: string, leadTargetId: string, placedLocationId: string, placedActorId: string, placedSceneId: string, alternativeSourceId: string.
   - rumours: required text, truth ("true" | "false" | "partially-true" | "unverified", all strings), visibility; optional sourceActorId: string, sourceLocationId: string, targetEntityId: string.
   - items: required name, summary, visibility; optional description: string, locationId: string, actorId: string.
   - secrets: required text, visibility ("gm-only" only); optional relatedEntityIds: string[].
   - endings: required description; optional title: string, conditions: string[]; visibility is not allowed.
   - unresolved: required code, message; optional relatedEntityId: string, context: string; epistemicStatus is "ambiguous" | "unresolved" only; visibility is not allowed.
   - SceneBranch: required targetSceneId: string, description: string; optional condition: string, optional: boolean.
   - LocationConnection: required targetLocationId: string; optional description: string, travelConditions: string[].
   - Each alternativeSolutions entry requires method: non-empty string and description: non-empty string; optional socialBypassOfCombat: boolean.
   - Do not emit properties absent from the strict schema.
5. Visibility & secrets:
   - Require "visibility": "player-visible" | "gm-only" on locations, actors, factions, scenes, encounters, clues, rumours, items, and secrets only. Do not add visibility to endings or unresolved.
   - Every entry in "secrets" MUST have "visibility": "gm-only".
   - "visibility" applies to the WHOLE record, never to individual fields. Treat every field of a "player-visible" record (name, summary, description, role, motivation, disposition, body, readAloud, reveals and the rest) as safe to show players. v1 cannot hide one field of a visible record.
   - A character, place or item being known to the players does not make its role, hidden motive, allegiance or secret details known. Put only what players can know in the "player-visible" record. Move concealed role, motive or detail into a separate "secrets" entry that lists the record in "relatedEntityIds". Copy source wording; do not invent plot facts to fill the visible record.
   - When a record is only partly shareable and you cannot split it without losing meaning, mark the whole record "gm-only" and add an "unresolved" entry rather than guessing.
   - Do NOT promote NPC testimony, rumours, or in-world handouts to objective truth unless the authored text confirms them.
6. Structural integrity:
   - Every entity ID across all collections must be unique and non-empty.
   - All cross-references (parentLocationId, locationId, factionId, sceneId, targetSceneId, actorIds, placedLocationId, placedActorId, placedSceneId, leadTargetId, relatedEntityIds, relatedEntityId) must point to existing IDs and never self-reference.
   - Location parentLocationId chains must not form cycles.
   - Every non-entry scene with source-supported progression must be reachable via scene branches from scenes[0], with no inescapable mandatory dead-end loops. If progression is unknown, preserve the scene as ambiguous without inventing a branch.
7. Provenance & copyright:
   - Add optional "sourceRef" ({ page?: integer >= 1, pageEnd?: integer >= 1, chapter?: non-empty string, section?: non-empty string, anchor?: non-empty string, textQuote?: non-empty string }) when known.
   - Write concise structured summaries, key dialogue, and room briefs rather than copying large blocks of prose verbatim.
   - Include only authored adventure structure; omit playthrough state or session history.`;

export const PROMPT_TXT_URL =
  "https://codexcryptica.com/adventure-import/prompt.txt";

/** Short instruction copied by "Copy guide link" for assistants that can open URLs. */
export const LINK_HANDOFF_TEXT = `Open ${PROMPT_TXT_URL} (plain text) and follow it exactly to convert the attached adventure into Adventure JSON v1. Reply with the JSON only. If you cannot open the link, tell me instead of guessing the format.`;

export const CORRESPONDENCE_EXTENSION_KEY =
  "codex-cryptica.adventure-correspondence";

export const CORRESPONDENCE_EXTENSION_DOC = `Supplied correspondence (optional):
- When a new version renames, splits, or merges earlier content, carry the evidence in
  "extensions": { "${CORRESPONDENCE_EXTENSION_KEY}": [ { "previousId": string,
  "currentId": string, "collection": string } ] }.
- "collection" must name one of: locations, actors, factions, scenes, encounters,
  clues, rumours, items, secrets, endings, unresolved.
- Both IDs must exist in that collection in the previous and new packages.
- Entries such as { "previousId": "scene-1", "currentId": "scene-1a", "collection": "scenes" }
  pair old and new entities across a rename.
- Several current IDs sharing one previous ID describe a split; several previous IDs
  sharing one current ID describe a merge. Splits and merges are shown grouped and
  stay flagged for the reviewer; they are never silently submitted.
- Identity is never inferred from titles, name similarity, or ordering. An entity with
  a new ID and merely a similar title appears as removed plus added and unresolved.
- Malformed entries, unknown collections or IDs, and entries conflicting with a
  same-ID match are ignored for matching and reported as unresolved.`;

export const VERSIONING_BEHAVIOUR_DOC = `Versioning on re-import:
- Adventure identity is the package "id"; "version" labels that version; exact content
  identity is the canonical package hash.
- Importing the identical canonical package again is a deduplicated no-op: Codex Cryptica
  says it is already imported and writes nothing.
- Importing changed content with the same "id" opens the review as a new version, diffed
  against the previous approved version (same "version" with a different hash first, then
  the highest SemVer). Approving stores it under its own new hash; earlier versions stay
  byte-identical and every version stays individually startable.
- A changed package whose "version" is not greater than its predecessor is still accepted
  as a separate version, with a warning that the version number did not increase.
- Sessions stay pinned to the exact package hash they started with. Removing a version in
  use by a session is refused with a plain explanation.`;

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
    requirement: "Slug (/^[a-zA-Z0-9_-]{3,64}$/)",
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
    meaning: "Follows from nearby source details, but is not stated directly.",
  },
  {
    status: "ambiguous",
    meaning: "The source is unclear or supports conflicting interpretations.",
  },
  {
    status: "unresolved",
    meaning: "The source does not answer this; record it without guessing.",
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
      "A required field is missing, a property is not allowed, or a value does not match its required format or allowed options.",
    fix: 'Ensure all 11 collection arrays are present (even if []), remove extra keys, and verify id and version formats. For an unresolved item, use "ambiguous" if the source is unclear or contradictory, or "unresolved" if it does not provide an answer.',
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
      "A scene with known progression after scenes[0] has no inbound branch path from the opening scene.",
    fix: "Add a source-supported branch from scenes[0] or an intermediate scene. If the source does not establish progression, preserve the scene as ambiguous and do not invent a branch.",
  },
  {
    code: "HIERARCHY_CYCLE",
    cause: "Two or more locations form a loop through parentLocationId.",
    fix: "Break the cycle so location containment forms a strict tree pointing toward top-level regions.",
  },
];
