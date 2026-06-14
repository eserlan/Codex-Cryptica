import {
  type CampaignGeneratorDefinition,
  type GeneratedDraft,
  type GeneratorId,
  type GeneratorOutput,
  type GeneratorRunRequest,
  SUPPORTED_GENERATOR_IDS,
  UnsupportedGeneratorError,
} from "./campaign-generator-types";

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
    return {
      title: output.title,
      entityType: resolveEntityType(generatorId, availableIds),
      summary: output.summary,
      lore: output.lore,
      labels: [...output.labels],
      sourceGeneratorId: generatorId,
      sourceEntityId: request.sourceEntityId,
      relationshipLabel: request.relationshipLabel,
      templateOutline: request.vaultContext?.templateOutline,
      templateApplied: Boolean(
        request.vaultContext?.applyTemplate &&
        request.vaultContext?.templateOutline,
      ),
      unmappedDetails: output.unmappedDetails,
    };
  };
}

// ---------------------------------------------------------------------------
// Shared prompt helpers
// ---------------------------------------------------------------------------

const SYSTEM_INSTRUCTION =
  "You are a tabletop RPG campaign assistant. Generate campaign content grounded in the provided world context. Keep the result internally consistent: names, facts, dates, motivations, and relationships must agree across every field and section, with no self-contradictions. Return ONLY valid JSON with no markdown fences.";

const OUTPUT_SCHEMA = `{
  "title": "string — name of the entity",
  "summary": "string — one sentence description",
  "lore": "string — markdown with backstory, motivations, and adventure hooks",
  "labels": ["string"]
}`;

function vaultContextBlock(request: GeneratorRunRequest): string {
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
  return lines.join("\n");
}

/**
 * Positive world grounding: a sample of existing vault entities so the model
 * matches the established tone and stays consistent with the campaign. Distinct
 * from the source/neighbor context and the name ban list.
 */
function worldBlock(request: GeneratorRunRequest): string {
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
  return `\n[HIGHEST PRIORITY — User instructions, override defaults]\n${inst}\n`;
}

function bannedNamesBlock(request: GeneratorRunRequest): string {
  const ctx = request.vaultContext;
  const all = [...(ctx?.bannedNames ?? []), ...(ctx?.existingTitles ?? [])];
  if (!all.length) return "";
  return `\nDo NOT use any of these names, or hyphenated/compound variations of them (e.g. if "Vane" is listed, do not use "Vane-Smithe"): ${all.join(", ")}`;
}

/**
 * True when a generated title collides with a banned name. Matches whole tokens
 * case-insensitively (splitting on spaces, hyphens, punctuation, and accents
 * preserved) so derivatives like "Vane-Smithe" are caught for a banned "Vane",
 * while substrings inside a larger word ("Vanessa") are not.
 */
export function isTitleBanned(
  title: string,
  banned: Iterable<string>,
): boolean {
  const normalize = (s: string) =>
    ` ${s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()} `;
  const haystack = normalize(title);
  for (const name of banned) {
    const needle = normalize(name).trim();
    if (needle && haystack.includes(` ${needle} `)) return true;
  }
  return false;
}

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
  const basis = hasExamples
    ? "Infer the naming style from the example entities and source context above"
    : "Use a consistent naming style appropriate to the world theme";
  return `\nName the entity to match the established naming conventions and cultural/linguistic flavour of this world. ${basis}; do not default to generic, culture-neutral fantasy names.`;
}

/**
 * When a template outline is supplied, instruct the model to shape the "lore"
 * field to match it — mirroring the markdown template a manually-created entity
 * of this type would receive.
 */
function templateBlock(request: GeneratorRunRequest): string {
  const ctx = request.vaultContext;
  if (!ctx?.applyTemplate || !ctx.templateOutline) return "";
  return `\nStructure the "lore" field to follow this template, keeping its markdown headings and filling every section with generated content:\n${ctx.templateOutline}\n`;
}

export { SYSTEM_INSTRUCTION };

// ---------------------------------------------------------------------------
// Generator-specific prompt builders
// ---------------------------------------------------------------------------

function npcPrompt(request: GeneratorRunRequest): string {
  return `${instructionsBlock(request)}${vaultContextBlock(request)}${worldBlock(request)}${optionsBlock(request)}${bannedNamesBlock(request)}${namingBlock(request)}${templateBlock(request)}

Generate a campaign NPC. Return JSON matching this schema:
${OUTPUT_SCHEMA}

The "lore" field should include: who they are, what they want, a secret, and a first-scene hook. Use markdown headings.`;
}

function factionPrompt(request: GeneratorRunRequest): string {
  return `${instructionsBlock(request)}${vaultContextBlock(request)}${worldBlock(request)}${optionsBlock(request)}${bannedNamesBlock(request)}${namingBlock(request)}${templateBlock(request)}

Generate a campaign faction, guild, or organisation. Return JSON matching this schema:
${OUTPUT_SCHEMA}

The "lore" field should include: what they control, what they want, internal conflict, and an adventure hook. Use markdown headings.`;
}

function settlementPrompt(request: GeneratorRunRequest): string {
  return `${instructionsBlock(request)}${vaultContextBlock(request)}${worldBlock(request)}${optionsBlock(request)}${bannedNamesBlock(request)}${namingBlock(request)}${templateBlock(request)}

Generate a campaign settlement or location. Return JSON matching this schema:
${OUTPUT_SCHEMA}

The "lore" field should include: points of interest, power structure, notable rumours, and a hook for the players. Use markdown headings.`;
}

function magicItemPrompt(request: GeneratorRunRequest): string {
  return `${instructionsBlock(request)}${vaultContextBlock(request)}${worldBlock(request)}${optionsBlock(request)}${bannedNamesBlock(request)}${namingBlock(request)}${templateBlock(request)}

Generate a campaign magic item or artefact. Return JSON matching this schema:
${OUTPUT_SCHEMA}

The "lore" field should include: item history, its power/effect, a side effect or curse, and how it might enter play. Use markdown headings.`;
}

// ---------------------------------------------------------------------------
// Local table-based generators
// ---------------------------------------------------------------------------

const NPC_RACES = ["Human", "Elf", "Dwarf", "Halfling", "Orc", "Tiefling"];
const NPC_ROLES = [
  "Mage",
  "Warrior",
  "Rogue",
  "Priest",
  "Merchant",
  "Scholar",
  "Guard",
  "Noble",
];
const NPC_TRAITS = [
  "speaks in measured, deliberate sentences",
  "never removes their worn leather gloves",
  "collects small carved trinkets from every town visited",
  "laughs a beat too late at every joke",
];

const FACTION_TYPES = [
  "Guild",
  "Cult",
  "Order",
  "Syndicate",
  "Council",
  "Cabal",
];
const FACTION_GOALS = [
  "control the regional trade routes",
  "uncover a buried pre-cataclysm secret",
  "install a sympathetic ruler",
  "purge a rival faction from the city",
];

const SETTLEMENT_TYPES = [
  "Hamlet",
  "Village",
  "Town",
  "City",
  "Outpost",
  "Fortress",
];
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
  const race = optionString(request, "race", pick(NPC_RACES));
  const role = optionString(request, "role", pick(NPC_ROLES));
  const trait = pick(NPC_TRAITS);
  return {
    title: name,
    summary: `${name}, a ${race.toLowerCase()} ${role.toLowerCase()}.`,
    lore: `${name} is a ${race} ${role} who ${trait}.`,
    labels: [race, role],
  };
}

function generateFaction(request: GeneratorRunRequest): GeneratorOutput {
  const type = optionString(request, "type", pick(FACTION_TYPES));
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
  const type = optionString(request, "type", pick(SETTLEMENT_TYPES));
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
