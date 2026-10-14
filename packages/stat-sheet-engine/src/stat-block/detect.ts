// fallow-ignore-file complexity
import type { StatBlockSystem } from "./types";

/**
 * Detects the TTRPG system from structured JSON object or raw text.
 */
export function detectStatBlockSystem(input: unknown): StatBlockSystem {
  if (typeof input === "object" && input !== null) {
    return detectFromObject(input as Record<string, unknown>);
  }

  if (typeof input === "string") {
    return detectFromText(input);
  }

  return "generic";
}

function isPathbuilderObject(obj: Record<string, unknown>): boolean {
  return "build" in obj && typeof obj.build === "object" && obj.build !== null;
}

// fallow-ignore-next-line complexity
function isFoundryTovActor(
  flags: Record<string, unknown> | null,
  system: Record<string, unknown> | null,
  attrs: Record<string, unknown> | null,
): boolean {
  if (flags?.["black-flag"] !== undefined || flags?.blackFlag !== undefined) {
    return true;
  }
  if (
    system?.rules === "black-flag" ||
    system?.rules === "tales-of-the-valiant"
  ) {
    return true;
  }
  if (typeof system?.source === "string") {
    const s = system.source.toLowerCase();
    if (s.includes("tales of the valiant") || s.includes("black flag")) {
      return true;
    }
  }
  if (attrs && (attrs.luck !== undefined || attrs.doom !== undefined)) {
    return true;
  }
  const details = asRecord(system?.details);
  if (details && ("lineage" in details || "heritage" in details)) {
    return true;
  }
  return false;
}

function isFoundryActor(obj: Record<string, unknown>): StatBlockSystem | null {
  const flags = asRecord(obj.flags);
  const system = asRecord(obj.system);
  const attrs = asRecord(system?.attributes);

  if (isFoundryTovActor(flags, system, attrs)) {
    return "tales-of-the-valiant";
  }

  if (!attrs) return null;
  if (hasKeys(attrs, ["perception", "ac", "hp"])) return "pf2e";
  if (hasKeys(attrs, ["hp", "ac"])) return "dnd5e";
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function hasKeys(record: Record<string, unknown>, keys: string[]): boolean {
  return keys.every((key) => key in record);
}

function isMythrasObject(obj: Record<string, unknown>): boolean {
  return (
    "action_points" in obj ||
    "hit_locations" in obj ||
    ("pow" in obj && "siz" in obj)
  );
}

function isVtmObject(obj: Record<string, unknown>): boolean {
  return (
    "hunger" in obj ||
    "blood_potency" in obj ||
    "humanity" in obj ||
    "disciplines" in obj
  );
}

function isGurpsObject(obj: Record<string, unknown>): boolean {
  if ("calc" in obj && typeof obj.calc === "object") return true;
  if ("attributes" in obj && Array.isArray(obj.attributes)) {
    return obj.attributes.some((a: any) => a?.attr_id === "ST");
  }
  return false;
}

function isDnd5eObject(obj: Record<string, unknown>): StatBlockSystem | null {
  if (obj.system === "tales-of-the-valiant" || obj.system === "black-flag") {
    return "tales-of-the-valiant";
  }

  const required = [
    ["str", "strength"],
    ["dex", "dexterity"],
    ["con", "constitution"],
    ["hp", "hit_points"],
  ];
  if (!required.every((aliases) => aliases.some((key) => key in obj)))
    return null;
  return "luck" in obj ||
    "doom" in obj ||
    "doomPoints" in obj ||
    "lineage" in obj ||
    "heritage" in obj ||
    "talents" in obj
    ? "tales-of-the-valiant"
    : "dnd5e";
}

function detectFromObject(obj: Record<string, unknown>): StatBlockSystem {
  if (obj.system === "tales-of-the-valiant" || obj.system === "black-flag") {
    return "tales-of-the-valiant";
  }

  if (isPathbuilderObject(obj)) return "pf2e";

  const foundrySystem = isFoundryActor(obj);
  if (foundrySystem) return foundrySystem;

  if (isMythrasObject(obj)) return "mythras";
  if (isVtmObject(obj)) return "vtm";
  if (isGurpsObject(obj)) return "gurps";

  const dndSystem = isDnd5eObject(obj);
  if (dndSystem) return dndSystem;

  return "generic";
}

function isMythrasText(lower: string): boolean {
  const hasHitLocOrAp =
    lower.includes("hit locations") || lower.includes("action points");
  const hasMythrasTerms =
    lower.includes("1d100") ||
    lower.includes("combat style") ||
    lower.includes("pow") ||
    lower.includes("ap /");
  return hasHitLocOrAp && hasMythrasTerms;
}

function isVtmText(lower: string): boolean {
  const hasBloodOrDisc =
    lower.includes("blood potency") ||
    lower.includes("disciplines") ||
    lower.includes("hunger");
  const hasWodLore =
    lower.includes("clan") ||
    lower.includes("coterie") ||
    lower.includes("humanity");
  return hasBloodOrDisc && hasWodLore;
}

function isGurpsText(lower: string): boolean {
  const hasGurpsAttrs =
    lower.includes("st [") ||
    lower.includes("st:") ||
    lower.includes("basic speed");
  const hasGurpsCombat =
    lower.includes("fatigue") ||
    lower.includes("thrust") ||
    lower.includes("swing");
  return hasGurpsAttrs && hasGurpsCombat;
}

function isPf2eText(lower: string): boolean {
  const hasPerception = lower.includes("perception +");
  const hasPfSaves =
    lower.includes("fortitude +") ||
    lower.includes("reflex +") ||
    lower.includes("will +");
  const hasPfKeywords =
    lower.includes("stride") ||
    lower.includes("strike") ||
    lower.includes("ac ");
  return hasPerception && hasPfSaves && hasPfKeywords;
}

function isDndText(lower: string): StatBlockSystem | null {
  const hasDefence =
    lower.includes("armor class") ||
    lower.includes("hit points") ||
    lower.includes("ac ");
  if (!hasDefence) return null;

  if (
    lower.includes("luck points") ||
    lower.includes("doom points") ||
    lower.includes("tales of the valiant") ||
    lower.includes("black flag") ||
    (lower.includes("lineage") && lower.includes("heritage")) ||
    lower.includes("luck:") ||
    lower.includes("doom:")
  ) {
    return "tales-of-the-valiant";
  }
  if (
    lower.includes("challenge") ||
    lower.includes("str") ||
    lower.includes("saving throws")
  ) {
    return "dnd5e";
  }
  return null;
}

function detectFromText(text: string): StatBlockSystem {
  const lower = text.toLowerCase();

  if (isMythrasText(lower)) return "mythras";
  if (isVtmText(lower)) return "vtm";
  if (isGurpsText(lower)) return "gurps";
  if (isPf2eText(lower)) return "pf2e";

  const dndMatch = isDndText(lower);
  if (dndMatch) return dndMatch;

  return "generic";
}
