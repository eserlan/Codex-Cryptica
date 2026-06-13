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
  },
  faction: {
    id: "faction",
    label: "Faction",
    description: "Generate a faction, guild, or organization.",
    entityType: GENERATOR_ENTITY_TYPE.faction,
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
  },
  settlement: {
    id: "settlement",
    label: "Settlement",
    description: "Generate a settlement or location.",
    entityType: GENERATOR_ENTITY_TYPE.settlement,
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
  },
  "magic-item": {
    id: "magic-item",
    label: "Magic Item",
    description: "Generate a magic item or artifact.",
    entityType: GENERATOR_ENTITY_TYPE["magic-item"],
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

/** All supported generator definitions, in display order. */
export function listGenerators(): CampaignGeneratorDefinition[] {
  return SUPPORTED_GENERATOR_IDS.map((id) => REGISTRY[id]);
}
