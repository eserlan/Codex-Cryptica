/**
 * MonsterLabs collaboration (#2871): hand Codex characters and creatures off
 * to MonsterLabs' D&D monster generator so fiction-first content can become
 * a playable stat block without copy/paste. Built on the generic outbound
 * handoff in `$lib/utils/external-generator-handoff`.
 */
import {
  sendToExternalGenerator,
  type ExternalGeneratorHandoffResult,
} from "$lib/utils/external-generator-handoff";

export const MONSTERLABS_MONSTER_GENERATOR_URL =
  "https://monsterlabs.app/dnd-monster-generator";

const PROMPT_PARAM_NAME = "prompt";

/** Agreed attribution so both projects can measure usage from the collaboration. */
const ATTRIBUTION_PARAMS = { utm_source: "codexcryptica" };

/** The Codex entity/draft types MonsterLabs can turn into a D&D monster. */
export function isMonsterLabsEligibleType(
  type: string | undefined,
): type is "character" | "creature" {
  return type === "character" || type === "creature";
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
  const description = source.description.trim();
  if (!description) {
    return "";
  }

  return [
    `Name: ${source.name}`,
    `Type: ${titleCase(source.type)}`,
    "",
    description,
  ].join("\n");
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
  return sendToExternalGenerator({
    baseUrl: MONSTERLABS_MONSTER_GENERATOR_URL,
    paramName: PROMPT_PARAM_NAME,
    content: buildMonsterLabsPrompt(source),
    extraParams: ATTRIBUTION_PARAMS,
    windowRef,
  });
}
