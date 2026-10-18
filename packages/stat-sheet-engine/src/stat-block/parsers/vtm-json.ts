import type { StatBlockIR } from "../types";

export function parseVtmJson(input: Record<string, unknown>): StatBlockIR {
  const name = String(input.name || "Unnamed Kindred").trim();
  const vitals = extractVtmVitals(input);
  const attributes = extractVtmAttributes(input);
  const secondaryDefences = extractVtmSecondary(input);
  const traitsAndFeatures = extractVtmDisciplines(input);

  const bloodPotency =
    input.blood_potency !== undefined ? Number(input.blood_potency) : undefined;

  return {
    system: "vtm",
    identity: {
      name,
      category: "character",
      ancestryOrType: input.clan ? String(input.clan) : undefined,
      classOrRole: input.predator_type
        ? String(input.predator_type)
        : undefined,
      levelOrCr:
        bloodPotency !== undefined
          ? `Blood Potency ${bloodPotency}`
          : undefined,
    },
    vitals,
    attributes,
    defences: { secondaryDefences },
    actionsAndAttacks: [],
    traitsAndFeatures,
    rawSource: JSON.stringify(input),
  };
}

function extractVtmVitals(
  input: Record<string, unknown>,
): StatBlockIR["vitals"] {
  const willpower = Number(input.willpower ?? 5);
  const humanity = Number(input.humanity ?? 7);
  const blood = Number(input.hunger ?? input.blood ?? input.blood_pool ?? 1);

  return [
    {
      id: "willpower",
      label: "Willpower",
      current: willpower,
      max: 10,
      min: 0,
    },
    {
      id: "blood",
      label: "Blood Pool / Hunger",
      current: blood,
      max: 10,
      min: 0,
    },
    { id: "humanity", label: "Humanity", current: humanity, max: 10, min: 0 },
  ];
}

function extractVtmAttributes(
  input: Record<string, unknown>,
): StatBlockIR["attributes"] {
  const rawAttrs =
    input.attributes && typeof input.attributes === "object"
      ? (input.attributes as Record<string, unknown>)
      : input;

  const wodAttrs: Array<[string, string]> = [
    ["strength", "Strength"],
    ["dexterity", "Dexterity"],
    ["stamina", "Stamina"],
    ["charisma", "Charisma"],
    ["manipulation", "Manipulation"],
    ["composure", "Composure"],
    ["intelligence", "Intelligence"],
    ["wits", "Wits"],
    ["resolve", "Resolve"],
  ];

  const attributes: StatBlockIR["attributes"] = {};
  for (const [key, label] of wodAttrs) {
    const val = Number(rawAttrs[key] ?? rawAttrs[key.toLowerCase()] ?? 2);
    attributes[key] = { label, value: val };
  }
  return attributes;
}

function extractVtmSecondary(
  input: Record<string, unknown>,
): Record<string, string | number> {
  const secondary: Record<string, string | number> = {};
  if (input.blood_potency !== undefined)
    secondary.blood_potency = Number(input.blood_potency);
  if (input.clan) secondary.clan = String(input.clan);
  if (input.generation) secondary.generation = Number(input.generation);
  return secondary;
}

function extractVtmDisciplines(
  input: Record<string, unknown>,
): StatBlockIR["traitsAndFeatures"] {
  const rawDisc = input.disciplines;
  if (Array.isArray(rawDisc)) return rawDisc.flatMap(parseDiscipline);
  if (typeof rawDisc !== "object" || rawDisc === null) return [];
  return Object.entries(rawDisc).map(([name, dots]) => ({
    name: `${name} ${dots}`,
    text: "",
    category: "discipline" as const,
  }));
}

function parseDiscipline(value: unknown): StatBlockIR["traitsAndFeatures"] {
  if (typeof value === "string") {
    return [{ name: value, text: "", category: "discipline" }];
  }
  if (typeof value !== "object" || value === null) return [];
  const discipline = value as Record<string, unknown>;
  const dots = discipline.dots ?? discipline.level;
  return [
    {
      name: `${stringOr(discipline.name, "Discipline")}${suffix(dots)}`,
      text: firstString([
        discipline.powers,
        discipline.text,
        discipline.description,
      ]),
      category: "discipline",
    },
  ];
}

function stringOr(value: unknown, fallback: string): string {
  return String(value || fallback);
}

function suffix(value: unknown): string {
  return value === undefined ? "" : ` ${value}`;
}

function firstString(values: unknown[]): string {
  return String(values.find(Boolean) || "");
}
