import {
  ADVENTURE_JSON_REFERENCES,
  ENTITY_COLLECTIONS,
} from "@codex/adventure-engine";
import { CANONICAL_ORIGIN } from "./canonical-origin.js";
import { AUTOMATIC_STAGING_RULES } from "./staged-conversion.js";

export const REFERENCE_ROWS = ADVENTURE_JSON_REFERENCES.map((field) => ({
  path: field.path,
  target:
    field.target === "any" ? "Any entity" : field.allowedTargets.join(", "),
  cardinality: field.cardinality,
  meaning: field.meaning,
}));

export const REFERENCE_RULES = [
  `Any entity means an ID in ${ENTITY_COLLECTIONS.join(", ")}. The package ID is excluded.`,
  "Omit optional links when unsupported. Each item in a repeated field requires a target ID. No link can point to its own record.",
  "alternativeSourceId identifies an alternate source for a clue. leadTargetId is a navigable link; reveals is the proposition the clue supports. For example, leadTargetId can point to the harbour office while reveals says the ledger was altered. If a witness can also supply the clue, alternativeSourceId can identify that witness.",
  "Use summary for concise orientation, description for fuller detail, and scene body for extended scene text. These conventions do not change validation or whole-record visibility.",
  "Use ambiguous for unclear or contradictory source material and unresolved when the source does not answer the question. unresolved.code is an open string. Examples include contradiction, unrepresentable-mechanic, unrepresentable-map, unreadable-pages, and scene-order-unknown. Keep UNKNOWN_SCENE_PROGRESSION for the recognized scene reachability exception.",
] as const;

/**
 * A trimmed, schema-valid answer shown inside the prompt so a model can
 * pattern-match the shape. Exported so tests can prove it stays valid.
 */
export const PROMPT_EXAMPLE_OUTPUT = {
  formatVersion: "adventure-json/v1",
  id: "silent-watchtower",
  title: "The Silent Watchtower",
  version: "1.0.0",
  premise: {
    background: "A hillside watchtower has gone dark.",
    hook: "The Reeve asks the party to relight the beacon.",
  },
  source: { title: "The Silent Watchtower" },
  locations: [
    {
      id: "loc-tower",
      name: "Ridge Watchtower",
      summary: "A stone signal tower above the valley road.",
      visibility: "player-visible",
      epistemicStatus: "explicit",
    },
  ],
  actors: [
    {
      id: "actor-tomas",
      name: "Reeve Tomas",
      summary: "The worried village official who hires the party.",
      role: "Village reeve",
      locationId: "loc-tower",
      visibility: "player-visible",
      epistemicStatus: "explicit",
    },
  ],
  factions: [],
  scenes: [
    {
      id: "scene-beacon",
      title: "The Cold Beacon",
      summary: "The brazier at the top of the tower is unlit.",
      locationId: "loc-tower",
      visibility: "player-visible",
      epistemicStatus: "explicit",
    },
  ],
  encounters: [
    {
      id: "enc-stuck-door",
      title: "The Barred Door",
      description: "The tower door is barred from the inside.",
      alternativeSolutions: [
        {
          method: "Talk",
          description: "Convince the watchman inside to lift the bar.",
        },
      ],
      locationId: "loc-tower",
      visibility: "player-visible",
      epistemicStatus: "explicit",
    },
  ],
  clues: [
    {
      id: "clue-oil-smell",
      text: "The brazier smells of fresh lamp oil.",
      reveals: "Someone tended the beacon recently.",
      placedLocationId: "loc-tower",
      visibility: "player-visible",
      epistemicStatus: "explicit",
    },
  ],
  rumours: [
    {
      id: "rumour-ghost-light",
      text: "A ghost puts the beacon out each night.",
      truth: "false",
      sourceActorId: "actor-tomas",
      visibility: "player-visible",
      epistemicStatus: "explicit",
    },
  ],
  items: [],
  secrets: [
    {
      id: "secret-tomas-motive",
      text: "Tomas put the beacon out himself to hide a smuggling run.",
      relatedEntityIds: ["actor-tomas"],
      visibility: "gm-only",
      epistemicStatus: "explicit",
    },
  ],
  endings: [
    {
      id: "ending-lit",
      description: "The beacon burns again and the caravan passes safely.",
      epistemicStatus: "explicit",
    },
  ],
  unresolved: [
    {
      id: "unresolved-oil",
      code: "missing-detail",
      message: "The source does not say where the lamp oil is kept.",
      epistemicStatus: "unresolved",
    },
  ],
};

const EXAMPLE_JSON = JSON.stringify(PROMPT_EXAMPLE_OUTPUT, null, 2);

export const PROMPT_END_MARKER = "END OF ADVENTURE JSON V1 CONVERSION PROMPT";

export const INCOMPLETE_PROMPT_FALLBACK =
  "Ask the user to select “Copy conversion prompt” on the guide and paste the entire prompt into this chat. Wait for it before making an inventory or generating any chunk. A “Continue” request does not replace the missing prompt.";

export const CANONICAL_CONVERSION_PROMPT = `Convert the tabletop RPG adventure I provide into a valid Codex Cryptica Adventure JSON v1 document.

Schema: ${CANONICAL_ORIGIN}/schemas/adventure-json/v1.json
Guide: ${CANONICAL_ORIGIN}/adventure-import

Before converting, confirm you have this whole prompt, from the opening conversion instruction through the standalone line “${PROMPT_END_MARKER}” after the final checklist. If it is missing or cut off, stop. ${INCOMPLETE_PROMPT_FALLBACK} The complete prompt includes the field contract. If the separate schema URL is unavailable, use that contract without asking the user to paste the schema.

Output contract (read this first):
- Deliver ONE JSON object. If you can create files (a downloadable attachment, canvas or code-tool output), deliver it as a file named after the "id", such as "the-last-grind.json", containing only the JSON, and say only that the file is ready. If you cannot create files, your entire reply is the JSON object: it starts with "{" and ends with "}", with no Markdown code fences and no text before or after it. Never put JSON in a chat reply when you could have attached a file.
- Include all 11 collection arrays, using [] when empty.
- Use only the field names and exact values listed below. Do not add properties.
- Never invent facts. When the source is unclear, record it in "unresolved".
- Never shorten the conversion by dropping or merging entries. If the source is unreadable or inaccessible, name the missing input or page range and ask for readable text or a smaller upload. Never guess.
- If a faithful full conversion will not fit, start staged conversion now. Do not just tell the user to use the staged method.

${AUTOMATIC_STAGING_RULES}

Conversion procedure (do this silently while writing JSON; return the checkpoint when staging needs another turn):
- Inventory the source by section before writing JSON. Track keyed locations, actors, encounters and their resolutions, clues and alternate sources, rumours, important items, and authored endings. Preserve distinct entries and their source references.
- Classify what the source states, what someone in the story claims, and what the GM decides. Use "unverified" when rumour truth is unspecified. Preserve optional routes and conditional actions without turning them into mandatory scene order. Leave unsupported fields out and record material gaps in "unresolved".
- Audit the result against the inventory. Check each player-visible field and premise field for concealed information, and check that each reference points to the right collection and entity. For labelled PDF excerpts, use the original PDF file positions given in the source.

Shape of a valid answer (trimmed: yours will have more entries and fields). Its ids, codes and wording are only illustrative; use your own, taken from the source:
${EXAMPLE_JSON}

Strict output rules:
1. For a successful conversion, return ONLY valid JSON matching Adventure JSON v1 (no Markdown fences, no prose outside the JSON). Keep staging checkpoints and unreadable-source requests separate from all JSON.
2. Top-level fields:
   - Required: "formatVersion": "adventure-json/v1", "id" (/^[a-zA-Z0-9_-]{3,64}$/), "title" (1-200 chars), "version" (strict SemVer, e.g. "1.0.0"), "premise": { "background": string, "hook": string, "theme"?: string[], "tone"?: string }, "source": { "title": string, "authors"?: string[], "publisher"?: string, "publishedDate"?: string, "url"?: string, "license"?: string, "documentHash"?: string (64 lowercase hex chars) }.
   - Optional: "description": string, "system": { "name": string, "targetParty"?: { "sizeMin"?: integer >= 1, "sizeMax"?: integer >= 1, "levelMin"?: integer >= 0, "levelMax"?: integer >= 0 } }.
   - Required 11 collection arrays ([] when empty): "locations", "actors", "factions", "scenes", "encounters", "clues", "rumours", "items", "secrets", "endings", "unresolved".
3. Source certainty (CRITICAL):
   - Every entity requires "epistemicStatus": "explicit" | "inferred" | "ambiguous" | "unresolved".
   - Do not invent missing facts merely to fill fields. Omit optional fields when the source is silent.
   - Use "explicit" only for what the source states. Use "inferred" for anything you worked out yourself (links, endings, roles, unstated consequences).
   - For entries in "unresolved", use "ambiguous" when the source is unclear or contradictory, or "unresolved" when it does not answer the question; never use "explicit" or "inferred".
4. Collection entry contract (? = optional; non-empty strings required for id, name, title, text, description, code, message):
   - Every collection entry requires "id" (non-empty string) and "epistemicStatus"; "sourceRef" is optional.
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
   - Do not emit properties absent from the strict schema. Common slips: encounters use "description" (not "summary"); clues use "placedLocationId" (not "locationId"); rumours use "truth" as a string (not a boolean such as "isTrue").
   - Record named objects the source gives importance (clue objects, handouts, treasure) in "items", and give each "unresolved" entry a specific "code" that describes its own problem.
5. Visibility & secrets:
   - Keep the title, hook, background, and optional description player-safe and limited to source-supported facts; do not put concealed information in these fields.
   - Require "visibility": "player-visible" | "gm-only" on locations, actors, factions, scenes, encounters, clues, rumours, items, and secrets only. Do not add visibility to endings or unresolved. Every entry in "secrets" MUST have "visibility": "gm-only".
   - "visibility" applies to the WHOLE record, never to individual fields. Put only what players can know in a "player-visible" record, and move any concealed role, motive or detail into a separate "secrets" entry that lists the record in "relatedEntityIds". When a record cannot be split cleanly, mark it "gm-only" and add an "unresolved" entry.
   - v1 has no field-level or "revealed later" visibility. A fact players only learn in play (where someone is, what a trigger does, a countdown, how an obstacle can be passed) goes in a "gm-only" secret, clue, scene or encounter, and the GM reveals it during play. Never put such facts in a "player-visible" summary, "conditions" or "alternativeSolutions".
   - Do not over-hide. Keep on the visible record whatever players can learn in play (a stated role, public detail, or harmless goal). Do NOT promote NPC testimony, rumours, or handouts to objective truth unless confirmed by the authored text.
6. Structural integrity:
   - Every entity ID across all collections must be unique and non-empty. Location parentLocationId chains must not form cycles.
${REFERENCE_ROWS.map((row) => `   - ${row.path} → ${row.target} (${row.cardinality}). ${row.meaning}`).join("\n")}
${REFERENCE_RULES.map((rule) => `   - ${rule}`).join("\n")}
   - A non-entry scene (scenes[1..]) is reachable when a breadth-first walk that starts at scenes[0] and follows only branches[].targetSceneId reaches it. A branch from an unreachable scene does not make its target reachable. Make every scene with source-supported progression reachable, with no inescapable mandatory dead-end loops.
   - If the source has no authored order (a sandbox or location-based module), list scenes in source order. An authored scene keeps the "epistemicStatus" its source supports ("explicit" for stated scenes), even when the order of play is left to the players. Add only the branches the source states. For each unreachable non-entry scene, add one "unresolved" entry with "code": "UNKNOWN_SCENE_PROGRESSION" and "relatedEntityId" set to that scene's id. Never mark a scene "ambiguous" only to pass the reachability check. Do not invent a flow or an ending.
   - Four kinds of link: authored scene transitions go in "branches"; geographic or room adjacency goes in "locations[].connections", not "branches"; transitions found during play are not part of the package; links the source does not support are never added.
7. Provenance & copyright:
   - Add "sourceRef" ({ page?: integer >= 1, pageEnd?: integer >= 1, chapter?: non-empty string, section?: non-empty string, anchor?: non-empty string, textQuote?: non-empty string }) wherever known. For a PDF, include "page" (and "pageEnd" when it spans pages) on every entry using the page position in the file, not a number printed on the page.
   - Write concise structured summaries, key dialogue, and room briefs rather than copying large blocks of prose verbatim. Omit playthrough state or session history.
8. Self-audit before returning (do not output this check):
   - Confirm every source section/page, named actor, location, mandatory/optional scene (marked "optional"), missable clue ("alternativeSourceId"), encounter option ("alternativeSolutions"), and intended ending is accounted for, and anything missing, cut or uncertain has an "unresolved" entry naming the source section.
9. Revisions and stable IDs:
   - If an earlier Adventure JSON for the same adventure is supplied, keep its "id" exactly, keep every unchanged entity ID exactly, and raise "version" by SemVer.
   - Add a top-level "extensions" entry "codex-cryptica.adventure-correspondence" (a list of { "previousId", "currentId", "collection" }) only for renames, splits or merges the source clearly supports. Never infer correspondence from names, titles or order, and never put "extensions" inside an entity. If no earlier package is supplied, use "version" "1.0.0" and omit the correspondence extension.
10. Game mechanics and maps:
   - Never add fields outside the v1 schema for stats, DCs, hit points, maps, grids or images, and never put mechanics in "extensions". Keep mechanics only as a short source-grounded paraphrase with "sourceRef" inside "description", "body", "conditions" or "alternativeSolutions[].description", and record any unrepresentable mechanic, stat block or map as an "unresolved" entry naming the source section (never invent values for it).

Sandbox conversion: Put keyed rooms in "locations" and their hazards, opponents and tactical responses in "encounters" or other appropriate collections. Add "scenes" only for authored beats. If any scene outside scenes[0] is unreachable by following branches from scenes[0], keep its source-supported epistemicStatus ("explicit" for authored scenes) and add one "unresolved" entry with "code": "UNKNOWN_SCENE_PROGRESSION" and "relatedEntityId" set to the scene id, rather than inventing links or marking it "ambiguous". A link from another unreachable scene does not make it reachable. Keys, room adjacency and conditional enemy tactics alone do not establish scene progression.

Final visibility audit: Adding a fact to "secrets" is not enough. Check every copy of it across locations, actors, scenes, encounters, clues, summaries, and the premise. Before discovery, a hidden creature, trap, concealed access, or ambush plan must be absent from all player-visible names, text, IDs, and linked details. Preserve discoverable information in a GM-only record until it is revealed. Keep only sensory details or public facts in visible entries. Do not reproduce stat blocks in visible or GM fields; paraphrase the action or consequence and cite an unresolved entry for mechanics the schema cannot represent.

Evidence and citations: Put each source-supported investigative observation in "clues" even when its text also appears in a room description or scene. Preserve where the evidence can be found, and add a revelation only if the source supports it. Do not turn incidental colour into a clue. For paginated sources, cite the page position and heading that describe the entry itself. For unpaginated sources, cite a supported section, anchor or other stable source range; never invent page numbers. For a keyed room, cite its key entry rather than an earlier mention, direction or cross-reference.

Before you reply with a successful conversion, check each of these:
- The result is only the JSON object (as a file, or as your whole reply), with no code fences or commentary.
- All 11 collection arrays are present, every id is unique, and every cross-reference points to an existing id.
- Every "secrets" entry is "gm-only", and no "player-visible" record reveals a hidden role, motive or detail.
- Every entry has "epistemicStatus"; endings and unresolved have no "visibility".
- Nothing outside the schema was added and nothing was invented.

${PROMPT_END_MARKER}`;

/** Follow-up prompt pasted into the same chat after the JSON; its reply stays outside the JSON file. */
export const COVERAGE_REPORT_PROMPT = `Now write a short coverage report for the Adventure JSON you just gave me. Reply in plain text, not JSON. Do not change or re-output the JSON.

Begin with one line, "Previous package:", naming the earlier "id" and "version" if I supplied one, or otherwise saying exactly "No previous package was provided."

Use these four headed lists:
Covered sections: for each source section or page range, the actual JSON entity IDs that cover it and their "sourceRef" anchors (or page and section).
Missing or shortened: the operational details you dropped or cut down, such as triggers and timing, clues, alternate outcomes and consequences, listed under the source section each came from. Section names alone are not enough.
Risky inferences: anything you inferred rather than read in the source.
Left unresolved: contradictions and unknowns, with the source section for each.

A package can pass the schema and import cleanly and still be missing playable detail.

If you are unsure about something, list it under "Missing or shortened" or "Left unresolved". Do not say the conversion is complete unless "Missing or shortened" and "Left unresolved" are both empty. This report stays outside the JSON file.`;

export interface ImportOutcome {
  label: string;
  meaning: string;
  checkedByCodex: boolean;
}

export const IMPORT_OUTCOMES: ImportOutcome[] = [
  {
    label: "(a) Valid JSON",
    meaning: "The file parses as JSON.",
    checkedByCodex: true,
  },
  {
    label: "(b) Importable package",
    meaning:
      "It passes the Adventure JSON v1 schema and the semantic import checks.",
    checkedByCodex: true,
  },
  {
    label: "(c) Faithful, reasonably complete adaptation",
    meaning:
      "Nothing important was left out or changed from your source, and the scenes still carry its triggers, clues, outcomes and consequences, not just every section. Only you and your assistant can judge this.",
    checkedByCodex: false,
  },
];

export const PROMPT_TXT_URL = `${CANONICAL_ORIGIN}/adventure-import/prompt.txt`;

/** Short instruction copied by "Copy guide link" for assistants that can open URLs. */
export const LINK_HANDOFF_TEXT = `Open ${PROMPT_TXT_URL} (plain text) and follow the full prompt to convert the attached adventure into Adventure JSON v1. Check that the fetched prompt ends with the standalone line “${PROMPT_END_MARKER}”. If the link is blocked or the prompt is incomplete, stop. ${INCOMPLETE_PROMPT_FALLBACK}`;

export const CORRESPONDENCE_EXTENSION_KEY =
  "codex-cryptica.adventure-correspondence";

export const CORRESPONDENCE_EXTENSION_DOC = `{
  "extensions": {
    "${CORRESPONDENCE_EXTENSION_KEY}": [
      { "previousId": "scene-stairs", "currentId": "scene-spiral-stair", "collection": "scenes" }
    ]
  }
}

Rules for "${CORRESPONDENCE_EXTENSION_KEY}":
- Place "extensions" at the top level of the package (beside "formatVersion" and "id"), never inside an entity.
- "collection" must be one of the 11 collection names, and both IDs must exist in the previous and new packages.
- Splits (one previousId -> several currentIds) and merges (several previousIds -> one currentId) are shown grouped and stay flagged for review.
- Identity is never inferred from titles, name similarity, or ordering.`;

export interface FidelityRow {
  content: string;
  v1Handling: string;
  converts: "well" | "manual";
}

export const FIDELITY_ROWS: FidelityRow[] = [
  {
    content: "Locations",
    v1Handling:
      "locations, with parentLocationId for nesting and connections for links.",
    converts: "well",
  },
  {
    content: "NPCs",
    v1Handling:
      "actors, with role, motivation, disposition and factionId or locationId.",
    converts: "well",
  },
  {
    content: "Scenes",
    v1Handling: "scenes, with readAloud text and body for the GM.",
    converts: "well",
  },
  {
    content: "Branches",
    v1Handling:
      "scenes[].branches, with targetSceneId and an optional condition.",
    converts: "well",
  },
  {
    content: "Clues",
    v1Handling:
      "clues, with leadTargetId, placedLocationId, placedActorId or placedSceneId, and alternativeSourceId.",
    converts: "well",
  },
  {
    content: "Secrets",
    v1Handling:
      'secrets, always "gm-only", with relatedEntityIds pointing at what they touch.',
    converts: "well",
  },
  {
    content: "Alternative solutions",
    v1Handling:
      "encounters[].alternativeSolutions, each with a method and a description.",
    converts: "well",
  },
  {
    content: "System rules",
    v1Handling:
      "No rules field. Use a short paraphrase in description, body or conditions with sourceRef, and record the rest in unresolved.",
    converts: "manual",
  },
  {
    content: "Stat blocks",
    v1Handling:
      "No stats or HP fields. Keep the creature as an actor and note the stat block in unresolved.",
    converts: "manual",
  },
  {
    content: "Tactical maps",
    v1Handling:
      "No map or grid fields. Use location connections for topology and note the map in unresolved.",
    converts: "manual",
  },
  {
    content: "Layout",
    v1Handling:
      "Boxed read-aloud text goes in readAloud. Page layout and art are not kept.",
    converts: "manual",
  },
];

export interface TroubleshootingError {
  code: string;
  cause: string;
  fix: string;
}

export const TROUBLESHOOTING_ERRORS: TroubleshootingError[] = [
  {
    code: "SCHEMA_VALIDATION_ERROR",
    cause:
      'A required field is missing, a field has the wrong type, an unrecognized key was added, or an "unresolved" item used "explicit" or "inferred".',
    fix: 'Check the field path in the error. Common slips: encounters use "description" (not "summary") and require "alternativeSolutions": []; clues use "placedLocationId" (not "locationId"); rumours use "truth" ("true" | "false" | "partially-true" | "unverified"). For an unresolved item, use "ambiguous" or "unresolved".',
  },
  {
    code: "DUPLICATE_ID",
    cause: "Two or more entities share the same id string.",
    fix: "Give every entity across all 11 collections a globally unique id (e.g. prefix with loc-, actor-, scene-, clue-).",
  },
  {
    code: "UNRESOLVED_REFERENCE / SELF_REFERENCE",
    cause:
      "A reference field (such as locationId, targetSceneId, or relatedEntityIds) points to an ID that does not exist or points to the entity itself.",
    fix: "Ensure every referenced ID exists in the matching collection and no entity references its own ID.",
  },
  {
    code: "LOCATION_CYCLE",
    cause: "Location parentLocationId links form a loop.",
    fix: "Break the parentLocationId cycle so locations form a tree.",
  },
  {
    code: "UNREACHABLE_SCENE / DEAD_END_LOOP",
    cause:
      "A non-entry scene cannot be reached by following branches from scenes[0] and has no UNKNOWN_SCENE_PROGRESSION unresolved entry, or mandatory transitions form a loop with no path to an ending.",
    fix: 'Connect scenes from scenes[0] via branches[].targetSceneId. Add a branch only when the source states it. When the source leaves progression open, add an unresolved entry with code "UNKNOWN_SCENE_PROGRESSION" and relatedEntityId set to that scene, and do not invent a branch.',
  },
  {
    code: "SECRET_VISIBILITY_VIOLATION",
    cause: 'An entry in "secrets" has visibility set to "player-visible".',
    fix: 'Set visibility to "gm-only" on every entry in "secrets".',
  },
];
