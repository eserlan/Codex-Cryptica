import { EXEMPLARS } from "./campaign-generator-exemplars";
import {
  type CampaignGeneratorDefinition,
  type GeneratedDraft,
  type GeneratorId,
  type GeneratorOutput,
  type GeneratorRunRequest,
  SUPPORTED_GENERATOR_IDS,
  UnsupportedGeneratorError,
} from "./campaign-generator-types";
import {
  generateRandomTableLocal,
  parseRandomTableResponse,
} from "./public-random-table";
import { generateShipLocal } from "./public-ship";
import {
  buildLanguagePrompt,
  generateLanguageLocal,
  languageConfig,
} from "./public-language";
import { renderLanguageProfilePrompt } from "./language-profile";
import { generateNewsSheetLocal, newsSheetConfig } from "./public-news-sheet";
import {
  buildDungeonPrompt,
  generateDungeonLocal,
  dungeonConfig,
  type DungeonGeneratorOptions,
} from "./public-dungeon";
import { forGenre } from "./public-dungeon-constants";
import { themeIdToLabel, factionConfig } from "./public-faction-constants";
import { npcThemeConfig } from "./public-npc-constants";
import { isTitleBanned, bannedNamesInstruction } from "./naming-policy";
import { settlementConfig } from "./public-settlement-constants";
import {
  buildAdventurePrompt,
  generateAdventureLocal,
  adventureConfig,
  type AdventureGeneratorOptions,
} from "./public-adventure";
import {
  buildPlotTwistPrompt,
  generatePlotTwistLocal,
  plotTwistConfig,
  type PlotTwistGeneratorOptions,
} from "./public-plot-twist";
import {
  buildQuestPrompt,
  generateQuestLocal,
  questConfig,
  type QuestGeneratorOptions,
} from "./public-quest";
import {
  buildVillainPrompt,
  generateVillainLocal,
  villainConfig,
  type VillainGeneratorOptions,
} from "./public-villain";
import {
  buildWorldPrompt,
  generateWorldLocal,
  type WorldGeneratorOptions,
  worldConfig,
} from "./public-world";
import {
  buildStarSystemPrompt,
  generateStarSystemLocal,
  type StarSystemGeneratorOptions,
  starSystemConfig,
} from "./public-star-system";
import {
  alienRaceConfig,
  buildAlienRacePrompt,
  generateAlienRaceLocal,
  GROUNDED_MODE,
  type AlienRaceGeneratorOptions,
} from "./public-alien-race";
import { templateGuidanceBlock, templateGuidanceInstruction } from "schema";
import { councilVoteConfig } from "./public-council-vote-constants";
import {
  buildSecretSocietyPrompt,
  generateSecretSocietyLocal,
  secretSocietyConfig,
  type SecretSocietyGeneratorOptions,
} from "./public-secret-society";

/**
 * Generator id -> default vault category id.
 *
 * The generator id is a content concept and is NOT the vault category. Only
 * `faction` matches by name; the rest map to distinct categories.
 */
export const GENERATOR_ENTITY_TYPE: Record<GeneratorId, string> = {
  npc: "character",
  faction: "faction",
  settlement: "location",
  "magic-item": "item",
  event: "event",
  ship: "location",
  language: "note",
  "news-sheet": "note",
  dungeon: "location",
  adventure: "note",
  quest: "event",
  villain: "character",
  world: "location",
  "council-vote": "note",
  "secret-society": "faction",
  "star-system": "location",
  // A species, not an individual — creature rather than character.
  "alien-race": "creature",
  "plot-twist": "note",
  "random-table": "table",
};

/** Fallback category used when a mapped category is absent from the campaign. */
export const FALLBACK_CATEGORY = "note";

/**
 * Resolve the vault category for a generator against the campaign's available
 * categories. Falls back to `note` when present, otherwise the first available
 * category, so generation never produces an unknown entity type.
 */
export function resolveEntityType(
  generatorId: GeneratorId,
  availableCategoryIds?: string[],
): string {
  const mapped = GENERATOR_ENTITY_TYPE[generatorId];
  if (!availableCategoryIds || availableCategoryIds.length === 0) return mapped;
  if (availableCategoryIds.includes(mapped)) return mapped;
  if (availableCategoryIds.includes(FALLBACK_CATEGORY))
    return FALLBACK_CATEGORY;
  return availableCategoryIds[0];
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function optionString(
  request: GeneratorRunRequest,
  key: string,
  fallback: string,
): string {
  const value = request.options[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function dungeonOptions(request: GeneratorRunRequest): DungeonGeneratorOptions {
  return {
    themeId: request.themeId || optionString(request, "themeId", "fantasy"),
    purpose: optionString(request, "purpose", ""),
    currentState: optionString(
      request,
      "currentState",
      optionString(request, "status", ""),
    ),
    scale: optionString(request, "scale", ""),
    instruction: request.instructions,
    avoidNames: [
      ...(request.vaultContext?.bannedNames ?? []),
      ...(request.vaultContext?.existingTitles ?? []),
    ],
  };
}

/**
 * Map raw generator output into a transient draft, applying the resolved vault
 * category and preserving template/relationship context and unmatched details.
 */
function mapOutputToDraft(
  generatorId: GeneratorId,
): CampaignGeneratorDefinition["mapOutputToDraft"] {
  return (
    output: GeneratorOutput,
    request: GeneratorRunRequest,
  ): GeneratedDraft => {
    const availableIds = request.vaultContext?.categoryLabels?.map((c) => c.id);
    const contextProvenance: Array<{ id: string; title: string }> = [];
    const seenIds = new Set<string>();
    if (request.vaultContext?.sourceEntity) {
      seenIds.add(request.vaultContext.sourceEntity.id);
      contextProvenance.push({
        id: request.vaultContext.sourceEntity.id,
        title: request.vaultContext.sourceEntity.title,
      });
    }
    if (request.vaultContext?.neighbors?.length) {
      for (const n of request.vaultContext.neighbors) {
        if (!seenIds.has(n.id)) {
          seenIds.add(n.id);
          contextProvenance.push({ id: n.id, title: n.title });
        }
      }
    }

    return {
      title: output.title,
      entityType: resolveEntityType(generatorId, availableIds),
      summary: output.summary,
      lore: output.lore,
      content: output.content,
      labels: [...output.labels],
      sourceGeneratorId: generatorId,
      sourceEntityId: request.sourceEntityId,
      relationshipLabel: request.relationshipLabel,
      connections: output.connections ? [...output.connections] : undefined,
      templateOutline: request.vaultContext?.templateOutline,
      templateApplied: Boolean(
        request.vaultContext?.applyTemplate &&
        request.vaultContext?.templateOutline,
      ),
      unmappedDetails: output.unmappedDetails,
      languageProfile: output.languageProfile,
      languageProfileVersion: output.languageProfileVersion,
      primaryLanguageId: request.vaultContext?.selectedLanguage?.id,
      primaryLanguageTitle: request.vaultContext?.selectedLanguage?.title,
      bodies: output.bodies ? [...output.bodies] : undefined,
      starType: output.starType,
      contextProvenance: contextProvenance.length
        ? contextProvenance
        : undefined,
    };
  };
}

// ---------------------------------------------------------------------------
// Shared prompt helpers
// ---------------------------------------------------------------------------

const SYSTEM_INSTRUCTION =
  "You are a master tabletop RPG game master and worldbuilder. Generate campaign content, grounded in the provided world context, that a GM can use directly at the table. " +
  "Quality bar: write concrete, sensory, specific detail; show through action and example rather than abstract description; give every entity at least one secret or complication and one actionable hook the players can pursue. " +
  'Avoid clichés ("ancient evil", "the chosen one", "a shadowy figure"), purple prose, filler adjectives, modern idioms, and restating the prompt back to the user. ' +
  "Keep the result internally consistent: names, facts, dates, motivations, and relationships must agree across every field and section, with no self-contradictions. " +
  "Return ONLY valid JSON (a single object) with no markdown code fences. In string values, escape newlines as \\n.";

const OUTPUT_SCHEMA = `{
  "title": "string — the entity's name",
  "summary": "string — one vivid sentence",
  "lore": "string — markdown using the requested section headings",
  "labels": ["string — short thematic tags"],
  "connections": [
    { "targetTitle": "string — EXACT title of an entity from the world context above", "relationship": "string — short label, e.g. ally, rival, member of, located in, caused by" }
  ]
}`;

function vaultContextBlock(request: GeneratorRunRequest): string {
  if (request.interaction) return "";
  const ctx = request.vaultContext;
  if (!ctx) return "";
  const lines: string[] = [];
  if (ctx.themeName && ctx.themeId !== "workspace") {
    lines.push(`World Theme: ${ctx.themeName}`);
  }
  if (ctx.currentDate) {
    lines.push(
      `Current campaign date: ${ctx.currentDate}. Place the content at this point in the timeline — no anachronisms and no references to events that have not yet happened.`,
    );
  }
  if (ctx.sourceEntity) {
    const src = ctx.sourceEntity;
    lines.push(
      `\nSource Entity (generate something related to this):\n- ${src.title} (${src.type}): ${src.contentExcerpt || ""}`,
    );
    if (src.loreExcerpt) {
      lines.push(`  Lore: ${src.loreExcerpt}`);
    }
  }
  if (ctx.neighbors.length) {
    lines.push("\nConnected Entities (world context):");
    for (const n of ctx.neighbors) {
      lines.push(
        `- ${n.title} (${n.type}): ${n.contentExcerpt || n.loreExcerpt || ""}`,
      );
    }
  }
  if (ctx.selectedLanguage) {
    const language = ctx.selectedLanguage;
    lines.push(`\nPrimary Language — ${language.title}:`);
    if (language.languageProfile) {
      lines.push(renderLanguageProfilePrompt(language.languageProfile));
    } else {
      lines.push(
        `Legacy readable notes: ${language.loreExcerpt || language.contentExcerpt || ""}`,
      );
    }
    lines.push(
      "Generated names and terminology must visibly follow the supplied rules and examples. Do not invent missing language rules.",
    );
  }
  return lines.join("\n");
}

/**
 * Positive world grounding: a sample of existing vault entities so the model
 * matches the established tone and stays consistent with the campaign. Distinct
 * from the source/neighbor context and the name ban list.
 */
function worldBlock(request: GeneratorRunRequest): string {
  if (request.interaction) return "";
  const ctx = request.vaultContext;
  if (!ctx?.worldSample?.length) return "";
  const lines = [
    "\nExisting entities in this world (match their tone and stay consistent — do not duplicate or contradict them):",
  ];
  for (const e of ctx.worldSample) {
    lines.push(
      `- ${e.title} (${e.type}): ${e.contentExcerpt || e.loreExcerpt || ""}`,
    );
  }
  return lines.join("\n");
}

const SYNTHETIC_RACE_PATTERN =
  /\b(robot|android|synthetic|construct|automaton|drone|ai|artificial intelligence|cyborg|machine)\b/i;

/**
 * When the NPC's preferred race/species reads as non-biological, the default
 * (and any supplied template's) lore categories still assume a biological
 * character — homeworld, birth, lineage. Redirect those categories to their
 * synthetic equivalents instead of leaving the model to either invent
 * biology for a machine or ignore the section.
 */
function syntheticAdaptationNote(request: GeneratorRunRequest): string {
  const race = request.options?.race ?? request.options?.species;
  if (typeof race !== "string" || !SYNTHETIC_RACE_PATTERN.test(race)) {
    return "";
  }
  return `\nThis character is a synthetic/mechanical being (${race}), not a biological one. Wherever a lore section — template-supplied or built-in — would normally call for biological detail (homeworld, birth, family lineage, physiology), reinterpret it in synthetic terms instead: manufacturer/place of manufacture, chassis or frame model, firmware/software version and revision history, installed modules or peripherals, and service/maintenance history. Keep each section's original heading; only its content should be adapted.`;
}

function optionsBlock(request: GeneratorRunRequest): string {
  const entries = Object.entries(request.options).filter(([, v]) => v !== "");
  if (!entries.length) return "";
  return (
    "\nPreferences:\n" + entries.map(([k, v]) => `- ${k}: ${v}`).join("\n")
  );
}

function instructionsBlock(request: GeneratorRunRequest): string {
  const inst = request.instructions?.trim();
  if (!inst) return "";
  const src = request.vaultContext?.sourceEntity;
  const relationalNote = src
    ? ` When this instruction describes a relationship in general terms without naming who it is with (e.g. "its master", "its creator", "its rival", "its owner", "its enemy"), that relationship is with the Source Entity below, "${src.title}", unless a different, explicitly named entity is clearly intended instead.`
    : "";
  return `\n[HIGHEST PRIORITY — User instructions, override defaults]\n${inst}\nThe entity you generate MUST directly depict what this instruction describes. Use the world context below only as supporting background — never substitute a different, better-documented event or subject for the one requested.${relationalNote}\n`;
}

function bannedNamesBlock(request: GeneratorRunRequest): string {
  if (request.interaction) return "";
  const ctx = request.vaultContext;
  const all = [...(ctx?.bannedNames ?? []), ...(ctx?.existingTitles ?? [])];
  const instruction = bannedNamesInstruction(all);
  return instruction ? `\n${instruction}` : "";
}

// Re-exported for existing callers/tests that import isTitleBanned from this
// module — the implementation now lives in naming-policy.ts (see its header
// for why), shared with Oracle chat's /create command.
export { isTitleBanned };

/**
 * Instruct the model to keep the generated name culturally consistent with the
 * world — deriving its linguistic style from the example entities and source
 * context (e.g. Magyar-flavoured names for a Magyar-inspired culture) rather
 * than defaulting to generic, culture-neutral fantasy names.
 */
function namingBlock(request: GeneratorRunRequest): string {
  const ctx = request.vaultContext;
  const hasExamples =
    !!ctx?.sourceEntity || !!ctx?.neighbors.length || !!ctx?.worldSample.length;
  let basis = hasExamples
    ? "Infer the naming style from the example entities and source context above"
    : "Use a consistent naming style appropriate to the world theme";
  if (ctx?.selectedLanguage) {
    basis +=
      " and treat the explicitly selected Primary Language as authoritative for names and terminology";
  }
  return `\nName the entity to match the established naming conventions and cultural/linguistic flavour of this world. ${basis}; do not default to generic, culture-neutral fantasy names.`;
}

/**
 * When a template outline is supplied, instruct the model to shape the "lore"
 * field to match it — mirroring the markdown template a manually-created entity
 * of this type would receive.
 */
function templateBlock(request: GeneratorRunRequest): string {
  if (request.interaction) return "";
  const ctx = request.vaultContext;
  if (!ctx?.applyTemplate || !ctx.templateOutline) return "";
  return `\nStructure the "lore" field using the template guidance below. ${templateGuidanceInstruction("lore")}\n${templateGuidanceBlock(ctx.templateOutline)}\n`;
}

/**
 * Require the model to weave the new entity into the world, and to fill the
 * "connections" array only with entities that actually appear in the context.
 * When a Source Entity is present (the "generate related entity" flow), the
 * relationship to it is mandatory, not merely encouraged — this is what makes
 * the new entity actually related to the thing the user asked to relate it
 * to, rather than a generic addition that happens to share a world.
 */
function groundingNote(request: GeneratorRunRequest): string {
  const ctx = request.vaultContext;
  const src = ctx?.sourceEntity;
  const hasWorld =
    !!src || !!ctx?.neighbors.length || !!ctx?.worldSample.length;
  if (!hasWorld) {
    return `\nThis world has no existing entities yet — leave "connections" as an empty array.`;
  }
  if (src) {
    return `\nGround the entity in the world, with a mandatory, concrete relationship to the Source Entity: mention "${src.title}" by its exact name at least once in "lore" (not just an oblique reference), and include an entry in "connections" with "targetTitle": "${src.title}" whose "relationship" names the specific relationship (e.g. "subordinate of", "created by", "rival of") — never omit this connection. Explain the concrete mechanism of that relationship (technical, social, legal, or otherwise) rather than merely asserting it exists. The new entity must still be clearly distinct from "${src.title}": its own function, personality, agenda, and complication — not a renamed copy or reskin of it. You may reference other entities from the context above too; in "connections", reference only entities that appear in the context above, using their exact titles (never invent a target).`;
  }
  return `\nGround the entity in the world: weave in at least one entity named in the context above, reusing its exact name and the world's established terminology. In "connections", reference only entities that appear in the context above, using their exact titles; omit anything uncertain (an empty array is fine — never invent a target).`;
}

/**
 * Lore guidance that defers to the resolved template when one is present (so the
 * model follows the template's sections rather than a competing generic
 * checklist), and otherwise supplies a per-generator checklist.
 */
function loreGuidance(request: GeneratorRunRequest, builtin: string): string {
  const ctx = request.vaultContext;
  if (ctx?.applyTemplate && ctx.templateOutline) {
    return `Fill every section of the template above with specific, evocative content; keep its exact markdown headings.`;
  }
  return `The "lore" field should include: ${builtin}. Use clear markdown headings.`;
}

/**
 * Compact, illustrative few-shot examples — one per generator — that set the
 * depth, tone, and JSON shape. Newlines inside "lore" are escaped so the model
 * is reinforced to emit valid JSON.
 */

/**
 * The stock exemplars above each hard-code their own "lore" markdown
 * headings, which actively conflict with a supplied template outline's
 * headings (e.g. the NPC exemplar's "## Who She Is" / "## Secret" / "## Hook"
 * next to a template demanding "## Background & Origin" / "## Augmentations
 * & Tech" / etc.) — a real cause of models blending or picking the wrong
 * heading set. When a template is active, show only the JSON shape (title/
 * summary/labels/connections), deferring "lore" entirely to the template
 * instruction so there is exactly one authoritative heading set in the
 * prompt, not two competing ones.
 */
function exemplarBlock(request: GeneratorRunRequest, id: GeneratorId): string {
  const ctx = request.vaultContext;
  if (ctx?.applyTemplate && ctx.templateOutline) {
    return `\nExample shape (illustrative only, for "title"/"summary"/"labels"/"connections" — do NOT reuse these names or details; "lore" must follow the template above, not any headings shown here):\n{"title":"...","summary":"...","lore":"(use the template's exact headings above)","labels":["...","..."],"connections":[{"targetTitle":"...","relationship":"..."}]}\n`;
  }
  return `\nExample (illustrative only — match the world context above and do NOT reuse these names or details):\n${EXEMPLARS[id]}\n`;
}

export { SYSTEM_INSTRUCTION };

// ---------------------------------------------------------------------------
// Generator-specific prompt builders
// ---------------------------------------------------------------------------

/** Shared prompt context chain (everything before the task instruction). */
function contextChain(request: GeneratorRunRequest): string {
  // Preferences (the form's explicit dropdown selections, e.g. race/role) are
  // direct user choices like the free-text instructions above them — surface
  // them right after, ahead of the generic world context, rather than buried
  // several paragraphs down where a model can lose track of them.
  return `${instructionsBlock(request)}${optionsBlock(request)}${vaultContextBlock(request)}${worldBlock(request)}${bannedNamesBlock(request)}${namingBlock(request)}${templateBlock(request)}`;
}

function npcPrompt(request: GeneratorRunRequest): string {
  return `${contextChain(request)}

Generate a campaign NPC. Return ONLY a JSON object matching this schema:
${OUTPUT_SCHEMA}
${exemplarBlock(request, "npc")}${groundingNote(request)}
${syntheticAdaptationNote(request)}
${loreGuidance(request, "who they are, what they want, a secret, and a first-scene hook")}`;
}

function factionPrompt(request: GeneratorRunRequest): string {
  return `${contextChain(request)}

Generate a campaign faction, guild, or organisation. Return ONLY a JSON object matching this schema:
${OUTPUT_SCHEMA}
${exemplarBlock(request, "faction")}${groundingNote(request)}
${loreGuidance(request, "what they control, what they want, internal conflict, and an adventure hook")}`;
}

function settlementPrompt(request: GeneratorRunRequest): string {
  return `${contextChain(request)}

Generate a campaign settlement or location. Return ONLY a JSON object matching this schema:
${OUTPUT_SCHEMA}
${exemplarBlock(request, "settlement")}${groundingNote(request)}
${loreGuidance(request, "points of interest, power structure, notable rumours, and a hook for the players")}`;
}

function magicItemPrompt(request: GeneratorRunRequest): string {
  return `${contextChain(request)}

Generate a campaign magic item or artefact. Return ONLY a JSON object matching this schema:
${OUTPUT_SCHEMA}
${exemplarBlock(request, "magic-item")}${groundingNote(request)}
${loreGuidance(request, "item history, its power/effect, a side effect or curse, and how it might enter play")}`;
}

function eventPrompt(request: GeneratorRunRequest): string {
  return `${contextChain(request)}

Generate a campaign event — a historical or unfolding occurrence in the world. Return ONLY a JSON object matching this schema:
${OUTPUT_SCHEMA}
${exemplarBlock(request, "event")}${groundingNote(request)}
Place it correctly within the world's timeline (consistent with any campaign date and existing events).
${loreGuidance(request, "what happened, its causes, who and what was involved, its consequences, and a hook for the players")}`;
}

function shipPrompt(request: GeneratorRunRequest): string {
  return `${contextChain(request)}

Generate a campaign ship — a traversable vehicle that functions as location, faction asset, and adventure seed. Return ONLY a JSON object matching this schema:
${OUTPUT_SCHEMA}
${exemplarBlock(request, "ship")}${groundingNote(request)}
${loreGuidance(request, "the ship's role and condition, its owner and current mission, its dominant complication, its secret, its key zones, and at least two adventure hooks")}`;
}

function newsSheetPrompt(request: GeneratorRunRequest): string {
  return `${contextChain(request)}

Generate an in-world news sheet — a printable player handout of in-world headlines, short articles, rumours, classifieds, notices, and adverts, written in an in-world editorial voice and grounded in the world context. Return ONLY a JSON object matching this schema:
${OUTPUT_SCHEMA}
${exemplarBlock(request, "news-sheet")}${groundingNote(request)}
The "title" is the publication name plus issue number or in-world date. Everything before the GM Notes section must be player-safe: report events the way the publication's owner and censor would allow, not the way they actually happened.
${loreGuidance(request, "a masthead line with publication name, tagline, and issue metadata; a lead headline story (3-5 sentences); 2-4 short secondary articles; a 'Notices & Classifieds' bullet list; a 'Word on the Street' rumour list; one advert or piece of propaganda; and a final '## GM Notes' section with the truth behind the stories and 1-4 adventure hooks")}`;
}

function languagePrompt(request: GeneratorRunRequest): string {
  const result = buildLanguagePrompt({
    genre: optionString(request, "genre", "Classic Fantasy"),
    tone: optionString(request, "tone", "Lyrical & Vowel-rich"),
    role: optionString(request, "role", "Common Speech"),
    structure: optionString(request, "structure", "Compound Words"),
    context:
      instructionsBlock(request) +
      "\n" +
      vaultContextBlock(request) +
      "\n" +
      optionsBlock(request),
    bannedNames: [
      ...(request.vaultContext?.bannedNames ?? []),
      ...(request.vaultContext?.existingTitles ?? []),
    ],
  });
  return result.userMessage;
}

function randomTablePrompt(request: GeneratorRunRequest): string {
  return `${contextChain(request)}

Generate a campaign random table — a numbered list of thematic encounters, occurrences, or findings. Return ONLY a JSON object matching this schema:
${OUTPUT_SCHEMA}
${exemplarBlock(request, "random-table")}${groundingNote(request)}
${syntheticAdaptationNote(request)}
${loreGuidance(request, "a numbered list of distinct thematic entries with details and hooks")}`;
}

// ---------------------------------------------------------------------------
// Local table-based generators
// ---------------------------------------------------------------------------

/**
 * Race ("ancestry") and role choices for the NPC generator, reusing the
 * same genre-keyed tables the public RPG NPC generator already offers
 * (`npcThemeConfig`) so the two tools agree — a Western game shouldn't
 * offer "Elf" here any more than it does there.
 */
export function npcRacesForTheme(themeId: string): string[] {
  const genre = themeIdToLabel[themeId] ?? "Classic Fantasy";
  return forGenre(npcThemeConfig.ancestries, genre);
}
export function npcRolesForTheme(themeId: string): string[] {
  const genre = themeIdToLabel[themeId] ?? "Classic Fantasy";
  return forGenre(npcThemeConfig.roles, genre);
}
const NPC_RACES = npcRacesForTheme("workspace");
const NPC_ROLES = npcRolesForTheme("workspace");
const NPC_TRAITS = [
  "speaks in measured, deliberate sentences",
  "never removes their worn leather gloves",
  "collects small carved trinkets from every town visited",
  "laughs a beat too late at every joke",
];

/**
 * Faction type choices, reusing `factionConfig.typesByTheme` — the same
 * genre-keyed table the public Faction Generator already uses — so a
 * Western vault offers "Outlaw Gang" instead of "Guild".
 */
export function factionTypesForTheme(themeId: string): string[] {
  const genre = themeIdToLabel[themeId] ?? "Classic Fantasy";
  return forGenre(factionConfig.typesByTheme, genre);
}
const FACTION_TYPES = factionTypesForTheme("workspace");

const FACTION_GOALS = [
  "control the regional trade routes",
  "uncover a buried pre-cataclysm secret",
  "install a sympathetic ruler",
  "purge a rival faction from the city",
];

/**
 * `settlementConfig.sizesByGenre` (public Settlement Generator) uses a
 * shorter genre vocabulary than `themeIdToLabel` ("Western", not
 * "Western / Frontier"; "Horror", not "Vampire / Gothic Noir") — alias
 * the mismatched ones so `forGenre`'s own fallback logic doesn't miss an
 * exact match that actually exists under a different spelling.
 */
const SETTLEMENT_GENRE_ALIASES: Record<string, string> = {
  "Vampire / Gothic Noir": "Horror",
  "Modern Conspiracy": "Modern",
  "Cyberpunk / Corporate": "Cyberpunk",
  "Sci-Fi / Space Opera": "Sci-Fi",
  "Western / Frontier": "Western",
};

/**
 * Settlement type ("size") choices, reusing `settlementConfig.sizesByGenre`
 * so a Sci-Fi vault offers "Station"/"Colony" instead of "Hamlet"/"Fortress".
 */
export function settlementTypesForTheme(themeId: string): string[] {
  const genre = themeIdToLabel[themeId] ?? "Classic Fantasy";
  const settlementGenre = SETTLEMENT_GENRE_ALIASES[genre] ?? genre;
  return forGenre(settlementConfig.sizesByGenre, settlementGenre).map(
    (tier) => tier.name,
  );
}
const SETTLEMENT_TYPES = settlementTypesForTheme("workspace");

const SETTLEMENT_FEATURES = [
  "a crumbling aqueduct still feeding the central well",
  "a market square that never fully closes",
  "a shrine locals leave offerings at each dawn",
  "a harbor choked with half-sunk wrecks",
];

const ITEM_RARITIES = ["Common", "Uncommon", "Rare", "Very Rare", "Legendary"];
const ITEM_KINDS = ["Blade", "Amulet", "Ring", "Staff", "Tome", "Cloak"];
const ITEM_EFFECTS = [
  "hums faintly when an untruth is spoken nearby",
  "grows warm in the presence of the undead",
  "lets the bearer recall one forgotten memory each night",
  "turns aside the first blow of any duel",
];

const EVENT_TYPES = [
  "Battle",
  "Festival",
  "Disaster",
  "Discovery",
  "Ritual",
  "Treaty",
  "Uprising",
  "Betrayal",
];
const EVENT_OUTCOMES = [
  "reshaped the balance of power across the region",
  "left a wound the locals have never forgotten",
  "forged an uneasy alliance between former enemies",
  "uncovered a secret that should have stayed buried",
];

const COUNCIL_VOTE_BODY_TYPES = councilVoteConfig.bodyTypes;

const COUNCIL_VOTE_SIZES = councilVoteConfig.sizes;

const COUNCIL_VOTE_RULES = councilVoteConfig.votingRules;

const COUNCIL_VOTE_SCOPES = councilVoteConfig.scopes;

const COUNCIL_VOTE_TONES = councilVoteConfig.tones;

const COUNCIL_VOTE_ANTAGONIST_INFLUENCE =
  councilVoteConfig.antagonistInfluences;

const COUNCIL_VOTE_ARCHETYPES = councilVoteConfig.archetypes;

const COUNCIL_VOTE_STANCES = councilVoteConfig.stances;

function generateName(): string {
  const prefixes = [
    "Ael",
    "Bran",
    "Cael",
    "Dax",
    "Kael",
    "Morg",
    "Thor",
    "Vael",
  ];
  const suffixes = ["dar", "wen", "ric", "mar", "thas", "gar", "rin", "on"];
  return `${pick(prefixes)}${pick(suffixes)}`;
}

function generateNpc(request: GeneratorRunRequest): GeneratorOutput {
  const name = generateName();
  const themeId = request.themeId || "workspace";
  const race = optionString(request, "race", pick(npcRacesForTheme(themeId)));
  const role = optionString(request, "role", pick(npcRolesForTheme(themeId)));
  const trait = pick(NPC_TRAITS);
  return {
    title: name,
    summary: `${name}, a ${race.toLowerCase()} ${role.toLowerCase()}.`,
    lore: `${name} is a ${race} ${role} who ${trait}.`,
    labels: [race, role],
  };
}

function generateFaction(request: GeneratorRunRequest): GeneratorOutput {
  const themeId = request.themeId || "workspace";
  const type = optionString(
    request,
    "type",
    pick(factionTypesForTheme(themeId)),
  );
  const name = `The ${generateName()} ${type}`;
  const goal = pick(FACTION_GOALS);
  return {
    title: name,
    summary: `${name}, a ${type.toLowerCase()} seeking to ${goal}.`,
    lore: `${name} is a ${type.toLowerCase()} whose chief aim is to ${goal}.`,
    labels: [type],
  };
}

function generateSettlement(request: GeneratorRunRequest): GeneratorOutput {
  const themeId = request.themeId || "workspace";
  const type = optionString(
    request,
    "type",
    pick(settlementTypesForTheme(themeId)),
  );
  const name = generateName();
  const feature = pick(SETTLEMENT_FEATURES);
  return {
    title: name,
    summary: `${name}, a ${type.toLowerCase()} known for ${feature}.`,
    lore: `${name} is a ${type.toLowerCase()}. Its most notable feature is ${feature}.`,
    labels: [type],
  };
}

function generateMagicItem(request: GeneratorRunRequest): GeneratorOutput {
  const rarity = optionString(request, "rarity", pick(ITEM_RARITIES));
  const kind = optionString(request, "kind", pick(ITEM_KINDS));
  const name = `${kind} of ${generateName()}`;
  const effect = pick(ITEM_EFFECTS);
  return {
    title: name,
    summary: `${name}, a ${rarity.toLowerCase()} ${kind.toLowerCase()} that ${effect}.`,
    lore: `${name} is a ${rarity} ${kind.toLowerCase()}. It ${effect}.`,
    labels: [rarity, kind],
  };
}

function generateEvent(request: GeneratorRunRequest): GeneratorOutput {
  const type = optionString(request, "type", pick(EVENT_TYPES));
  const name = `The ${type} of ${generateName()}`;
  const outcome = pick(EVENT_OUTCOMES);
  return {
    title: name,
    summary: `${name}, a ${type.toLowerCase()} that ${outcome}.`,
    lore: `${name} was a ${type.toLowerCase()} that ${outcome}.`,
    labels: [type],
  };
}

function generateShip(request: GeneratorRunRequest): GeneratorOutput {
  const result = generateShipLocal({
    genre: optionString(request, "genre", "Sci-Fi"),
    role: optionString(request, "role", ""),
    scale: optionString(request, "scale", ""),
    condition: optionString(request, "condition", ""),
    tone: optionString(request, "tone", ""),
  });
  return {
    title: result.title,
    summary: result.summary ?? "",
    lore: result.lore,
    content: result.content,
    labels: result.labels,
  };
}

function generateNewsSheet(request: GeneratorRunRequest): GeneratorOutput {
  const result = generateNewsSheetLocal({
    genre: optionString(request, "genre", "Fantasy"),
    tone: optionString(request, "tone", ""),
    bias: optionString(request, "bias", ""),
    hookDensity: optionString(request, "hookDensity", ""),
    placeName: optionString(request, "placeName", ""),
    headlineEvent: optionString(request, "headlineEvent", ""),
  });
  return {
    title: result.title,
    summary: result.summary ?? "",
    lore: result.lore,
    content: result.content,
    labels: result.labels,
  };
}

function generateLanguage(request: GeneratorRunRequest): GeneratorOutput {
  const result = generateLanguageLocal({
    genre: optionString(request, "genre", "Classic Fantasy"),
    tone: optionString(request, "tone", "Lyrical & Vowel-rich"),
    role: optionString(request, "role", "Common Speech"),
    structure: optionString(request, "structure", "Compound Words"),
    context: optionString(request, "context", ""),
  });
  return {
    title: result.title,
    summary: result.summary || "",
    lore: result.lore,
    content: result.content,
    labels: result.labels,
    languageProfile: result.languageProfile,
    languageProfileVersion: result.languageProfileVersion,
  };
}

function generateDungeon(request: GeneratorRunRequest): GeneratorOutput {
  const result = generateDungeonLocal(dungeonOptions(request));
  return {
    title: result.title,
    summary: result.summary || "",
    lore: result.lore,
    content: result.content,
    labels: result.labels,
  };
}

export function buildCampaignDungeonPrompt(request: GeneratorRunRequest) {
  const options = dungeonOptions(request);
  const prompt = buildDungeonPrompt(options);
  return {
    ...prompt,
    options,
    userMessage: `${contextChain(request)}

${prompt.userMessage}`,
  };
}

function dungeonPrompt(request: GeneratorRunRequest): string {
  return buildCampaignDungeonPrompt(request).userMessage;
}

// ---------------------------------------------------------------------------
// Adventure generator helpers
// ---------------------------------------------------------------------------

function adventureOptions(
  request: GeneratorRunRequest,
): AdventureGeneratorOptions {
  return {
    themeId: request.themeId || optionString(request, "themeId", "fantasy"),
    archetype: optionString(request, "archetype", ""),
    scale: optionString(request, "scale", ""),
    tone: optionString(request, "tone", ""),
    seed: optionString(request, "seed", ""),
    instruction: request.instructions,
    avoidNames: [
      ...(request.vaultContext?.bannedNames ?? []),
      ...(request.vaultContext?.existingTitles ?? []),
    ],
  };
}

function generateAdventure(request: GeneratorRunRequest): GeneratorOutput {
  const result = generateAdventureLocal(adventureOptions(request));
  return {
    title: result.title,
    summary: result.summary || "",
    lore: result.lore,
    content: result.content,
    labels: result.labels,
  };
}

export function buildCampaignAdventurePrompt(request: GeneratorRunRequest) {
  const options = adventureOptions(request);
  const prompt = buildAdventurePrompt(options);
  return {
    ...prompt,
    options,
    userMessage: `${contextChain(request)}

${prompt.userMessage}`,
  };
}

function adventurePrompt(request: GeneratorRunRequest): string {
  return buildCampaignAdventurePrompt(request).userMessage;
}

function questOptions(request: GeneratorRunRequest): QuestGeneratorOptions {
  return {
    genre: optionString(
      request,
      "genre",
      themeIdToLabel[request.themeId] ?? "Classic Fantasy",
    ),
    tone: optionString(request, "tone", ""),
    scope: optionString(request, "scope", ""),
    locationType: optionString(request, "locationType", ""),
    threat: optionString(request, "threat", ""),
    twist: optionString(request, "twist", ""),
    reward: optionString(request, "reward", ""),
    campaignContext: request.instructions?.trim() || undefined,
  };
}

function generateQuest(request: GeneratorRunRequest): GeneratorOutput {
  const result = generateQuestLocal(questOptions(request));
  return {
    title: result.title,
    summary: result.summary ?? "",
    lore: result.lore,
    content: result.content,
    labels: result.labels,
  };
}

function questPrompt(request: GeneratorRunRequest): string {
  const prompt = buildQuestPrompt(questOptions(request), contextChain(request));
  return `${prompt.systemInstruction}\n\n${prompt.userMessage}`;
}

function villainOptions(request: GeneratorRunRequest): VillainGeneratorOptions {
  return {
    genre: optionString(
      request,
      "genre",
      themeIdToLabel[request.themeId] ?? "Classic Fantasy",
    ),
    tone: optionString(request, "tone", ""),
    threatScale: optionString(request, "threatScale", ""),
    archetype: optionString(request, "archetype", ""),
    sympathy: optionString(request, "sympathy", ""),
    worldRelation: optionString(request, "worldRelation", ""),
    campaignContext: request.instructions?.trim() || undefined,
  };
}

function generateVillain(request: GeneratorRunRequest): GeneratorOutput {
  const result = generateVillainLocal(villainOptions(request));
  return {
    title: result.title,
    summary: result.summary ?? "",
    lore: result.lore,
    content: result.content,
    labels: result.labels,
  };
}

function villainPrompt(request: GeneratorRunRequest): string {
  const prompt = buildVillainPrompt(
    villainOptions(request),
    contextChain(request),
  );
  return `${prompt.systemInstruction}\n\n${prompt.userMessage}`;
}

function plotTwistOptions(
  request: GeneratorRunRequest,
): PlotTwistGeneratorOptions {
  const sourceEntity = request.vaultContext?.sourceEntity;
  const sourcePremise = sourceEntity
    ? [sourceEntity.title, sourceEntity.contentExcerpt.slice(0, 600).trim()]
        .filter(Boolean)
        .join(": ")
    : "";
  return {
    premise: optionString(
      request,
      "premise",
      sourcePremise || request.instructions || "",
    ),
    themeId: request.themeId || optionString(request, "themeId", "workspace"),
    twistType: optionString(request, "twistType", "Random"),
    impact: optionString(request, "impact", "Significant"),
    timing: optionString(request, "timing", "Any"),
    foreshadowing: optionString(request, "foreshadowing", "Surprise me"),
    constraints: optionString(request, "constraints", ""),
    avoidNames: [
      ...(request.vaultContext?.bannedNames ?? []),
      ...(request.vaultContext?.existingTitles ?? []),
    ],
  };
}

function generatePlotTwist(request: GeneratorRunRequest): GeneratorOutput {
  const result = generatePlotTwistLocal(plotTwistOptions(request));
  return {
    title: result.title,
    summary: result.summary ?? "",
    lore: result.lore,
    content: result.content,
    labels: result.labels,
  };
}

function plotTwistPrompt(request: GeneratorRunRequest): string {
  const options = plotTwistOptions(request);
  const prompt = buildPlotTwistPrompt(options);
  return `${contextChain(request)}

${prompt.systemInstruction}

Generate a campaign plot twist or complication. Return ONLY a JSON object matching this schema:
${OUTPUT_SCHEMA}
${exemplarBlock(request, "plot-twist")}${groundingNote(request)}
${loreGuidance(request, "the reveal, the overturned assumption, why it makes sense, foreshadowing, immediate consequences, and new player choices")}
The complete six-section player-facing document belongs in the "content" field; keep "lore" concise and GM-facing.
${prompt.userMessage}`;
}

function worldOptions(request: GeneratorRunRequest): WorldGeneratorOptions {
  return {
    worldType: optionString(request, "worldType", ""),
    habitability: optionString(request, "habitability", ""),
    civilisation: optionString(request, "civilisation", ""),
    societalModel: optionString(request, "societalModel", ""),
    worldTagOne: optionString(request, "worldTagOne", ""),
    worldTagTwo: optionString(request, "worldTagTwo", ""),
    genre: optionString(request, "genre", ""),
    lancerWorldFrame: optionString(request, "lancerWorldFrame", ""),
    campaignPressure: optionString(request, "campaignPressure", ""),
    dominantFeature: optionString(request, "dominantFeature", ""),
    avoidNames: [
      ...(request.vaultContext?.bannedNames ?? []),
      ...(request.vaultContext?.existingTitles ?? []),
    ],
  };
}

function generateWorld(request: GeneratorRunRequest): GeneratorOutput {
  const result = generateWorldLocal(worldOptions(request));
  return {
    title: result.title,
    summary: result.summary ?? "",
    content: result.content,
    lore: result.lore,
    labels: result.labels,
  };
}

function worldPrompt(request: GeneratorRunRequest): string {
  return `${contextChain(request)}

${buildWorldPrompt(worldOptions(request)).userMessage}

Return ONLY a JSON object matching this shared schema:
${OUTPUT_SCHEMA}
${exemplarBlock(request, "world")}${groundingNote(request)}
${loreGuidance(
  request,
  "the world profile; climate, geography, gravity, atmosphere, and biosphere; settlements, cultures, factions, economy, resources, technology, hazards, history, notable locations, mysteries, conflicts, and adventure hooks",
)}`;
}

// ---------------------------------------------------------------------------
// Star System generator helpers
// ---------------------------------------------------------------------------

function starSystemOptions(
  request: GeneratorRunRequest,
): StarSystemGeneratorOptions {
  return {
    systemType: optionString(request, "systemType", ""),
    genre: optionString(request, "genre", ""),
    civilisationLevel: optionString(request, "civilisationLevel", ""),
    systemCharacter: optionString(request, "systemCharacter", ""),
    scientificRealism: optionString(request, "scientificRealism", ""),
    avoidNames: [
      ...(request.vaultContext?.bannedNames ?? []),
      ...(request.vaultContext?.existingTitles ?? []),
    ],
  };
}

function generateStarSystem(request: GeneratorRunRequest): GeneratorOutput {
  const result = generateStarSystemLocal(starSystemOptions(request));
  return {
    title: result.title,
    summary: result.summary ?? "",
    content: result.content,
    lore: result.lore,
    labels: result.labels,
    bodies: result.bodies,
    starType: result.starType,
  };
}

// ---------------------------------------------------------------------------
// Alien Race generator helpers
// ---------------------------------------------------------------------------

function alienRaceOptions(
  request: GeneratorRunRequest,
): AlienRaceGeneratorOptions {
  return {
    genre: optionString(request, "genre", ""),
    generationMode: optionString(request, "generationMode", ""),
    homeEnvironment: optionString(request, "homeEnvironment", ""),
    bodyPlan: optionString(request, "bodyPlan", ""),
    psychology: optionString(request, "psychology", ""),
    socialOrganisation: optionString(request, "socialOrganisation", ""),
    technologyLevel: optionString(request, "technologyLevel", ""),
    relationToOutsiders: optionString(request, "relationToOutsiders", ""),
    avoidNames: [
      ...(request.vaultContext?.bannedNames ?? []),
      ...(request.vaultContext?.existingTitles ?? []),
    ],
  };
}

function generateAlienRace(request: GeneratorRunRequest): GeneratorOutput {
  const result = generateAlienRaceLocal(alienRaceOptions(request));
  return {
    title: result.title,
    summary: result.summary ?? "",
    content: result.content,
    lore: result.lore,
    labels: result.labels,
  };
}

function alienRacePrompt(request: GeneratorRunRequest): string {
  return `${contextChain(request)}

${buildAlienRacePrompt(alienRaceOptions(request)).userMessage}

Return ONLY a JSON object matching this shared schema:
${OUTPUT_SCHEMA}
${exemplarBlock(request, "alien-race")}${groundingNote(request)}
${loreGuidance(
  request,
  "the species overview; its evolutionary origin; homeworld and environment; biology and lifecycle; senses, communication and psychology; culture and social structure; technology; beliefs; relations with outsiders; internal factions; weaknesses and constraints; naming conventions; typical archetypes; and adventure hooks",
)}`;
}

function starSystemPrompt(request: GeneratorRunRequest): string {
  return `${contextChain(request)}

${buildStarSystemPrompt(starSystemOptions(request)).userMessage}

Return ONLY a JSON object matching this shared schema:
${OUTPUT_SCHEMA}
${exemplarBlock(request, "star-system")}${groundingNote(request)}
${loreGuidance(
  request,
  "the core concept; the star(s); 3-12 major bodies; settlements and factions; resources and strategic importance; travel hazards; history; the system-wide conflict or mystery; and adventure hooks",
)}`;
}

// ---------------------------------------------------------------------------
// Council Vote generator helpers
// ---------------------------------------------------------------------------

function councilVoteSize(request: GeneratorRunRequest): number {
  const raw = optionString(request, "councilSize", "5");
  return COUNCIL_VOTE_SIZES.includes(raw) ? Number(raw) : 5;
}

function generateCouncilVote(request: GeneratorRunRequest): GeneratorOutput {
  const bodyType = optionString(
    request,
    "governingBodyType",
    pick(COUNCIL_VOTE_BODY_TYPES),
  );
  const size = councilVoteSize(request);
  const rule = optionString(request, "votingRule", pick(COUNCIL_VOTE_RULES));
  const deadline = optionString(request, "deadline", "before the week is out");
  const proposal = optionString(
    request,
    "proposal",
    "a contested proposal that will reshape the region",
  );
  const antagonistInfluence = optionString(
    request,
    "antagonistInfluence",
    pick(COUNCIL_VOTE_ANTAGONIST_INFLUENCE),
  );
  const scope = optionString(request, "scope", pick(COUNCIL_VOTE_SCOPES));
  const tone = optionString(request, "tone", pick(COUNCIL_VOTE_TONES));

  const members = Array.from({ length: size }, () => ({
    name: generateName(),
    archetype: pick(COUNCIL_VOTE_ARCHETYPES),
    stance: pick(COUNCIL_VOTE_STANCES),
  }));
  const memberLines = members
    .map(
      (m) => `- **${m.name}** (${m.archetype}) — Initial stance: ${m.stance}.`,
    )
    .join("\n");

  const title = `The Vote of the ${bodyType}`;
  const summary = `A ${tone.toLowerCase()} ${size}-seat ${bodyType.toLowerCase()} must decide on ${proposal} ${deadline}.`;
  const lore = `## The Proposal
${proposal}
## Deadline & Stakes
The vote must be called ${deadline}. Failure leaves the party's aims unresolved and cedes ground to their rivals.
## Voting Rule
${rule}, ${size} seats.
## Scope
${scope}.
## Council Members
${memberLines}
## Antagonist Influence
${
  antagonistInfluence === "None"
    ? "No hostile hand is on the scale — yet."
    : `Antagonist influence over the council is ${antagonistInfluence.toLowerCase()}.`
}
## Investigation Leads
Each councillor's public reputation hides a private agenda; asking around the ${bodyType.toLowerCase()}'s usual haunts is the fastest way to learn who can be swayed and how.
## Possible Paths
At least two coalitions of votes can carry the proposal — persuasion and evidence for the cautious, leverage and favours for the desperate. The costly best solution: win every seat outright, but only by spending every favour and secret in hand — the vote passes clean, and the party leaves owing debts, and making enemies, they cannot yet see the price of.`;

  return {
    title,
    summary,
    lore,
    labels: [bodyType, rule, `${size}-seat`, tone],
  };
}

// Four-pass AI generation (#2033/#2034): foundation, foundation-repair,
// paths, paths-repair — each a turn on the same chat session. The two repair
// turns exist because two different real samples caught defects a later
// pass couldn't see coming: pass 1 once established a persuasion condition
// that was itself an amendment for an objective requiring the proposal
// unchanged, and pass 2 (correctly, per its own rules) used that exact
// condition and inherited the defect; separately, pass 2 once invented a
// dependency link between two councillors that was never established. Each
// repair proofreads the pass immediately before it, before the next pass
// ever builds on it — fixing after the fact would let the next pass inherit
// whatever the repair fixed. See generateCouncilVoteWithAI() in
// campaign-generator-service.ts for the orchestration and
// public-council-vote.ts for the sibling public-surface version this
// mirrors.

const COUNCIL_VOTE_FOUNDATION_SCHEMA = `{
  "title": "string — the entity's name",
  "summary": "string — one vivid sentence",
  "lore": "string — markdown using EXACTLY the section headings requested below, in that order, and no others",
  "labels": ["string — short thematic tags"],
  "connections": [
    { "targetTitle": "string — EXACT title of an entity from the world context above", "relationship": "string — short label, e.g. ally, rival, member of, located in, caused by" }
  ]
}`;

export function councilVoteFoundationPrompt(
  request: GeneratorRunRequest,
): string {
  const size = councilVoteSize(request);
  return `${contextChain(request)}

Generate the FOUNDATION of a Council Vote political quest: the party must secure enough votes on a council before an urgent decision is made. Instead of persuading a single ruler, the objective is divided among ${size} named voters with different motives, alliances, secrets, and demands. This is step one of two — a second step will build the possible paths to victory afterward, treating everything you establish here as fixed, unchangeable fact. Do NOT write "Possible Paths" or "Follow-Up Hooks" yet; those come later. Return ONLY a JSON object matching this schema:
${COUNCIL_VOTE_FOUNDATION_SCHEMA}
${exemplarBlock(request, "council-vote")}${groundingNote(request)}
${loreGuidance(
  request,
  `these sections, in this order, and no others: the proposal being voted on and why the party needs it to pass; the deadline and reason for urgency; the voting procedure, threshold, and any exploitable procedural rules (if a veto, recusal, abstention, verification, or amendment mechanism exists, state it explicitly); the current best estimate of the vote, arithmetically consistent with the stances given below; exactly ${size} named council members — each with a role, personality, and public reputation; their public position on the proposal; their true priorities, fears, and political agenda; an initial voting stance (support, oppose, leaning, or unknown) identical everywhere it appears; relationships and dependencies with other councillors, each naming a real fellow councillor and stated in only one direction; what could genuinely persuade them; a related investigation, favour, quest, or problem; secrets, leverage, or corruption that may be uncovered; the moral or political cost of securing their vote; initial leads for learning how each councillor may vote; any faction actively bribing, coercing, monitoring, or retaliating against the party (only say there is no antagonist if none is described anywhere else in this content). The archetype implied by each councillor's role must be consistent with their actual described behavior — do not describe a councillor who follows no one and has no dependency as a loyal follower type. This is a political puzzle, not a sequence of mandatory fetch quests: give most voters multiple viable approaches with different costs, and never let the roster alone guarantee a majority.`,
)}
Before drafting anything else, fix the party's exact objective — the specific proposal outcome that would satisfy the party — and hold it immutable: state it clearly, since step two must never contradict it or introduce an amendment if it requires the proposal to pass unchanged.
Write every section as scene-appropriate prose. Do not restate the wording of these instructions verbatim in the output, and never include prompt instructions, placeholder-name mapping notes, or any other meta-commentary about how the piece was generated.
Before returning, double-check: every councillor's stance is identical everywhere it appears; the vote estimate tally is arithmetically correct for ${size} seats; every dependency names a real councillor from this same roster in only one direction; and the antagonist section does not contradict any antagonist action described elsewhere in this content. Fix any mismatch before responding.`;
}

export function councilVoteFoundationRepairPrompt(): string {
  return `Before continuing, proofread and repair the scenario you just wrote above — do not write a new one, only fix what's broken, and return the complete corrected JSON object in the exact same schema, with every field present, not just the parts you changed.
Check specifically:
1. If the objective established above requires the proposal to pass strictly unchanged, no councillor's persuasion condition may itself function as an amendment, exemption, rider, sunset clause, or substitute proposal. If any councillor's persuasion condition is shaped this way (grants an exemption, alters an implementation term, carves out a special treatment), rewrite it to something that persuades without altering the proposal's terms — a bribe, evidence, a favour, a threat, a service, or exposing a secret.
2. The antagonist section must name any faction actively bribing, coercing, monitoring, or retaliating against the party that is described anywhere else in this content — including inside a councillor's true agenda or secret/leverage. If such a faction exists and the antagonist section says "None" or doesn't name it, correct that section to name it.
3. Re-confirm every councillor's stance is identical everywhere it appears, the vote estimate tally is arithmetically correct, and every dependency names a real councillor from the roster in only one direction.
4. If the voting procedure establishes an absence or recusal mechanism that lowers the threshold, verify the resulting threshold is stated and mathematically correct. Explicitly define whether ballots are secret, public, or convert to a recorded division under a stated procedure — do not leave the ballot type ambiguous.
5. Ensure every persuasion condition that requires evidence has a corresponding investigation lead describing how to obtain it. Ensure the stated objective does not claim to resolve a harm that is inherent to the proposal itself passing unchanged — if the proposal still causes that harm even when it passes exactly as written, the objective must not claim the harm is resolved.
6. Every councillor's name must fit this world's established genre and setting — do not use a name whose style clashes with it (e.g. a modern surname in a fantasy world, or a medieval-fantasy name in a sci-fi or cyberpunk world). If any name doesn't fit, rename that entity, keeping the change consistent everywhere the name appears in this content.
If nothing needs fixing, return the scenario exactly as it was.
Return ONLY the JSON object.`;
}

const COUNCIL_VOTE_PATHS_SCHEMA = `{
  "possiblePaths": "string — '### Possible Paths' markdown, ordered smallest to largest: the smallest viable coalition that clears the threshold, then at least one broader or riskier alternative, then a distinct costly best solution last.",
  "followUpHooks": "string — '### Follow-Up Hooks' markdown."
}`;

export function councilVotePathsPrompt(): string {
  return `Now write ONLY the "### Possible Paths" and "### Follow-Up Hooks" sections that build on the Council Vote scenario you generated above. Treat everything already established there — the objective, the voting procedure, every councillor's stance, motive, secret, and dependency, the current vote estimate, and the antagonist influence — as fixed, unchangeable fact. Do not invent a new roster, restate the scenario, or write anything else. Return ONLY a JSON object matching this schema:
${COUNCIL_VOTE_PATHS_SCHEMA}
Follow these rules when writing the paths:
1. Treat each councillor's initial stance, motive, and dependency exactly as established above — do not alter, invent, or omit any of it. Every path must explain exactly how a specific councillor's vote changes from that stance, and the tally must be recalculated from those changes under the established voting procedure. Never describe the party spending effort on, or in any way endangering or risking, a councillor whose vote is already secured. If the current vote estimate already projects enough votes to clear the threshold, the smallest viable coalition must stabilize the fragile or leaning supporters already in place, or secure one backup vote against defection — not construct an entirely new coalition or target councillors whose support isn't needed to win. Within every path, clearly distinguish the votes actually required to clear the threshold from any extra "insurance" vote pursued purely as a hedge against defection — never present an insurance vote as required.
2. No path may describe a veto-holder as simply outvoted, and no path may invent or use a recusal, abstention, verification, amendment, threshold, removal, arrest, or absence mechanism that the established voting procedure does not itself explicitly define.
3. Account for ballot secrecy: persuasion, bribery, or coercion yields only an expected vote unless the voting procedure states an explicit verification mechanism — under a secret or unverified ballot, present every path's outcome as a projection, distinct from the actual final ballot, in every path equally, not only some, and never describe a projected vote as "locked in."
4. If the established objective requires the proposal to pass unchanged, no path — including the costly best solution — may introduce an amendment, sunset clause, substitute proposal, rider, exemption, or altered implementation term, even one framed as a separate programme that functionally changes how the proposal applies. Any councillor whose demand requires such a change stays unavailable for genuine persuasion in every path.
5. Only use dependencies exactly as established above — never invent a dependency link between councillors that wasn't stated, never reverse the direction of one that was, and never let its effect exceed exactly what it describes (a dependency that says a councillor's price or stance "shifts" is not license to assume they copy another councillor's vote outright). If a path changes the vote of a councillor another one depends on, it must state what that dependent councillor does as a result — none left dangling. If any investigation lead described in a path could plausibly trigger a procedural rule from the established voting procedure (such as a delay or a point of order), account for that risk explicitly.
6. The costly best solution is the least harmful viable route that fully resolves the central dilemma — not simply the largest coalition or the most votes. It must persuade each targeted councillor only through the exact condition already established for them (never a substitute condition or unrelated evidence), and its cost must be a genuine, lasting political, moral, financial, or strategic consequence required to fully resolve the dilemma — not a manufactured one and not merely time or resources spent investigating. Do not sacrifice an uninvolved party's interests, force unanimity, or endanger an already-secured vote beyond what the objective actually requires.
7. Write every section as scene-appropriate prose. Do not restate the wording of these rules verbatim in the output, and never include prompt instructions, placeholder-name mapping notes, or any other meta-commentary about how the piece was generated.
Before returning, simulate the vote from start to finish and check every path against the rules above: list the final vote of every councillor per path, seat by seat, including councillors the path did not target — an untargeted councillor's vote carries over unchanged from their established stance unless the path explains why it moved — then recalculate the tally against the established threshold and double-check the arithmetic; confirm no path relies on an unexplained vote change, ignores an opposing or abstaining councillor, endangers an already-secured vote, violates ballot secrecy in any path, or invents or uses a procedural mechanism not established above; confirm every dependency used is one that was actually established above, in the direction it was defined, with an effect no larger than what it describes; confirm the smallest viable coalition targets only councillors whose support is actually needed to clear the threshold, and that any extra vote is clearly marked as insurance, not required; confirm no path — including the costly best solution — alters the proposal itself if the objective requires it to pass unchanged; confirm the costly best solution persuades each targeted councillor only through their exact established condition and that its cost is a lasting consequence, not merely time or resources spent; confirm "Possible Paths" is ordered smallest viable coalition, then broader/riskier alternative, then the costly best solution; confirm "Antagonist Influence" is not contradicted by anything described in these new sections; and confirm the output contains no prompt instructions, placeholder-name notes, or generation commentary. Fix any mismatch before responding.`;
}

export function councilVotePathsRepairPrompt(): string {
  return `Before continuing, proofread and repair the "Possible Paths" and "Follow-Up Hooks" you just wrote above — do not write new paths, only fix what's broken, and return the complete corrected JSON object in the exact same schema, with every field present, not just the parts you changed.
Check specifically:
1. Every dependency used across the paths is one that was actually established in the scenario above, used in the direction it was defined, with an effect no larger than what it describes. If any path invented a dependency link that was never stated, or reversed one that was, remove or correct it — including removing any vote change that only happened because of the invented dependency. If a councillor has their own specific persuasion condition stated in the scenario above, a path must use that condition directly to flip their vote rather than defaulting to a looser dependency-based trigger — a dependency may substitute for a councillor's own condition only if the path explains why their own condition is unavailable or impractical in that path.
2. No path uses a recusal, abstention, verification, amendment, threshold, removal, arrest, or absence mechanism that the established voting procedure does not itself explicitly define — including a hedge like "or abstains" presented as a live possibility.
3. Each targeted councillor is persuaded only through their exact established condition or their established secret/leverage — never a substitute condition or unrelated evidence.
4. No path — including the costly best solution — alters the proposal itself if the objective established above requires it to pass unchanged.
5. Recount exactly how many additional votes are needed beyond the current baseline to clear the threshold (threshold minus the votes already secured on the required side of the estimate). The smallest viable coalition must target exactly that many councillors — no more. Delete any additional target beyond that count, and delete all insurance votes from the smallest viable coalition entirely; an insurance/backup vote belongs only in the broader alternative, never the smallest coalition.
6. The costly best solution must pursue the least coercive coalition sufficient to fully resolve the dilemma, not the largest, most coercive, or most unanimous one available — it may not seek unanimity unless unanimity itself produces a concrete benefit unavailable from a simple majority (state that benefit explicitly if unanimity is used). It may not target more councillors than the recounted minimum from rule 5 without a stated reason specific to fully resolving the dilemma (not just "extra margin," which belongs in the broader alternative instead) — and it specifically may not target a councillor whose vote is already secured just to manufacture the appearance of a cost; padding an otherwise-identical coalition with a needless action on an already-secured councillor is exactly the "manufactured" cost this rule already forbids. If removing such padding would leave this path identical to another path in targets and outcome, delete the padding rather than keep it as filler, and see rule 8. If the proposal itself causes an unavoidable harm even when it passes exactly as written, the best solution must mitigate that harm through a separate, lawful action described in the path — not by implying the vote itself resolves it.
7. Every path's stated tally summary (however many are Support/Oppose/Abstain/etc.) must exactly equal the literal sum of that same path's own seat-by-seat breakdown — recount the breakdown digit by digit and correct the summary line if it doesn't match, even if the mismatch is just a stale total left over from a different path. Separately, no path may count an "Unknown" or otherwise unconfirmed councillor toward the required total, even if a dependency nudges their disposition — a dependency altering someone's mood is not the same as securing their vote. If a path's own recounted breakdown doesn't actually clear the threshold, either add a direct action that secures the additional vote or rewrite the path's conclusion to match what the breakdown actually shows.
8. The three paths must be materially different from each other in their targeted councillors or their methodology. If the costly best solution (or any other path) targets the identical councillors through identical actions as another path, with only a cost paragraph appended, rewrite it with a genuinely distinct approach or targets — or, if the same targets truly are the least coercive option available, make the cost and methodology description reflect something the smallest coalition's own narration doesn't already say.
If nothing needs fixing, return the paths exactly as they were.
Return ONLY the JSON object.`;
}

function generateSecretSociety(request: GeneratorRunRequest): GeneratorOutput {
  const output = generateSecretSocietyLocal(
    request.options as SecretSocietyGeneratorOptions,
  );
  return {
    title: output.title,
    summary: output.summary ?? "",
    content: output.content,
    lore: output.lore,
    labels: output.labels,
  };
}

function secretSocietyPrompt(request: GeneratorRunRequest): string {
  const { systemInstruction, userMessage } = buildSecretSocietyPrompt(
    request.options as SecretSocietyGeneratorOptions,
    contextChain(request),
  );
  return `${systemInstruction}\n\n${userMessage}`;
}

const REGISTRY: Record<GeneratorId, CampaignGeneratorDefinition> = {
  npc: {
    id: "npc",
    label: "NPC",
    description: "Generate a non-player character for your campaign.",
    entityType: GENERATOR_ENTITY_TYPE.npc,
    defaultInstruction:
      "A distinctive supporting character with a clear motivation, a memorable quirk, and a secret the party could uncover.",
    icon: "lucide:user",
    options: [
      {
        id: "race",
        label: "Race",
        control: "select",
        choices: NPC_RACES.map((r) => ({ value: r, label: r })),
      },
      {
        id: "role",
        label: "Role",
        control: "select",
        choices: NPC_ROLES.map((r) => ({ value: r, label: r })),
      },
    ],
    defaults: { race: "", role: "" },
    generate: generateNpc,
    mapOutputToDraft: mapOutputToDraft("npc"),
    buildPrompt: npcPrompt,
  },
  faction: {
    id: "faction",
    label: "Faction",
    description: "Generate a faction, guild, or organization.",
    entityType: GENERATOR_ENTITY_TYPE.faction,
    defaultInstruction:
      "An organisation with a clear agenda, an internal tension, and a reason the party might ally with or oppose it.",
    icon: "lucide:users",
    options: [
      {
        id: "type",
        label: "Type",
        control: "select",
        choices: FACTION_TYPES.map((t) => ({ value: t, label: t })),
      },
    ],
    defaults: { type: "" },
    generate: generateFaction,
    mapOutputToDraft: mapOutputToDraft("faction"),
    buildPrompt: factionPrompt,
  },
  settlement: {
    id: "settlement",
    label: "Settlement",
    description: "Generate a settlement or location.",
    entityType: GENERATOR_ENTITY_TYPE.settlement,
    defaultInstruction:
      "A place the party can visit, with notable locations, a local power, and simmering tension or a rumour to investigate.",
    icon: "lucide:map-pin",
    options: [
      {
        id: "type",
        label: "Type",
        control: "select",
        choices: SETTLEMENT_TYPES.map((t) => ({ value: t, label: t })),
      },
    ],
    defaults: { type: "" },
    generate: generateSettlement,
    mapOutputToDraft: mapOutputToDraft("settlement"),
    buildPrompt: settlementPrompt,
  },
  "magic-item": {
    id: "magic-item",
    label: "Magic Item",
    description: "Generate a magic item or artifact.",
    entityType: GENERATOR_ENTITY_TYPE["magic-item"],
    defaultInstruction:
      "An evocative item with a clear benefit, a meaningful drawback or cost, and a hook tying it into the world.",
    icon: "lucide:package",
    options: [
      {
        id: "rarity",
        label: "Rarity",
        control: "select",
        choices: ITEM_RARITIES.map((r) => ({ value: r, label: r })),
      },
      {
        id: "kind",
        label: "Kind",
        control: "select",
        choices: ITEM_KINDS.map((k) => ({ value: k, label: k })),
      },
    ],
    defaults: { rarity: "", kind: "" },
    generate: generateMagicItem,
    mapOutputToDraft: mapOutputToDraft("magic-item"),
    buildPrompt: magicItemPrompt,
  },
  event: {
    id: "event",
    label: "Event",
    description: "Generate a historical or unfolding event for your campaign.",
    entityType: GENERATOR_ENTITY_TYPE.event,
    defaultInstruction:
      "A pivotal occurrence with clear causes, the key figures and places involved, lasting consequences, and a thread the party can pull on.",
    icon: "lucide:calendar",
    options: [
      {
        id: "type",
        label: "Type",
        control: "select",
        choices: EVENT_TYPES.map((t) => ({ value: t, label: t })),
      },
    ],
    defaults: { type: "" },
    generate: generateEvent,
    mapOutputToDraft: mapOutputToDraft("event"),
    buildPrompt: eventPrompt,
  },
  ship: {
    id: "ship",
    label: "Ship",
    description:
      "Generate a ship for your campaign — location, faction asset, and adventure seed.",
    entityType: GENERATOR_ENTITY_TYPE.ship,
    defaultInstruction:
      "A vessel with a clear role, a complication the crew is managing, and a secret discoverable through investigation — all woven into the world.",
    icon: "lucide:rocket",
    options: [
      {
        id: "genre",
        label: "Genre",
        control: "select",
        choices: [
          "Sci-Fi",
          "Space Opera",
          "Cyberpunk",
          "Optimistic Exploration Sci-Fi",
          "Space Opera Resistance",
          "Lancer",
          "Post-Apocalyptic",
        ].map((g) => ({ value: g, label: g })),
      },
      {
        id: "role",
        label: "Role",
        control: "select",
        choices: [
          "Freighter",
          "Warship",
          "Scout",
          "Research Vessel",
          "Colony Ship",
          "Pirate Vessel",
        ].map((r) => ({ value: r, label: r })),
      },
    ],
    defaults: { genre: "Sci-Fi", role: "" },
    generate: generateShip,
    mapOutputToDraft: mapOutputToDraft("ship"),
    buildPrompt: shipPrompt,
  },
  language: {
    id: "language",
    label: "Language",
    description:
      "Generate a fictional language profile for your world, culture, or species.",
    entityType: GENERATOR_ENTITY_TYPE.language,
    defaultInstruction:
      "A campaign-ready language profile detailing pronunciation guidelines, naming conventions, example names, and a basic vocabulary glossary.",
    icon: "lucide:message-square",
    options: [
      {
        id: "genre",
        label: "Genre",
        control: "select",
        choices: languageConfig.genres.map((g) => ({ value: g, label: g })),
      },
      {
        id: "tone",
        label: "Tone",
        control: "select",
        choices: languageConfig.tones.map((t) => ({ value: t, label: t })),
      },
      {
        id: "role",
        label: "Role",
        control: "select",
        choices: languageConfig.roles.map((r) => ({ value: r, label: r })),
      },
      {
        id: "structure",
        label: "Name Structure",
        control: "select",
        choices: languageConfig.structures.map((s) => ({ value: s, label: s })),
      },
    ],
    defaults: {
      genre: "Classic Fantasy",
      tone: "Lyrical & Vowel-rich",
      role: "Common Speech",
      structure: "Compound Words",
    },
    generate: generateLanguage,
    // The language prompt splits the profile into narrative `content` and a
    // compact GM-reference `lore`; the vault entity body (draft.lore) needs
    // both, so merge them back together here.
    mapOutputToDraft: (output, request) => ({
      ...mapOutputToDraft("language")(output, request),
      lore: [output.content, output.lore].filter(Boolean).join("\n\n"),
    }),
    buildPrompt: languagePrompt,
  },
  "news-sheet": {
    id: "news-sheet",
    label: "News Sheet",
    description:
      "Generate an in-world news sheet (a cyberpunk-style screamsheet, fantasy broadsheet, or station newsfeed) — headlines, rumours, adverts, and hooks as a player handout.",
    entityType: GENERATOR_ENTITY_TYPE["news-sheet"],
    defaultInstruction:
      "An in-world news sheet whose stories, rumours, and classifieds report recent events in the world's own voice — shaped by who owns the press — with a GM-only section holding the truth and the hooks.",
    icon: "lucide:newspaper",
    options: [
      {
        id: "genre",
        label: "Genre",
        control: "select",
        choices: newsSheetConfig.genres.map((g) => ({ value: g, label: g })),
      },
      {
        id: "tone",
        label: "Editorial Tone",
        control: "select",
        choices: newsSheetConfig.tones.map((t) => ({ value: t, label: t })),
      },
      {
        id: "bias",
        label: "Ownership / Bias",
        control: "select",
        choices: newsSheetConfig.biases.map((b) => ({ value: b, label: b })),
      },
      {
        id: "hookDensity",
        label: "Hook Density",
        control: "select",
        choices: newsSheetConfig.hookDensities.map((h) => ({
          value: h,
          label: h,
        })),
      },
      {
        id: "placeName",
        label: "Settlement or Publication Name",
        description: "Anchor the sheet to a place or name the publication.",
        control: "text",
      },
      {
        id: "headlineEvent",
        label: "Headline Event",
        description: "A current crisis or event the lead story should cover.",
        control: "text",
      },
    ],
    defaults: {
      genre: "",
      tone: "",
      bias: "",
      hookDensity: "",
      placeName: "",
      headlineEvent: "",
    },
    generate: generateNewsSheet,
    // The local generator splits the issue into a player-safe handout
    // (`content`) and GM notes (`lore`); the vault entity body needs both, so
    // merge them — mirroring the language generator above.
    mapOutputToDraft: (output, request) => ({
      ...mapOutputToDraft("news-sheet")(output, request),
      lore: [output.content, output.lore].filter(Boolean).join("\n\n"),
    }),
    buildPrompt: newsSheetPrompt,
  },
  dungeon: {
    id: "dungeon",
    label: "Dungeon / Delve",
    description:
      "Generate a multi-sector subterranean complex, ancient ruin, precursor vault, or monster lair with layout, factions, secret boss lore, hazards, and adventure hooks.",
    entityType: GENERATOR_ENTITY_TYPE.dungeon,
    defaultInstruction:
      "A thematic, multi-sector dungeon complex complete with architectural atmosphere, key sectors, inhabitant factions, central secret, hazards, loot, and adventure hooks.",
    icon: "lucide:castle",
    options: [
      {
        id: "purpose",
        label: "Original Purpose",
        control: "select",
        choices: dungeonConfig.purposes.map((p) => ({ value: p, label: p })),
      },
      {
        id: "currentState",
        label: "Current State",
        control: "select",
        choices: dungeonConfig.currentStates.map((s) => ({
          value: s,
          label: s,
        })),
      },
      {
        id: "scale",
        label: "Scale",
        control: "select",
        choices: dungeonConfig.scales.map((sc) => ({ value: sc, label: sc })),
      },
    ],
    defaults: {
      purpose: "Temple & Shrine",
      currentState: "Active Monster Lair",
      scale: "Medium Complex (3-4 Sectors)",
    },
    generate: generateDungeon,
    mapOutputToDraft: mapOutputToDraft("dungeon"),
    buildPrompt: dungeonPrompt,
  },
  adventure: {
    id: "adventure",
    label: "Adventure Idea",
    description:
      "Generate a campaign-ready adventure concept with dramatic ingredients, key actors, and multiple possible outcomes — a situation, not a plot.",
    entityType: GENERATOR_ENTITY_TYPE.adventure,
    defaultInstruction:
      "A thematic adventure concept complete with initial situation, primary objective, key locations, important NPCs, threats, clues, complications, possible outcomes, and adventure hooks.",
    icon: "lucide:map",
    options: [
      {
        id: "archetype",
        label: "Adventure Type",
        control: "select",
        choices: adventureConfig.archetypes.map((a) => ({
          value: a,
          label: a,
        })),
      },
      {
        id: "scale",
        label: "Scale",
        control: "select",
        choices: adventureConfig.scales.map((s) => ({ value: s, label: s })),
      },
      {
        id: "tone",
        label: "Tone",
        control: "select",
        choices: adventureConfig.tones.map((t) => ({ value: t, label: t })),
      },
      {
        id: "seed",
        label: "Starting Seed / Situation",
        description:
          "Optional: describe or paste a starting scenario, NPC, or hook to anchor the adventure. Names are kept as written, and a deadline you state becomes the adventure's clock.",
        control: "textarea",
      },
    ],
    defaults: {
      archetype: "Investigation & Mystery",
      scale: "Short Arc (2-3 Sessions)",
      tone: "",
      seed: "",
    },
    generate: generateAdventure,
    mapOutputToDraft: mapOutputToDraft("adventure"),
    buildPrompt: adventurePrompt,
  },
  quest: {
    id: "quest",
    label: "Quest Hook",
    description:
      "Generate a campaign-ready quest hook with a threat, complication, twist, and reward.",
    entityType: GENERATOR_ENTITY_TYPE.quest,
    defaultInstruction:
      "A playable quest hook grounded in the campaign, with a clear patron or inciting event, a concrete threat, a complication, and a meaningful reward.",
    icon: "lucide:scroll-text",
    options: [
      {
        id: "genre",
        label: "Genre",
        control: "select",
        choices: questConfig.genres.map((value) => ({ value, label: value })),
      },
      {
        id: "tone",
        label: "Tone",
        control: "select",
        choices: questConfig.tones.map((value) => ({ value, label: value })),
      },
      {
        id: "scope",
        label: "Scope",
        control: "select",
        choices: questConfig.scopes.map((value) => ({ value, label: value })),
      },
      {
        id: "locationType",
        label: "Location",
        control: "select",
        choices: questConfig.locationTypes.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "threat",
        label: "Threat",
        control: "select",
        choices: questConfig.threats.map((value) => ({ value, label: value })),
      },
      {
        id: "twist",
        label: "Initial Twist",
        control: "select",
        choices: questConfig.twists.map((value) => ({ value, label: value })),
      },
      {
        id: "reward",
        label: "Reward",
        control: "select",
        choices: questConfig.rewards.map((value) => ({ value, label: value })),
      },
    ],
    defaults: {
      genre: "",
      tone: "",
      scope: "",
      locationType: "",
      threat: "",
      twist: "",
      reward: "",
    },
    generate: generateQuest,
    mapOutputToDraft: mapOutputToDraft("quest"),
    buildPrompt: questPrompt,
  },
  "plot-twist": {
    id: "plot-twist",
    label: "Plot Twist & Complication",
    description:
      "Reinterpret an established situation into a coherent twist, complication, and new player choices.",
    entityType: GENERATOR_ENTITY_TYPE["plot-twist"],
    defaultInstruction:
      "A coherent plot twist or complication that preserves established facts, overturns an assumption, and creates meaningful player-facing choices.",
    icon: "lucide:shuffle",
    options: [
      {
        id: "premise",
        label: "Current Situation / Premise",
        description:
          "Describe the adventure, conflict, scene, or campaign situation to reinterpret.",
        control: "textarea",
        required: true,
      },
      {
        id: "twistType",
        label: "Twist Type",
        control: "select",
        choices: plotTwistConfig.twistTypes.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "impact",
        label: "Impact",
        control: "select",
        choices: plotTwistConfig.impacts.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "timing",
        label: "When It Hits",
        control: "select",
        choices: plotTwistConfig.timings.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "foreshadowing",
        label: "Fairness / Foreshadowing",
        control: "select",
        choices: plotTwistConfig.foreshadowing.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "constraints",
        label: "Avoid / Constraints",
        description:
          "Optional tropes, facts, or boundaries the result must avoid.",
        control: "textarea",
      },
    ],
    defaults: {
      premise: "",
      twistType: "Random",
      impact: "Significant",
      timing: "Any",
      foreshadowing: "Surprise me",
      constraints: "",
    },
    generate: generatePlotTwist,
    mapOutputToDraft: mapOutputToDraft("plot-twist"),
    buildPrompt: plotTwistPrompt,
  },
  villain: {
    id: "villain",
    label: "BBEG / Campaign Villain",
    description:
      "Generate a campaign-scale antagonist — goal, methods, lieutenants, an escalating plan, and consequences — not just a biography.",
    entityType: GENERATOR_ENTITY_TYPE.villain,
    defaultInstruction:
      "A campaign villain who functions as a campaign engine: a concrete goal, coherent motivation, an escalating multi-stage plan the party can discover and disrupt, and consequences whether they act or not.",
    icon: "lucide:skull",
    options: [
      {
        id: "genre",
        label: "Genre / Theme",
        control: "select",
        choices: villainConfig.genres.map((value) => ({ value, label: value })),
      },
      {
        id: "tone",
        label: "Tone",
        control: "select",
        choices: villainConfig.tones.map((value) => ({ value, label: value })),
      },
      {
        id: "threatScale",
        label: "Threat Scale",
        control: "select",
        choices: villainConfig.threatScales.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "archetype",
        label: "Villain Archetype",
        control: "select",
        choices: villainConfig.archetypes.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "sympathy",
        label: "Degree of Sympathy / Redeemability",
        control: "select",
        choices: villainConfig.sympathyLevels.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "worldRelation",
        label: "World Relation",
        control: "select",
        choices: villainConfig.worldRelations.map((value) => ({
          value,
          label: value,
        })),
      },
    ],
    defaults: {
      genre: "",
      tone: "",
      threatScale: "",
      archetype: "Random",
      sympathy: "",
      worldRelation: "Random",
    },
    generate: generateVillain,
    mapOutputToDraft: mapOutputToDraft("villain"),
    buildPrompt: villainPrompt,
  },
  world: {
    id: "world",
    label: "World",
    description:
      "Generate a detailed sci-fi planet, moon, or artificial world with places, people, tensions, and adventure hooks.",
    entityType: GENERATOR_ENTITY_TYPE.world,
    defaultInstruction:
      "A sci-fi world with a clear environmental identity, societies shaped by that environment, active conflicts, notable locations, and playable adventure hooks.",
    icon: "lucide:earth",
    options: [
      {
        id: "worldType",
        label: "World Type",
        control: "select",
        choices: worldConfig.worldTypes.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "habitability",
        label: "Habitability",
        control: "select",
        choices: worldConfig.habitability.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "civilisation",
        label: "Civilisation",
        control: "select",
        choices: worldConfig.civilisations.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "societalModel",
        label: "Primary Societal Model",
        control: "select",
        visibleWhen: {
          optionId: "genre",
          notValues: ["Lancer"],
        },
        choices: worldConfig.societalModels.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "worldTagOne",
        label: "World Tag 1",
        description:
          "First Stars Without Number world tag shaping the setting.",
        control: "select",
        choices: worldConfig.worldTags.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "worldTagTwo",
        label: "World Tag 2",
        description:
          "Second tag to combine with the first; choose a different pressure.",
        control: "select",
        choices: worldConfig.worldTags.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "genre",
        label: "Genre / Tone",
        control: "select",
        choices: worldConfig.genres.map((value) => ({ value, label: value })),
      },
      {
        id: "lancerWorldFrame",
        label: "Lancer World Frame",
        description:
          "Political and geographic frame for a Lancer campaign world.",
        control: "select",
        visibleWhen: { optionId: "genre", values: ["Lancer"] },
        choices: worldConfig.lancerWorldFrames.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "campaignPressure",
        label: "Campaign Pressure",
        description: "The central political or social conflict for the world.",
        control: "select",
        choices: worldConfig.campaignPressures.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "dominantFeature",
        label: "Dominant Feature",
        description:
          "Optional: a defining physical feature, mystery, or condition.",
        control: "text",
      },
    ],
    defaults: {
      worldType: "Terrestrial World",
      habitability: "Earthlike",
      civilisation: "Colony",
      societalModel: "Scientific Expedition",
      worldTagOne: "Colonized Population",
      worldTagTwo: "Local Specialty",
      genre: "Hard Sci-Fi",
      lancerWorldFrame: "Union Core World",
      campaignPressure: "Resource Access and Rationing",
      dominantFeature: "",
    },
    generate: generateWorld,
    mapOutputToDraft: (output, request) => ({
      ...mapOutputToDraft("world")(output, request),
      lore: [output.content, output.lore].filter(Boolean).join("\n\n"),
    }),
    buildPrompt: worldPrompt,
  },
  "star-system": {
    id: "star-system",
    label: "Star System",
    description:
      "Generate a coherent sci-fi star system: star(s), major bodies, factions, resources, hazards, and a system-wide conflict or mystery.",
    entityType: GENERATOR_ENTITY_TYPE["star-system"],
    defaultInstruction:
      "A sci-fi star system that answers why anyone cares about it — clear stakes, competing factions, a strategic resource, and a system-wide conflict or mystery with playable hooks.",
    icon: "lucide:orbit",
    options: [
      {
        id: "systemType",
        label: "System Type",
        control: "select",
        choices: starSystemConfig.systemTypes.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "genre",
        label: "Genre",
        control: "select",
        choices: starSystemConfig.genres.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "civilisationLevel",
        label: "Civilisation Level",
        control: "select",
        choices: starSystemConfig.civilisationLevels.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "systemCharacter",
        label: "System Character",
        control: "select",
        choices: starSystemConfig.systemCharacters.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "scientificRealism",
        label: "Scientific Realism",
        control: "select",
        choices: starSystemConfig.scientificRealism.map((value) => ({
          value,
          label: value,
        })),
      },
    ],
    defaults: {
      systemType: "Single Star",
      genre: "Hard Sci-Fi",
      civilisationLevel: "Frontier",
      systemCharacter: "Contested",
      scientificRealism: "Grounded",
    },
    generate: generateStarSystem,
    mapOutputToDraft: (output, request) => ({
      ...mapOutputToDraft("star-system")(output, request),
      lore: [output.content, output.lore].filter(Boolean).join("\n\n"),
      bodies: output.bodies,
      starType: output.starType,
    }),
    buildPrompt: starSystemPrompt,
  },
  "alien-race": {
    id: "alien-race",
    label: "Alien Race",
    description:
      "Generate a coherent alien species where biology, environment, psychology, society and technology visibly shape one another.",
    entityType: GENERATOR_ENTITY_TYPE["alien-race"],
    defaultInstruction:
      "An alien species that is genuinely non-human — every major biological or environmental trait should change something else about how they live, build, and deal with outsiders.",
    icon: "lucide:dna",
    options: [
      {
        id: "genre",
        label: "Genre",
        control: "select",
        choices: alienRaceConfig.genres.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "generationMode",
        label: "Generation Mode",
        description:
          "Grounded keeps the species biologically plausible; Freeform unlocks crystalline, colonial, plasma and machine life.",
        control: "select",
        choices: alienRaceConfig.generationModes.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "homeEnvironment",
        label: "Home Environment",
        control: "select",
        choices: alienRaceConfig.homeEnvironments.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "bodyPlan",
        label: "Body Plan",
        control: "select",
        choices: alienRaceConfig.bodyPlans.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "psychology",
        label: "Psychology",
        control: "select",
        choices: alienRaceConfig.psychologies.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "socialOrganisation",
        label: "Social Organisation",
        control: "select",
        choices: alienRaceConfig.socialOrganisations.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "technologyLevel",
        label: "Technology Level",
        control: "select",
        choices: alienRaceConfig.technologyLevels.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "relationToOutsiders",
        label: "Relationship to Other Species",
        control: "select",
        choices: alienRaceConfig.relationsToOutsiders.map((value) => ({
          value,
          label: value,
        })),
      },
    ],
    defaults: {
      genre: "Hard Sci-Fi",
      generationMode: GROUNDED_MODE,
      homeEnvironment: "High-gravity world",
      bodyPlan: "Hexapodal",
      psychology: "Consensus-seeking",
      socialOrganisation: "Clan lineages",
      technologyLevel: "Interplanetary",
      relationToOutsiders: "First contact pending",
    },
    generate: generateAlienRace,
    mapOutputToDraft: (output, request) => ({
      ...mapOutputToDraft("alien-race")(output, request),
      // The species reads as one document, so both halves land in lore
      // rather than splitting across the entity's summary field.
      lore: [output.content, output.lore].filter(Boolean).join("\n\n"),
    }),
    buildPrompt: alienRacePrompt,
  },
  "secret-society": {
    id: "secret-society",
    label: "Secret Society",
    description:
      "Generate a cult, sect, conspiracy, or mystery order with a public face and a campaign-changing secret.",
    entityType: GENERATOR_ENTITY_TYPE["secret-society"],
    defaultInstruction:
      "A campaign-ready secret society with doctrine, ritual, public face, hidden truth, and usable adventure hooks.",
    icon: "lucide:eye",
    options: [
      {
        id: "theme",
        label: "Theme",
        control: "select",
        choices: secretSocietyConfig.themes.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "tone",
        label: "Tone",
        control: "select",
        choices: secretSocietyConfig.tones.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "scale",
        label: "Scale",
        control: "select",
        choices: secretSocietyConfig.scales.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "publicFace",
        label: "Public Face",
        control: "select",
        choices: secretSocietyConfig.publicFaces.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "dangerLevel",
        label: "Danger Level",
        control: "select",
        choices: secretSocietyConfig.dangers.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "truthRelationship",
        label: "Relationship to Truth",
        control: "select",
        choices: secretSocietyConfig.truths.map((value) => ({
          value,
          label: value,
        })),
      },
    ],
    defaults: {
      theme: "Classic Fantasy",
      tone: "Sinister",
      scale: "Local cell",
      publicFace: "Charity",
      dangerLevel: "Socially disruptive",
      truthRelationship: "Partial truth",
    },
    generate: generateSecretSociety,
    mapOutputToDraft: mapOutputToDraft("secret-society"),
    buildPrompt: secretSocietyPrompt,
  },
  "council-vote": {
    id: "council-vote",
    label: "Council Vote",
    description:
      "Generate a political vote quest: a council of named voters, each with a distinct agenda, that the party must sway before a deadline decision.",
    entityType: GENERATOR_ENTITY_TYPE["council-vote"],
    defaultInstruction:
      "A council-vote adventure with a clear proposal, deadline, voting threshold, and a named council of voters with individual stances, leverage, and investigation hooks — a political puzzle, not a fetch-quest chain.",
    icon: "lucide:gavel",
    options: [
      {
        id: "proposal",
        label: "Proposal / Desired Outcome",
        description:
          "What is being voted on, e.g. raise an army, appoint an official, open a vault, declare war.",
        control: "textarea",
      },
      {
        id: "governingBodyType",
        label: "Governing Body",
        control: "select",
        choices: COUNCIL_VOTE_BODY_TYPES.map((t) => ({ value: t, label: t })),
      },
      {
        id: "councilSize",
        label: "Council Size",
        control: "select",
        choices: COUNCIL_VOTE_SIZES.map((s) => ({
          value: s,
          label: `${s} seats`,
        })),
      },
      {
        id: "votingRule",
        label: "Voting Rule",
        control: "select",
        choices: COUNCIL_VOTE_RULES.map((r) => ({ value: r, label: r })),
      },
      {
        id: "deadline",
        label: "Deadline / Time Pressure",
        description: "Optional: when the vote is called and why it can't wait.",
        control: "text",
      },
      {
        id: "scope",
        label: "Scope",
        control: "radio",
        choices: COUNCIL_VOTE_SCOPES.map((s) => ({ value: s, label: s })),
      },
      {
        id: "tone",
        label: "Tone",
        control: "select",
        choices: COUNCIL_VOTE_TONES.map((t) => ({ value: t, label: t })),
      },
      {
        id: "antagonistInfluence",
        label: "Antagonist Influence",
        description: "How much a hostile power already controls the vote.",
        control: "select",
        choices: COUNCIL_VOTE_ANTAGONIST_INFLUENCE.map((a) => ({
          value: a,
          label: a,
        })),
      },
    ],
    defaults: {
      proposal: "",
      governingBodyType: "",
      councilSize: "5",
      votingRule: "",
      deadline: "",
      scope: "",
      tone: "",
      antagonistInfluence: "",
    },
    generate: generateCouncilVote,
    mapOutputToDraft: mapOutputToDraft("council-vote"),
    buildPrompt: councilVoteFoundationPrompt,
  },
  "random-table": {
    id: "random-table",
    label: "Random Roll Table",
    description:
      "Generate an atmospheric, world-grounded random roll table populated with your vault's lore and nested table references.",
    entityType: GENERATOR_ENTITY_TYPE["random-table"],
    defaultInstruction:
      "A thematic random roll table with specific, evocative entries grounded in the world's factions, locations, and characters.",
    icon: "lucide:dices",
    options: [
      {
        id: "topic",
        label: "Table Topic / Purpose",
        description:
          "What happens when someone rolls this table (e.g. Docklands Encounters, Dungeon Rumors)",
        control: "text",
        required: true,
      },
      {
        id: "count",
        label: "Entry Count",
        control: "number",
        defaultValue: 10,
      },
    ],
    defaults: {
      topic: "",
      count: 10,
    },
    generate: (
      request: GeneratorRunRequest,
      rawText?: string,
    ): GeneratorOutput => {
      if (rawText) {
        try {
          const parsed = JSON.parse(rawText) as Partial<GeneratorOutput>;
          if (
            typeof parsed.title === "string" &&
            typeof parsed.summary === "string" &&
            typeof parsed.lore === "string"
          ) {
            return {
              title: parsed.title,
              summary: parsed.summary,
              lore: parsed.lore,
              content:
                typeof parsed.content === "string"
                  ? parsed.content
                  : parsed.lore,
              labels: Array.isArray(parsed.labels)
                ? parsed.labels
                : ["random-table", "table"],
              connections: parsed.connections ?? [],
            };
          }
        } catch {
          // Fall through to parseRandomTableResponse
        }
        const parsedTable = parseRandomTableResponse(rawText);
        return {
          title: parsedTable.title,
          summary:
            parsedTable.description ??
            `Random table for ${optionString(request, "topic", "encounters")}.`,
          lore: parsedTable.entries
            .map((e, idx) => `${idx + 1}. ${e.text}`)
            .join("\n"),
          content: parsedTable.entries
            .map((e, idx) => `${idx + 1}. ${e.text}`)
            .join("\n"),
          labels: ["random-table", "table"],
        };
      }
      const fallback = generateRandomTableLocal({
        topic: optionString(request, "topic", "Random Events & Encounters"),
        count:
          typeof request.options.count === "number"
            ? request.options.count
            : 10,
        theme: request.themeId,
      });
      return {
        title: fallback.title,
        summary: fallback.description ?? `Random table for ${fallback.title}.`,
        lore: fallback.entries
          .map((e, idx) => `${idx + 1}. ${e.text}`)
          .join("\n"),
        content: fallback.entries
          .map((e, idx) => `${idx + 1}. ${e.text}`)
          .join("\n"),
        labels: ["random-table", "table"],
      };
    },
    mapOutputToDraft: mapOutputToDraft("random-table"),
    buildPrompt: randomTablePrompt,
  },
};

/** Look up a generator definition, throwing for unknown ids. */
export function getGenerator(id: string): CampaignGeneratorDefinition {
  if (!isSupportedGenerator(id)) throw new UnsupportedGeneratorError(id);
  return REGISTRY[id];
}

export function isSupportedGenerator(id: string): id is GeneratorId {
  return (SUPPORTED_GENERATOR_IDS as readonly string[]).includes(id);
}

/** The fallback generation brief for a generator (used when no user input). */
export function getDefaultInstruction(id: GeneratorId): string {
  return REGISTRY[id].defaultInstruction;
}

/** All supported generator definitions, in display order. */
export function listGenerators(): CampaignGeneratorDefinition[] {
  return SUPPORTED_GENERATOR_IDS.map((id) => REGISTRY[id]);
}
