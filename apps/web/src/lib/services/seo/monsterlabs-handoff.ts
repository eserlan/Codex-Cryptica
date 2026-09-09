/**
 * MonsterLabs collaboration (#2871, #2872): hand Codex characters, creatures,
 * and items off to MonsterLabs' D&D monster and magic item generators so
 * fiction-first content can become playable mechanics without copy/paste.
 * Built on the generic outbound handoff in `$lib/utils/external-generator-handoff`.
 */
import {
  sendToExternalGenerator,
  type ExternalGeneratorHandoffResult,
} from "$lib/utils/external-generator-handoff";

export const MONSTERLABS_MONSTER_GENERATOR_URL =
  "https://monsterlabs.app/dnd-monster-generator";

export const MONSTERLABS_MAGIC_ITEM_GENERATOR_URL =
  "https://monsterlabs.app/dnd-magic-item-generator";

const PROMPT_PARAM_NAME = "prompt";

/** Agreed attribution so both projects can measure usage from the collaboration. */
const ATTRIBUTION_PARAMS = { utm_source: "codexcryptica" };

/** The Codex entity/draft types MonsterLabs can turn into a D&D monster. */
export function isMonsterLabsEligibleType(
  type: string | undefined,
): type is "character" | "creature" {
  return type === "character" || type === "creature";
}

/** The Codex entity/draft types MonsterLabs can turn into a D&D magic item. */
export function isMonsterLabsItemEligibleType(
  type: string | undefined,
): type is "item" {
  return type === "item";
}

export interface MonsterLabsHandoffSource {
  /** Entity/draft title. */
  name: string;
  /** Codex entity type, e.g. "character" or "creature". */
  type: string;
  /** Body/lore content. Codex stays a handoff, not a D&D rules author, so this is sent as-is rather than pre-transformed into invented stats. */
  description: string;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Builds the readable prompt MonsterLabs receives: name and type up front so
 * it reads as a character sheet, then the fiction MonsterLabs infers
 * mechanics from.
 */
export function buildMonsterLabsPrompt(
  source: MonsterLabsHandoffSource,
): string {
  return [
    `Name: ${source.name}`,
    `Type: ${titleCase(source.type)}`,
    "",
    source.description.trim(),
  ]
    .join("\n")
    .trim();
}

function sendMonsterLabsHandoff(
  baseUrl: string,
  source: MonsterLabsHandoffSource,
  windowRef?: Pick<Window, "open">,
): ExternalGeneratorHandoffResult {
  return sendToExternalGenerator({
    baseUrl,
    paramName: PROMPT_PARAM_NAME,
    content: buildMonsterLabsPrompt(source),
    extraParams: ATTRIBUTION_PARAMS,
    windowRef,
  });
}

/**
 * Sends a Codex character or creature to MonsterLabs' D&D monster generator
 * in a new tab. Returns the same result shape as the underlying handoff
 * helper so a caller can surface an explicit error instead of content
 * silently going missing.
 */
export function sendToMonsterLabsMonsterGenerator(
  source: MonsterLabsHandoffSource,
  windowRef?: Pick<Window, "open">,
): ExternalGeneratorHandoffResult {
  return sendMonsterLabsHandoff(
    MONSTERLABS_MONSTER_GENERATOR_URL,
    source,
    windowRef,
  );
}

/**
 * Sends a Codex item to MonsterLabs' D&D magic item generator in a new tab.
 * Returns the same result shape as the underlying handoff helper so a
 * caller can surface an explicit error instead of content silently going
 * missing.
 */
export function sendToMonsterLabsMagicItemGenerator(
  source: MonsterLabsHandoffSource,
  windowRef?: Pick<Window, "open">,
): ExternalGeneratorHandoffResult {
  return sendMonsterLabsHandoff(
    MONSTERLABS_MAGIC_ITEM_GENERATOR_URL,
    source,
    windowRef,
  );
}

/**
 * True for any Codex entity/draft type MonsterLabs has a generator for —
 * the single gate a "send to MonsterLabs" action button should check,
 * regardless of which destination it ends up routing to.
 */
export function isMonsterLabsHandoffEligibleType(
  type: string | undefined,
): type is "character" | "creature" | "item" {
  return isMonsterLabsEligibleType(type) || isMonsterLabsItemEligibleType(type);
}

/** The action label to show, matched to which MonsterLabs generator this type routes to. */
export function getMonsterLabsActionLabel(type: string | undefined): string {
  return isMonsterLabsItemEligibleType(type)
    ? "Create D&D magic item in MonsterLabs"
    : "Create D&D monster in MonsterLabs";
}

/**
 * Routes a Codex character, creature, or item to the matching MonsterLabs
 * generator (monster vs magic item) in a new tab. The single entry point UI
 * actions should call once gated by `isMonsterLabsHandoffEligibleType`.
 */
export function sendEntityToMonsterLabs(
  source: MonsterLabsHandoffSource,
  windowRef?: Pick<Window, "open">,
): ExternalGeneratorHandoffResult {
  return isMonsterLabsItemEligibleType(source.type)
    ? sendToMonsterLabsMagicItemGenerator(source, windowRef)
    : sendToMonsterLabsMonsterGenerator(source, windowRef);
}
