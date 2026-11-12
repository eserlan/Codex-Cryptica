import {
  adventureArchetypesForTheme,
  adventureConfig,
  adventureTonesForTheme,
  dungeonConfig,
  factionTypesForTheme,
  forDungeonGenre,
  getGenerator,
  getVillainThreatScales,
  npcRacesForTheme,
  npcRolesForTheme,
  settlementTypesForTheme,
  themeIdToLabel,
  villainConfig,
  worldConfig,
  type GeneratorId,
  type GeneratorOptionDefinition,
} from "generator-engine";

type OptionValues = Record<string, unknown>;
type ThemedChoices = Record<string, readonly string[]>;

const knownVillainThreatScales = Array.from(
  new Set([
    ...villainConfig.threatScales,
    ...Object.values(villainConfig.threatScalesByTheme).flat(),
  ]),
);

export function stringOptionValue(values: OptionValues, id: string): string {
  return typeof values[id] === "string" ? values[id] : "";
}

function villainGenre(themeId: string, values: OptionValues): string {
  return (
    stringOptionValue(values, "genre") ||
    themeIdToLabel[themeId] ||
    "Classic Fantasy"
  );
}

/** Choices which follow the vault theme or another option in this form. */
export function getThemedChoices(
  themeId: string,
  values: OptionValues,
): ThemedChoices {
  const dungeonGenre = themeIdToLabel[themeId] ?? "Classic Fantasy";
  return {
    "world:campaignPressure": campaignPressures(values.genre),
    "npc:race": npcRacesForTheme(themeId),
    "npc:role": npcRolesForTheme(themeId),
    "faction:type": factionTypesForTheme(themeId),
    "settlement:type": settlementTypesForTheme(themeId),
    "adventure:archetype": adventureArchetypesForTheme(themeId),
    "adventure:tone": adventureTonesForTheme(themeId),
    "villain:threatScale": getVillainThreatScales(
      villainGenre(themeId, values),
    ),
    "dungeon:purpose": forDungeonGenre(
      dungeonConfig.purposesByGenre,
      dungeonGenre,
    ),
    "dungeon:currentState": forDungeonGenre(
      dungeonConfig.currentStatesByGenre,
      dungeonGenre,
    ),
  };
}

function defaultOptionValue(
  option: GeneratorOptionDefinition,
  defaults: OptionValues,
  isTovVault: boolean,
): unknown {
  if (option.id !== "gameSystem")
    return defaults[option.id] ?? option.defaultValue ?? "";
  return isTovVault
    ? "tales-of-the-valiant"
    : (defaults[option.id] ?? "system-neutral");
}

export function getNextOptionValues(
  id: GeneratorId,
  previous: OptionValues,
  isTovVault: boolean,
): OptionValues {
  const definition = getGenerator(id);
  return Object.fromEntries(
    definition.options.map((option) => [
      option.id,
      typeof previous[option.id] !== "undefined"
        ? previous[option.id]
        : defaultOptionValue(option, definition.defaults, isTovVault),
    ]),
  );
}

export function isOptionVisible(
  option: GeneratorOptionDefinition,
  values: OptionValues,
): boolean {
  const condition = option.visibleWhen;
  if (!condition) return true;
  const current = stringOptionValue(values, condition.optionId);
  if (condition.values && !condition.values.includes(current)) return false;
  return !condition.notValues?.includes(current);
}

interface ChoiceRule {
  optionId: string;
  known: readonly string[];
  clear?: boolean;
}

const themeRules: Partial<Record<GeneratorId, ChoiceRule[]>> = {
  dungeon: [
    { optionId: "purpose", known: dungeonConfig.purposes },
    { optionId: "currentState", known: dungeonConfig.currentStates },
  ],
  adventure: [
    { optionId: "archetype", known: adventureConfig.archetypes },
    { optionId: "tone", known: adventureConfig.tones, clear: true },
  ],
  villain: [{ optionId: "threatScale", known: knownVillainThreatScales }],
};

function isUnsupportedChoice(
  value: unknown,
  known: readonly string[],
  available: readonly string[],
): boolean {
  return (
    typeof value === "string" &&
    known.includes(value) &&
    !available.includes(value)
  );
}

/** Replace stale catalogue choices, leaving authored custom values alone. */
export function reconcileOptionValues(
  id: GeneratorId,
  values: OptionValues,
  choices: ThemedChoices,
): OptionValues {
  let next = values;
  for (const rule of themeRules[id] ?? []) {
    const available = choices[`${id}:${rule.optionId}`] ?? [];
    const value = values[rule.optionId];
    // The villain effect has always left an empty scale untouched.
    if (id === "villain" && !value) continue;
    if (isUnsupportedChoice(value, rule.known, available)) {
      next = {
        ...next,
        [rule.optionId]: rule.clear ? "" : (available[0] ?? ""),
      };
    }
  }
  return next;
}

function campaignPressures(genre: unknown): readonly string[] {
  return genre === "Lancer"
    ? worldConfig.lancerConflicts
    : worldConfig.campaignPressures;
}

function updateWorldPressure(values: OptionValues): OptionValues {
  const available = campaignPressures(values.genre);
  const known = [
    ...worldConfig.campaignPressures,
    ...worldConfig.lancerConflicts,
  ];
  const current = values.campaignPressure;
  if (
    typeof current !== "string" ||
    isUnsupportedChoice(current, known, available)
  ) {
    return { ...values, campaignPressure: available[0] ?? "" };
  }
  return values;
}

function updateVillainScale(
  values: OptionValues,
  themeId: string,
): OptionValues {
  const available = getVillainThreatScales(villainGenre(themeId, values));
  const current = values.threatScale;
  if (
    typeof current !== "string" ||
    !current ||
    isUnsupportedChoice(current, knownVillainThreatScales, available)
  ) {
    return { ...values, threatScale: available[0] ?? "" };
  }
  return values;
}

export function updateOptionValues(
  id: GeneratorId,
  values: OptionValues,
  optionId: string,
  value: unknown,
  themeId: string,
): OptionValues {
  const next = { ...values, [optionId]: value };
  if (optionId !== "genre") return next;
  if (id === "world") return updateWorldPressure(next);
  if (id === "villain") return updateVillainScale(next, themeId);
  return next;
}
