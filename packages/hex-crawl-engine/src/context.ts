import { getHexRange, hexDistance, type HexCoord } from "map-engine";
import type { HexCrawlState, HexRecord } from "./model";
import { toHexKey } from "./model";
import { terrainLabel } from "./terrain";

/** Limits from research D11 and data-model.md section 8. */
export const HEX_CONTEXT_LIMITS = {
  neighbourRadius: 2,
  neighbourHexes: 18,
  neighbourEntities: 12,
  contents: 8,
  nearestLocations: 5,
  nearestFactions: 5,
  entityExcerpt: 600,
  notesExcerpt: 1_500,
  campaign: 1_500,
  total: 8_000,
} as const;

export interface ContextEntity {
  entityId: string;
  title: string;
  type: string;
  summary: string;
  hex: HexCoord;
}

export interface HexContextInput {
  hex: HexCoord;
  label: string;
  record?: HexRecord;
  state: HexCrawlState;
  /** Every pinned entity on the map, each with its hex. */
  entities: readonly ContextEntity[];
  /** Formats a neighbour hex as the map shows it. */
  labelFor: (hex: HexCoord) => string;
  region?: { title: string; summary: string };
  campaign?: string;
}

export interface ContextEntry {
  title: string;
  type: string;
  summary: string;
}

export interface NeighbourContext {
  label: string;
  distance: number;
  terrain?: string;
  explored: boolean;
  entities: ContextEntry[];
}

export interface HexContext {
  hex: {
    label: string;
    terrain?: string;
    notes?: string;
    aiNotes?: string;
  };
  contents: ContextEntry[];
  neighbours: NeighbourContext[];
  nearestLocations: { title: string; distance: number }[];
  nearestFactions: { title: string; distance: number }[];
  region?: { title: string; summary: string };
  campaign?: string;
}

const ELLIPSIS = "…";

function excerpt(text: string | undefined, max: number): string | undefined {
  if (text === undefined) return undefined;
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max - 1) + ELLIPSIS;
}

function entryOf(entity: ContextEntity): ContextEntry {
  return {
    title: entity.title,
    type: entity.type,
    summary: excerpt(entity.summary, HEX_CONTEXT_LIMITS.entityExcerpt) ?? "",
  };
}

function byTitleThenId(
  a: { title: string; entityId: string },
  b: { title: string; entityId: string },
): number {
  const byTitle = a.title.localeCompare(b.title, "en", { sensitivity: "base" });
  if (byTitle !== 0) return byTitle;
  return a.entityId < b.entityId ? -1 : a.entityId > b.entityId ? 1 : 0;
}

function sameHex(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r;
}

function neighbourEntries(
  input: HexContextInput,
  hex: HexCoord,
  budget: { left: number },
): ContextEntry[] {
  const pinned = input.entities
    .filter((entity) => sameHex(entity.hex, hex))
    .sort(byTitleThenId);
  const kept = pinned.slice(0, budget.left);
  budget.left -= kept.length;
  return kept.map(entryOf);
}

function buildNeighbours(input: HexContextInput): NeighbourContext[] {
  const radius = HEX_CONTEXT_LIMITS.neighbourRadius;
  const candidates = getHexRange(input.hex, radius)
    .filter((hex) => !sameHex(hex, input.hex))
    .map((hex) => ({
      hex,
      distance: hexDistance(hex, input.hex),
      record: input.state.hexes[toHexKey(hex)],
      hasEntities: input.entities.some((e) => sameHex(e.hex, hex)),
    }))
    .filter((c) => c.record !== undefined || c.hasEntities)
    .sort(
      (a, b) =>
        a.distance - b.distance ||
        input.labelFor(a.hex).localeCompare(input.labelFor(b.hex), "en"),
    )
    .slice(0, HEX_CONTEXT_LIMITS.neighbourHexes);

  const budget = { left: HEX_CONTEXT_LIMITS.neighbourEntities };
  return candidates.map((c) => ({
    label: input.labelFor(c.hex),
    distance: c.distance,
    terrain: c.record?.terrain ? terrainLabel(c.record.terrain) : undefined,
    explored: c.record?.explored === true,
    entities: neighbourEntries(input, c.hex, budget),
  }));
}

function nearestOfType(
  input: HexContextInput,
  type: string,
  limit: number,
): { title: string; distance: number }[] {
  return input.entities
    .filter((e) => e.type === type)
    .map((e) => ({ ...e, distance: hexDistance(e.hex, input.hex) }))
    .sort((a, b) => a.distance - b.distance || byTitleThenId(a, b))
    .slice(0, limit)
    .map((e) => ({ title: e.title, distance: e.distance }));
}

/**
 * Gathers bounded, plain data for one hex (research D11). The engine never
 * reads the vault: the caller supplies every entity and block.
 */
export function buildHexContext(input: HexContextInput): HexContext {
  const record = input.record;
  const contents = input.entities
    .filter((e) => sameHex(e.hex, input.hex))
    .sort(byTitleThenId)
    .slice(0, HEX_CONTEXT_LIMITS.contents)
    .map(entryOf);

  return {
    hex: {
      label: input.label,
      terrain: record?.terrain ? terrainLabel(record.terrain) : undefined,
      notes: excerpt(record?.notes, HEX_CONTEXT_LIMITS.notesExcerpt),
      aiNotes: excerpt(record?.aiNotes, HEX_CONTEXT_LIMITS.notesExcerpt),
    },
    contents,
    neighbours: buildNeighbours(input),
    nearestLocations: nearestOfType(
      input,
      "location",
      HEX_CONTEXT_LIMITS.nearestLocations,
    ),
    nearestFactions: nearestOfType(
      input,
      "faction",
      HEX_CONTEXT_LIMITS.nearestFactions,
    ),
    region: input.region
      ? {
          title: input.region.title,
          summary:
            excerpt(input.region.summary, HEX_CONTEXT_LIMITS.entityExcerpt) ??
            "",
        }
      : undefined,
    campaign: excerpt(input.campaign, HEX_CONTEXT_LIMITS.campaign),
  };
}

function entryLine(entry: ContextEntry): string {
  return entry.summary
    ? `- ${entry.title} (${entry.type}): ${entry.summary}`
    : `- ${entry.title} (${entry.type})`;
}

function renderLines(ctx: HexContext): string[] {
  return [
    ...renderHexLines(ctx),
    ...renderNeighbourLines(ctx),
    ...renderNearestLines(ctx),
    ...renderRegionLines(ctx),
  ];
}

function renderHexLines(ctx: HexContext): string[] {
  const terrain = ctx.hex.terrain ? `, ${ctx.hex.terrain}` : "";
  const lines = [`Hex ${ctx.hex.label}${terrain}`];
  if (ctx.hex.notes) lines.push(`GM notes: ${ctx.hex.notes}`);
  if (ctx.hex.aiNotes) lines.push(`Earlier AI notes: ${ctx.hex.aiNotes}`);
  if (ctx.contents.length > 0) {
    lines.push("Entities in this hex:", ...ctx.contents.map(entryLine));
  }
  return lines;
}

function renderNeighbourLines(ctx: HexContext): string[] {
  if (ctx.neighbours.length === 0) return [];
  const lines = ["Neighbouring hexes (within 2):"];
  for (const n of ctx.neighbours) {
    const parts = [
      n.label,
      `${n.distance} away`,
      n.terrain,
      n.explored ? "explored" : undefined,
    ];
    lines.push(`- ${parts.filter(Boolean).join(", ")}`);
    lines.push(...n.entities.map((e) => `  ${entryLine(e)}`));
  }
  return lines;
}

function renderNearestLines(ctx: HexContext): string[] {
  const lines: string[] = [];
  if (ctx.nearestLocations.length > 0) {
    const list = ctx.nearestLocations.map(
      (l) => `${l.title} (${l.distance} away)`,
    );
    lines.push(`Nearest locations: ${list.join(", ")}`);
  }
  if (ctx.nearestFactions.length > 0) {
    const list = ctx.nearestFactions.map(
      (f) => `${f.title} (${f.distance} away)`,
    );
    lines.push(`Nearest factions: ${list.join(", ")}`);
  }
  return lines;
}

function renderRegionLines(ctx: HexContext): string[] {
  const lines: string[] = [];
  if (ctx.region)
    lines.push(`Region: ${ctx.region.title}. ${ctx.region.summary}`.trimEnd());
  if (ctx.campaign) lines.push(`Campaign context:\n${ctx.campaign}`);
  return lines;
}

/**
 * Serialises context for a prompt. Deterministic: the same context always
 * renders the same text, and the result never exceeds the total limit.
 */
export function renderHexContext(ctx: HexContext): string {
  const text = renderLines(ctx).join("\n");
  const max = HEX_CONTEXT_LIMITS.total;
  return text.length <= max ? text : text.slice(0, max - 1) + ELLIPSIS;
}
