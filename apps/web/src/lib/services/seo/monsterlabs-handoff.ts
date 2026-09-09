/**
 * MonsterLabs collaboration (#2871, #2872): hand Codex characters, creatures,
 * and items off to MonsterLabs' D&D monster and magic item generators so
 * fiction-first content can become playable mechanics without copy/paste.
 * Built on the generic outbound handoff in `$lib/utils/external-generator-handoff`.
 */
import {
  sendToExternalGenerator,
  openPendingExternalGeneratorTab,
  type ExternalGeneratorHandoffResult,
} from "$lib/utils/external-generator-handoff";
import {
  compressMonsterLabsDescription,
  MONSTERLABS_PROMPT_CHAR_LIMIT,
} from "./monsterlabs-description-compression";

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
 * Builds the prompt, compressing the description with the Oracle first if
 * the full prompt would exceed MonsterLabs' own apparent ~1000-character
 * limit on the `prompt` parameter (observed in practice — MonsterLabs
 * truncates/rejects longer submissions on its end, independent of Codex's
 * own much larger URL-length guard). The Name/Type header is preserved
 * exactly; only the description is compressed, and only by as much as
 * needed to fit the remaining budget.
 */
async function buildMonsterLabsPromptWithinLimit(
  source: MonsterLabsHandoffSource,
  limit: number = MONSTERLABS_PROMPT_CHAR_LIMIT,
): Promise<string> {
  const fullPrompt = buildMonsterLabsPrompt(source);
  if (!fullPrompt || fullPrompt.length <= limit) return fullPrompt;

  const description = source.description.trim();
  const header = fullPrompt.slice(0, fullPrompt.length - description.length);
  const descriptionBudget = Math.max(0, limit - header.length);
  const compressedDescription = await compressMonsterLabsDescription(
    description,
    descriptionBudget,
  );
  return header + compressedDescription;
}

async function sendMonsterLabsHandoff(
  baseUrl: string,
  source: MonsterLabsHandoffSource,
  windowRef?: Pick<Window, "open">,
): Promise<ExternalGeneratorHandoffResult> {
  if (!source.description.trim()) {
    return { ok: false, reason: "empty-content" };
  }

  // Opened synchronously (still inside the caller's click handler, before
  // this function's first `await`) so the browser attributes it to the
  // user gesture instead of blocking it as a popup once the async
  // compression pass below has run.
  const pendingTab = openPendingExternalGeneratorTab(windowRef);

  const content = await buildMonsterLabsPromptWithinLimit(source);
  return sendToExternalGenerator({
    baseUrl,
    paramName: PROMPT_PARAM_NAME,
    content,
    extraParams: ATTRIBUTION_PARAMS,
    windowRef,
    pendingTab,
  });
}

/**
 * Sends a Codex character or creature to MonsterLabs' D&D monster generator
 * in a new tab. Returns the same result shape as the underlying handoff
 * helper so a caller can surface an explicit error instead of content
 * silently going missing.
 */
export async function sendToMonsterLabsMonsterGenerator(
  source: MonsterLabsHandoffSource,
  windowRef?: Pick<Window, "open">,
): Promise<ExternalGeneratorHandoffResult> {
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
export async function sendToMonsterLabsMagicItemGenerator(
  source: MonsterLabsHandoffSource,
  windowRef?: Pick<Window, "open">,
): Promise<ExternalGeneratorHandoffResult> {
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
export async function sendEntityToMonsterLabs(
  source: MonsterLabsHandoffSource,
  windowRef?: Pick<Window, "open">,
): Promise<ExternalGeneratorHandoffResult> {
  return isMonsterLabsItemEligibleType(source.type)
    ? sendToMonsterLabsMagicItemGenerator(source, windowRef)
    : sendToMonsterLabsMonsterGenerator(source, windowRef);
}
