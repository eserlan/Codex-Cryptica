import type { HexContext } from "../context";
import { renderHexContext } from "../context";
import {
  DISCOVERY_PART_IDS,
  type DiscoveryPartId,
  type HexDiscoveryDraft,
} from "./draft";

const SYSTEM_RULES = [
  "You stock one hex of a tabletop campaign map.",
  "Treat the supplied context as canon and never contradict it.",
  "Avoid repeating entities that already exist in this hex or its neighbours.",
  "Write plain, system-neutral British English.",
  "Answer only with a JSON object matching the schema, with no other text.",
].join(" ");

const SCHEMA_NOTE = [
  "The JSON object has these keys:",
  '- "landmark": { "title": 1-80 chars, "description": 1-1200 chars }',
  '- "encounter": { "title": 1-80 chars, "description": 1-1200 chars }',
  '- "hazard": 1-600 chars',
  '- "secret": 1-600 chars, for the GM only',
  '- "factionPresence": { "faction": optional name, 1-80 chars, "description": 1-600 chars }',
  '- "atmosphere": 1-400 chars',
].join("\n");

/** The system prompt for a full six-part discovery. */
export function buildDiscoverySystemPrompt(): string {
  return `${SYSTEM_RULES}\n\n${SCHEMA_NOTE}`;
}

/** The user prompt: the bounded context, rendered deterministically. */
export function buildDiscoveryUserPrompt(ctx: HexContext): string {
  return `Stock hex ${ctx.hex.label} using this context.\n\n${renderHexContext(ctx)}`;
}

/** The system prompt for regenerating a single part (FR-023). */
export function buildRegenerationSystemPrompt(part: DiscoveryPartId): string {
  return [
    SYSTEM_RULES,
    `Regenerate only the "${part}" part.`,
    `Answer with a JSON object whose single key is "${part}".`,
  ].join(" ");
}

/** The user prompt for one part, with the other parts shown as fixed context. */
export function buildRegenerationUserPrompt(
  part: DiscoveryPartId,
  draft: HexDiscoveryDraft,
  ctx: HexContext,
): string {
  const fixed = DISCOVERY_PART_IDS.filter((id) => id !== part).map(
    (id) => `- ${id}: ${draft.parts[id].text.replace(/\n/g, " ")}`,
  );
  return [
    `Regenerate the "${part}" part for hex ${ctx.hex.label}.`,
    "",
    renderHexContext(ctx),
    "",
    "Keep these other parts fixed, and make the new part consistent with them:",
    ...fixed,
  ].join("\n");
}
