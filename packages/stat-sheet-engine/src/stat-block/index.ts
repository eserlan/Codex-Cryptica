import { detectStatBlockSystem } from "./detect";
import { parseDnd5eJson } from "./parsers/dnd5e-json";
import { parsePf2eJson } from "./parsers/pf2e-json";
import { parseMythrasJson } from "./parsers/mythras-json";
import { parseVtmJson } from "./parsers/vtm-json";
import { parseGurpsJson } from "./parsers/gurps-json";
import { parseTextStatBlock } from "./parsers/text-heuristic";
import { mapIrToStatSheet } from "./mapper";
import type {
  StatBlockImportOptions,
  StatBlockImportResult,
  StatBlockIR,
} from "./types";

export * from "./types";
export * from "./detect";
export * from "./mapper";
export * from "./parsers/dnd5e-json";
export * from "./parsers/pf2e-json";
export * from "./parsers/mythras-json";
export * from "./parsers/vtm-json";
export * from "./parsers/gurps-json";
export * from "./parsers/text-heuristic";

/**
 * Universal stat block import pipeline entry point.
 * Ingests JSON objects or raw text, detects the TTRPG system, builds
 * intermediate representation (IR), and maps to concrete StatSheet fields.
 */
export function importStatBlock(
  input: unknown,
  options: StatBlockImportOptions = {},
): StatBlockImportResult {
  const detectedSystem = options.systemHint || detectStatBlockSystem(input);

  let ir: StatBlockIR;

  if (typeof input === "object" && input !== null) {
    const obj = input as Record<string, unknown>;
    switch (detectedSystem) {
      case "pf2e":
        ir = parsePf2eJson(obj);
        break;
      case "mythras":
        ir = parseMythrasJson(obj);
        break;
      case "vtm":
        ir = parseVtmJson(obj);
        break;
      case "gurps":
        ir = parseGurpsJson(obj);
        break;
      case "dnd5e":
      case "tales-of-the-valiant":
      default:
        ir = parseDnd5eJson(obj);
        ir.system = detectedSystem;
        break;
    }
  } else if (typeof input === "string") {
    ir = parseTextStatBlock(input, detectedSystem);
    ir.system = detectedSystem;
  } else {
    throw new Error("Invalid stat block input: expected string or object");
  }

  if (options.category) {
    ir.identity.category = options.category;
  }

  return mapIrToStatSheet(ir, { targetTemplateId: options.targetTemplateId });
}
