#!/usr/bin/env bun
/**
 * Harvests privacy-safe artwork cue tuples from exported Solo Adventure Mode
 * diagnostic snapshots (e.g. from adventure-review-capture) and optionally posts
 * them to `POST /api/artwork-demand` on oracle-proxy.
 *
 * Usage:
 *   bun scripts/harvest-adventure-cues.ts <snapshot.json> [...more.json] [--post <oracle-proxy-url>]
 */
import { readFile } from "node:fs/promises";
import {
  CUE_SYNONYMS,
  isArtworkCue,
  isNpcDemographicCue,
  isNpcPersonCue,
  isSettingCue,
  matchArtwork,
  normalizeArtworkCues,
  type ArtworkCues,
} from "../packages/adventure-artwork-engine/src/index";
import { seedArtwork } from "../packages/adventure-artwork-engine/src/catalogue/seed";

interface PlaceEntry {
  id: string;
  name: string;
  cues?: string[];
}

interface CharacterEntry {
  id: string;
  text: string;
  cues?: string[];
}

export interface DiagnosticSnapshot {
  state?: {
    places?: PlaceEntry[];
    visibleState?: {
      activeCharacters?: CharacterEntry[];
    };
  };
}

export interface HarvestedDemand {
  type: "location" | "npc";
  genre: NonNullable<ArtworkCues["genre"]>;
  knownCues: string[];
  unmappedCues: string[];
  demographicCues: string[];
  matchedAssetId: string | null;
}

const SAFE_RAW_CUE = /^[a-z0-9]+(?:[ -][a-z0-9]+)*$/;

function isUnmappedCue(cue: string): boolean {
  if (!SAFE_RAW_CUE.test(cue) || cue.length > 32) return false;
  return !isArtworkCue(CUE_SYNONYMS[cue] ?? cue);
}

function collectUnmapped(rawCues: readonly string[] = []): string[] {
  const normalized = rawCues.map((raw) =>
    raw.trim().toLowerCase().replace(/\s+/g, " "),
  );
  return [...new Set(normalized.filter(isUnmappedCue))].sort();
}

function matchPlaceId(
  knownCues: readonly string[],
  genre: NonNullable<ArtworkCues["genre"]>,
): string | null {
  if (knownCues.length === 0) return null;
  const asset = matchArtwork(seedArtwork, {
    type: "location",
    genre,
    primaryCues: knownCues,
  });
  return asset ? asset.id : null;
}

function harvestPlace(
  place: PlaceEntry,
  genre: NonNullable<ArtworkCues["genre"]>,
): HarvestedDemand | null {
  const words = place.name.toLowerCase().match(/[a-z]+/g) ?? [];
  const rawCues = place.cues ?? [];
  const knownCues = normalizeArtworkCues([...rawCues, ...words]).sort();
  const unmappedCues = collectUnmapped(rawCues);
  if (knownCues.length + unmappedCues.length === 0) return null;

  return {
    type: "location",
    genre,
    knownCues,
    unmappedCues,
    demographicCues: [],
    matchedAssetId: matchPlaceId(knownCues, genre),
  };
}

function extractNpcTokens(char: CharacterEntry): string[] {
  const words = char.text.toLowerCase().match(/[a-z]+/g) ?? [];
  const cues = (char.cues ?? []).map((c) => c.toLowerCase());
  return [...words, ...cues];
}

function matchNpcId(
  knownCues: readonly string[],
  settingCues: readonly string[],
  demographicCues: readonly string[],
  genre: NonNullable<ArtworkCues["genre"]>,
): string | null {
  if (knownCues.length === 0) return null;
  const asset = matchArtwork(seedArtwork, {
    type: "npc",
    genre,
    primaryCues: knownCues,
    settingCues,
    demographicCues,
  });
  return asset ? asset.id : null;
}

function harvestCharacter(
  char: CharacterEntry,
  genre: NonNullable<ArtworkCues["genre"]>,
): HarvestedDemand | null {
  const tokens = extractNpcTokens(char);
  const mapCue = (t: string) => CUE_SYNONYMS[t] ?? t;
  const knownCues = normalizeArtworkCues(
    tokens.filter((t) => isNpcPersonCue(mapCue(t))),
  ).sort();
  const settingCues = normalizeArtworkCues(
    tokens.filter((t) => isSettingCue(mapCue(t))),
  ).sort();
  const demographicCues = normalizeArtworkCues(
    tokens.filter((t) => isNpcDemographicCue(mapCue(t))),
  ).sort();
  const unmappedCues = collectUnmapped(char.cues);
  if (knownCues.length + unmappedCues.length + demographicCues.length === 0) {
    return null;
  }

  return {
    type: "npc",
    genre,
    knownCues,
    unmappedCues,
    demographicCues,
    matchedAssetId: matchNpcId(knownCues, settingCues, demographicCues, genre),
  };
}

function readActiveCharacters(visibleState?: {
  activeCharacters?: CharacterEntry[];
}): CharacterEntry[] {
  if (!visibleState || !visibleState.activeCharacters) return [];
  return visibleState.activeCharacters;
}

function readSnapshotEntries(snapshot: DiagnosticSnapshot): {
  places: PlaceEntry[];
  characters: CharacterEntry[];
} {
  const state = snapshot.state;
  if (!state) return { places: [], characters: [] };
  return {
    places: state.places ? state.places : [],
    characters: readActiveCharacters(state.visibleState),
  };
}

export function harvestSnapshot(
  snapshot: DiagnosticSnapshot,
  genre: NonNullable<ArtworkCues["genre"]> = "fantasy",
): HarvestedDemand[] {
  const { places: rawPlaces, characters: rawChars } =
    readSnapshotEntries(snapshot);
  const places = rawPlaces
    .map((place) => harvestPlace(place, genre))
    .filter((item): item is HarvestedDemand => item !== null);
  const chars = rawChars
    .map((char) => harvestCharacter(char, genre))
    .filter((item): item is HarvestedDemand => item !== null);
  return [...places, ...chars];
}

function parseCliArgs(args: readonly string[]): {
  files: string[];
  postUrl?: string;
} {
  const postIdx = args.indexOf("--post");
  const postUrl =
    postIdx >= 0 && args[postIdx + 1]
      ? args[postIdx + 1]?.replace(/\/+$/, "")
      : undefined;
  const files = args.filter(
    (arg, i) => !arg.startsWith("--") && (postIdx < 0 || i !== postIdx + 1),
  );
  return { files, postUrl };
}

async function postItems(
  postUrl: string,
  items: readonly HarvestedDemand[],
): Promise<void> {
  for (const item of items) {
    const res = await fetch(`${postUrl}/api/artwork-demand`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      console.error(`Failed to post ${item.type}: ${res.status}`);
    }
  }
  console.log(`Posted ${items.length} cue records to ${postUrl}`);
}

async function main() {
  const { files, postUrl } = parseCliArgs(process.argv.slice(2));
  if (files.length === 0) {
    console.error(
      "Usage: bun scripts/harvest-adventure-cues.ts <snapshot.json> [...more.json] [--post <oracle-proxy-url>]",
    );
    process.exit(1);
  }
  const allItems: HarvestedDemand[] = [];
  for (const file of files) {
    allItems.push(
      ...harvestSnapshot(
        JSON.parse(await readFile(file, "utf8")) as DiagnosticSnapshot,
      ),
    );
  }
  console.log(JSON.stringify({ harvested: allItems }, null, 2));
  if (postUrl) await postItems(postUrl, allItems);
}

if (import.meta.main) {
  await main();
}
