import {
  pruneHexRecord,
  type HexCrawlState,
  type HexKey,
  type HexRecord,
} from "../model";
import type { Terrain } from "../terrain";
import type { RegionAdjustments, RegionProposal, RegionUndo } from "./types";

export type AppliedRegion = {
  state: HexCrawlState;
  applied: HexKey[];
  skipped: HexKey[];
  undo: Omit<RegionUndo, "mapId">;
};

/** Existing data wins: has the hex changed in a way that makes this proposal stale for it? */
function isStale(
  current: HexRecord | undefined,
  proposal: RegionProposal,
  key: HexKey,
): boolean {
  if (proposal.request.operation !== "regenerate")
    return current?.terrain !== undefined;
  return (
    !current?.terrain ||
    !current.generated ||
    (current.updatedAt ?? 0) !== proposal.stamps[key]
  );
}

/** The hex with its terrain written. Everything else on the record is carried over untouched. */
function withTerrain(
  current: HexRecord | undefined,
  proposal: RegionProposal,
  key: HexKey,
  adjusted: Terrain | undefined,
  now: number,
): HexRecord {
  const next: HexRecord = {
    ...current,
    terrain: adjusted ?? { kind: "preset", id: proposal.hexes[key] },
    updatedAt: now,
  };
  if (adjusted) delete next.generated;
  else next.generated = { seed: proposal.request.seed, rules: proposal.rules };
  return next;
}

/**
 * Write an accepted proposal into a copy of the state. A target that gained
 * terrain since the proposal was made is skipped, and for a regeneration so is
 * one that was edited or is no longer generated. Only terrain, its provenance
 * and the stamp change; notes, exploration, drafts and everything else on the
 * hex are carried over untouched.
 */
export function applyRegionProposal(
  state: HexCrawlState,
  proposal: RegionProposal,
  adjustments: RegionAdjustments,
  now: number,
): AppliedRegion {
  const hexes = { ...state.hexes };
  const applied: HexKey[] = [];
  const skipped: HexKey[] = [];
  const before: Record<HexKey, HexRecord | null> = {};
  const stamps: Record<HexKey, number> = {};

  for (const key of Object.keys(proposal.hexes).sort()) {
    const current = state.hexes[key];
    if (isStale(current, proposal, key)) {
      skipped.push(key);
      continue;
    }
    before[key] = current ?? null;
    stamps[key] = now;
    const kept = pruneHexRecord(
      withTerrain(current, proposal, key, adjustments[key], now),
    );
    if (kept) hexes[key] = kept;
    applied.push(key);
  }
  return {
    state: { ...state, hexes },
    applied,
    skipped,
    undo: { before, stamps },
  };
}

/**
 * Put every hex the region changed back exactly as it was. Returns null, and
 * changes nothing, if any of them has been written to since.
 */
export function undoRegion(
  state: HexCrawlState,
  undo: Omit<RegionUndo, "mapId">,
): HexCrawlState | null {
  for (const [key, stamp] of Object.entries(undo.stamps)) {
    if (state.hexes[key]?.updatedAt !== stamp) return null;
  }
  const hexes = { ...state.hexes };
  for (const [key, record] of Object.entries(undo.before)) {
    if (record) hexes[key] = record;
    else delete hexes[key];
  }
  return { ...state, hexes };
}
