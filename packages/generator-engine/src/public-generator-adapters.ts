/**
 * Public-surface adapters: bridge between the campaign generator package and
 * the existing SEO generator output shape used by public marketing pages.
 *
 * These adapters are intentionally thin — they call the same local generators
 * that back the in-app workflow and map their output to the public
 * GeneratorOutput interface without requiring any AI or vault access.
 */

import { getGenerator } from "./campaign-generator-registry";
import { generateShipLocal } from "./public-ship";
import type { ShipGeneratorOptions } from "./public-ship";
import type {
  GeneratedDraft,
  GeneratorRunRequest,
} from "./campaign-generator-types";

/** Minimal subset of the SEO GeneratorOutput used by public pages. */
export interface PublicGeneratorOutput {
  type: string;
  title: string;
  summary?: string;
  content: string;
  lore: string;
  labels: string[];
  status: "active" | "draft";
  /**
   * Set when AI generation was requested but failed and the engine fell back to
   * local tables. Lets the UI surface a friendly "AI was unavailable" notice
   * (#1494). Absent on ordinary AI or explicitly-local results.
   */
  aiFallback?: boolean;
}

/** First non-blank value, or the last one if all are blank. */
function firstNonBlank(...values: Array<string | undefined>): string {
  for (const v of values) {
    if (v && v.trim()) return v;
  }
  return values[values.length - 1] ?? "";
}

function toPublic(draft: GeneratedDraft): PublicGeneratorOutput {
  return {
    type: draft.entityType,
    title: draft.title,
    summary: draft.summary,
    // Prefer the rich body; fall back to lore, then the one-line summary, so the
    // public page always renders a full body even for local-only generators.
    // Uses a non-blank check so an empty-string `content` still falls back.
    content: firstNonBlank(draft.content, draft.lore, draft.summary),
    lore: draft.lore,
    labels: [...(draft.labels ?? [])],
    status: "active",
  };
}

function baseReq(
  generatorId: GeneratorRunRequest["generatorId"],
  options: Record<string, unknown>,
  themeId = "workspace",
): GeneratorRunRequest {
  return { generatorId, options, useAI: false, themeId };
}

/** Generate an NPC using the package's local generator. */
export function adaptNPC(
  options: Record<string, unknown> = {},
  themeId?: string,
): PublicGeneratorOutput {
  const gen = getGenerator("npc");
  const req = baseReq("npc", options, themeId);
  return toPublic(gen.mapOutputToDraft(gen.generate(req), req));
}

/** Generate a Faction using the package's local generator. */
export function adaptFaction(
  options: Record<string, unknown> = {},
  themeId?: string,
): PublicGeneratorOutput {
  const gen = getGenerator("faction");
  const req = baseReq("faction", options, themeId);
  return toPublic(gen.mapOutputToDraft(gen.generate(req), req));
}

/** Generate a Settlement using the package's local generator. */
export function adaptSettlement(
  options: Record<string, unknown> = {},
  themeId?: string,
): PublicGeneratorOutput {
  const gen = getGenerator("settlement");
  const req = baseReq("settlement", options, themeId);
  return toPublic(gen.mapOutputToDraft(gen.generate(req), req));
}

/** Generate a Magic Item using the package's local generator. */
export function adaptMagicItem(
  options: Record<string, unknown> = {},
  themeId?: string,
): PublicGeneratorOutput {
  const gen = getGenerator("magic-item");
  const req = baseReq("magic-item", options, themeId);
  return toPublic(gen.mapOutputToDraft(gen.generate(req), req));
}

/** Generate an Event using the package's local generator. */
export function adaptEvent(
  options: Record<string, unknown> = {},
  themeId?: string,
): PublicGeneratorOutput {
  const gen = getGenerator("event");
  const req = baseReq("event", options, themeId);
  return toPublic(gen.mapOutputToDraft(gen.generate(req), req));
}

/**
 * Generate a Vampire Clan. There is no dedicated `vampire` generator id; a
 * vampire clan is a faction generated under the gothic vampire theme, matching
 * the SEO `generateVampireClan` surface.
 */
export function adaptVampire(
  options: Record<string, unknown> = {},
  themeId = "vampire-gothic-noir",
): PublicGeneratorOutput {
  const gen = getGenerator("faction");
  const req = baseReq("faction", options, themeId);
  return toPublic(gen.mapOutputToDraft(gen.generate(req), req));
}

/** Generate a Ship using the package's local generator. */
export function adaptShip(
  options: ShipGeneratorOptions = {},
): PublicGeneratorOutput {
  return generateShipLocal(options);
}
