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
    currentPlaceId?: string | null;
    visibleState?: {
      situation?: CharacterEntry;
      activeCharacters?: CharacterEntry[];
    };
  };
}

export interface HarvestedDemand {
  type: "location" | "npc" | "scene" | "atmosphere" | "monster";
  genre: NonNullable<ArtworkCues["genre"]>;
  knownCues: string[];
  unmappedCues: string[];
  demographicCues: string[];
  matchedAssetId: string | null;
}

const MONSTER_CUES = new Set([
  "monster",
  "creature",
  "beast",
  "undead",
  "aberration",
  "fiend",
  "dragon",
]);
const ATMOSPHERE_CUES = new Set([
  "quiet",
  "busy",
  "ominous",
  "hopeful",
  "mysterious",
  "day",
  "night",
  "dawn",
  "dusk",
  "rain",
  "fog",
  "winter",
  "summer",
]);

const SAFE_RAW_CUE = /^[a-z0-9]+(?:[ -][a-z0-9]+)*$/;

function isUnmappedCue(cue: string): boolean {
  if (!SAFE_RAW_CUE.test(cue) || cue.length > 32) return false;
  return !isArtworkCue(CUE_SYNONYMS[cue] ?? cue);
}

function containsPrivateText(
  cue: string,
  privateText: readonly string[],
): boolean {
  const normalizedCue = cue.replace(/[^a-z0-9]+/g, " ").trim();
  if (!normalizedCue) return true;
  return privateText.some((text) => {
    const normalizedText = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    return ` ${normalizedText} `.includes(` ${normalizedCue} `);
  });
}

function collectUnmapped(
  rawCues: readonly string[] = [],
  privateText: readonly string[] = [],
): string[] {
  const normalized = rawCues.map((raw) =>
    raw.trim().toLowerCase().replace(/\s+/g, " "),
  );
  return [
    ...new Set(
      normalized.filter(
        (cue) => isUnmappedCue(cue) && !containsPrivateText(cue, privateText),
      ),
    ),
  ].sort();
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
  const unmappedCues = collectUnmapped(rawCues, [place.name]);
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

function isMonsterCharacter(char: CharacterEntry): boolean {
  return (char.cues ?? []).some((c) =>
    MONSTER_CUES.has(c.trim().toLowerCase()),
  );
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
  const unmappedCues = collectUnmapped(char.cues, [char.text]);
  if (knownCues.length + unmappedCues.length + demographicCues.length === 0) {
    return null;
  }

  if (isMonsterCharacter(char)) {
    return {
      type: "monster",
      genre,
      knownCues,
      unmappedCues,
      demographicCues: [],
      matchedAssetId: null,
    };
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

function harvestAtmosphere(
  place: PlaceEntry,
  genre: NonNullable<ArtworkCues["genre"]>,
): HarvestedDemand | null {
  const atmoCues = normalizeArtworkCues(place.cues ?? []).filter((c) =>
    ATMOSPHERE_CUES.has(c),
  );
  if (atmoCues.length === 0) return null;
  const asset = matchArtwork(seedArtwork, {
    type: "atmosphere",
    genre,
    primaryCues: atmoCues,
  });
  return {
    type: "atmosphere",
    genre,
    knownCues: atmoCues.sort(),
    unmappedCues: [],
    demographicCues: [],
    matchedAssetId: asset ? asset.id : null,
  };
}

function harvestScene(
  situation: CharacterEntry | undefined,
  place: PlaceEntry | undefined,
  genre: NonNullable<ArtworkCues["genre"]>,
): HarvestedDemand | null {
  if (!situation?.text) return null;
  const knownCues = collectSceneKnownCues(situation, place);
  const unmappedCues = collectSceneUnmappedCues(situation, place);
  if (knownCues.length + unmappedCues.length === 0) return null;

  return {
    type: "scene",
    genre,
    knownCues,
    unmappedCues,
    demographicCues: [],
    matchedAssetId: matchSceneId(knownCues, genre),
  };
}

function collectSceneKnownCues(
  situation: CharacterEntry,
  place: PlaceEntry | undefined,
): string[] {
  return normalizeArtworkCues([
    ...readCues(situation.cues),
    ...readWords(situation.text),
    ...readCues(placeCues(place)),
  ]).sort();
}

function readCues(cues: readonly string[] | undefined): readonly string[] {
  return cues ?? [];
}

function readWords(text: string): string[] {
  return text.toLowerCase().match(/[a-z]+/g) ?? [];
}

function placeCues(
  place: PlaceEntry | undefined,
): readonly string[] | undefined {
  return place?.cues;
}

function placeName(place: PlaceEntry | undefined): string {
  return place?.name ?? "";
}

function collectSceneUnmappedCues(
  situation: CharacterEntry,
  place: PlaceEntry | undefined,
): string[] {
  return collectUnmapped(readCues(placeCues(place)), [
    placeName(place),
    situation.text,
  ]);
}

function matchSceneId(
  knownCues: readonly string[],
  genre: NonNullable<ArtworkCues["genre"]>,
): string | null {
  if (knownCues.length === 0) return null;
  const asset = matchArtwork(seedArtwork, {
    type: "scene",
    genre,
    primaryCues: knownCues,
  });
  return asset ? asset.id : null;
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
  const atmospheres = rawPlaces
    .map((place) => harvestAtmosphere(place, genre))
    .filter((item): item is HarvestedDemand => item !== null);
  const activePlace = rawPlaces.find(
    (place) => place.id === snapshot.state?.currentPlaceId,
  );
  const scene = harvestScene(
    snapshot.state?.visibleState?.situation,
    activePlace,
    genre,
  );
  const chars = rawChars
    .map((char) => harvestCharacter(char, genre))
    .filter((item): item is HarvestedDemand => item !== null);
  return [...places, ...atmospheres, ...(scene ? [scene] : []), ...chars];
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
