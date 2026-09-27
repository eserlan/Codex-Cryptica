import type { StatBlockIR } from "../types";

/** Parses the common GCS/GURPS JSON export shape. */
export function parseGurpsJson(input: Record<string, unknown>): StatBlockIR {
  const calc = asRecord(input.calc);
  const hp = readNumericValue(calc?.hp ?? input.hp, 10);
  const fp = readNumericValue(calc?.fp ?? input.fp, 10);

  return {
    system: "gurps",
    identity: {
      name: String(
        input.name ?? input.character_name ?? "Unnamed GURPS Character",
      ).trim(),
      category: "character",
    },
    vitals: [
      { id: "hp", label: "Hit Points", current: hp, max: hp, min: 0 },
      { id: "fp", label: "Fatigue Points", current: fp, max: fp, min: 0 },
    ],
    attributes: extractGurpsAttributes(input.attributes),
    defences: { secondaryDefences: extractGurpsSecondary(calc, input) },
    actionsAndAttacks: [],
    traitsAndFeatures: [],
    rawSource: JSON.stringify(input),
  };
}

function extractGurpsAttributes(raw: unknown): StatBlockIR["attributes"] {
  const attributes: StatBlockIR["attributes"] = {};
  const rawAttributes = Array.isArray(raw) ? raw : [];

  for (const [id, label] of [
    ["st", "ST"],
    ["dx", "DX"],
    ["iq", "IQ"],
    ["ht", "HT"],
  ]) {
    const attribute = rawAttributes.find((item) => attributeId(item) === id);
    attributes[id] = {
      label,
      value: readNumericValue(attributeValue(attribute), 10),
    };
  }

  return attributes;
}

function attributeId(value: unknown): string | undefined {
  const record = asRecord(value);
  return typeof record?.attr_id === "string"
    ? record.attr_id.toLowerCase()
    : undefined;
}

function attributeValue(value: unknown): unknown {
  const record = asRecord(value);
  return record?.calc ?? record?.value ?? record?.score;
}

function extractGurpsSecondary(
  calc: Record<string, unknown> | undefined,
  input: Record<string, unknown>,
): Record<string, string | number> {
  const secondary: Record<string, string | number> = {};
  const basicSpeed = readOptionalNumber(calc?.basic_speed ?? input.basic_speed);
  const move = readOptionalNumber(calc?.move ?? input.move);
  if (basicSpeed !== undefined) secondary.basic_speed = basicSpeed;
  if (move !== undefined) secondary.move = move;
  return secondary;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function readNumericValue(value: unknown, fallback: number): number {
  const record = asRecord(value);
  const raw = record ? (record.value ?? record.score) : value;
  const number = Number(raw);
  return raw === undefined || !Number.isFinite(number) ? fallback : number;
}

function readOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}
