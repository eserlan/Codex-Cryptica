/**
 * Public-surface adapters: bridge between the campaign generator package and
 * the existing SEO generator output shape used by public marketing pages.
 *
 * These adapters are intentionally thin — they call the same local generators
 * that back the in-app workflow and map their output to the public
 * GeneratorOutput interface without requiring any AI or vault access.
 */

import { getGenerator } from "./campaign-generator-registry";
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
}

function toPublic(draft: GeneratedDraft): PublicGeneratorOutput {
  return {
    type: draft.entityType,
    title: draft.title,
    summary: draft.summary,
    content: draft.lore,
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
