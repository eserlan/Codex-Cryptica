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

function isFoundryActor(obj: Record<string, unknown>): StatBlockSystem | null {
  if (
    !("system" in obj) ||
    typeof obj.system !== "object" ||
    obj.system === null
  ) {
    return null;
  }
  const sys = obj.system as Record<string, unknown>;
  if (
    !("attributes" in sys) ||
    typeof sys.attributes !== "object" ||
    sys.attributes === null
  ) {
    return null;
  }
  const attrs = sys.attributes as Record<string, unknown>;
  if ("perception" in attrs && "ac" in attrs && "hp" in attrs) return "pf2e";
  if ("hp" in attrs && "ac" in attrs) return "dnd5e";
  return null;
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
  const hasStr = "str" in obj || "strength" in obj;
  const hasDex = "dex" in obj || "dexterity" in obj;
  const hasCon = "con" in obj || "constitution" in obj;
  const hasHp = "hp" in obj || "hit_points" in obj;

  if (hasStr && hasDex && hasCon && hasHp) {
    return "luck" in obj || "doom" in obj ? "tales-of-the-valiant" : "dnd5e";
  }
  return null;
}

function detectFromObject(obj: Record<string, unknown>): StatBlockSystem {
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
    lower.includes("armor class") || lower.includes("hit points");
  if (!hasDefence) return null;

  if (
    lower.includes("luck points") ||
    lower.includes("doom") ||
    lower.includes("tales of the valiant")
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
