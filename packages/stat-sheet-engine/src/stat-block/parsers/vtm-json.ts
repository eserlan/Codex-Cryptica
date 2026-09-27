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
  const traits: StatBlockIR["traitsAndFeatures"] = [];
  const rawDisc = input.disciplines;

  if (Array.isArray(rawDisc)) {
    for (const d of rawDisc) {
      if (typeof d === "object" && d !== null) {
        const dName = String(d.name || "Discipline");
        const dots =
          d.dots !== undefined || d.level !== undefined
            ? ` ${d.dots ?? d.level}`
            : "";
        traits.push({
          name: `${dName}${dots}`,
          text: String(d.powers || d.text || d.description || ""),
          category: "discipline",
        });
      } else if (typeof d === "string") {
        traits.push({
          name: d,
          text: "",
          category: "discipline",
        });
      }
    }
  } else if (typeof rawDisc === "object" && rawDisc !== null) {
    for (const [discName, dots] of Object.entries(rawDisc)) {
      traits.push({
        name: `${discName} ${dots}`,
        text: "",
        category: "discipline",
      });
    }
  }

  return traits;
}
