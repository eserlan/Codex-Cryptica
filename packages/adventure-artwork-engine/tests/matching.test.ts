import { describe, expect, it } from "vitest";
import { matchArtwork } from "../src/matching";
import type { ArtworkAsset } from "../src/catalogue";
const asset = (
  id: string,
  overrides: Partial<ArtworkAsset> = {},
): ArtworkAsset =>
  ({
    id,
    type: "location",
    genres: ["fantasy"],
    primaryCues: ["forest"],
    settingCues: [],
    moodCues: ["quiet"],
    timeCues: [],
    excludes: [],
    review: {
      status: "approved",
      reviewer: "a",
      date: "2026-01-01",
      notes: "ok",
    },
    ...overrides,
  }) as ArtworkAsset;
describe("matching", () => {
  it("chooses deterministically by ID for equal scores", () =>
    expect(
      matchArtwork([asset("z"), asset("a")], {
        type: "location",
        genre: "fantasy",
        primaryCues: ["forest"],
      })?.id,
    ).toBe("a"));
  it("requires primary overlap and compatible genre", () => {
    expect(
      matchArtwork([asset("a")], {
        type: "location",
        genre: "fantasy",
        primaryCues: [],
        moodCues: ["quiet"],
      }),
    ).toBeNull();
    expect(
      matchArtwork([asset("a")], { type: "location", primaryCues: ["forest"] }),
    ).toBeNull();
    expect(
      matchArtwork([asset("a", { genres: ["neutral"] })], {
        type: "location",
        primaryCues: ["forest"],
      })?.id,
    ).toBe("a");
    expect(
      matchArtwork([asset("a", { withdrawn: true })], {
        type: "location",
        genre: "fantasy",
        primaryCues: ["forest"],
      }),
    ).toBeNull();
  });
});

it("drops unknown and duplicate cues before applying the input limit", () => {
  expect(
    matchArtwork([asset("forest")], {
      type: "location",
      genre: "fantasy",
      primaryCues: [...Array(25).fill("unknown-cue"), "forest"],
    })?.id,
  ).toBe("forest");
});

it("prefers exact race and class combo over partial race or class match", () => {
  const npc = (id: string, primaryCues: string[]): ArtworkAsset => ({
    ...asset(id),
    type: "npc",
    primaryCues,
  });
  const pool = [
    npc("npc-dwarf-cleric", ["dwarf", "cleric"]),
    npc("npc-elf-ranger", ["elf", "ranger"]),
    npc("npc-elf-wizard", ["elf", "wizard"]),
  ];
  expect(
    matchArtwork(pool, {
      type: "npc",
      genre: "fantasy",
      primaryCues: ["elf", "wizard"],
    })?.id,
  ).toBe("npc-elf-wizard");
  expect(
    matchArtwork(pool, {
      type: "npc",
      genre: "fantasy",
      primaryCues: ["dwarf", "wizard"],
    })?.id,
  ).toBe("npc-dwarf-cleric");
});

it("prefers generic worker over specialized race/class worker when only worker is requested", () => {
  const npc = (
    id: string,
    primaryCues: string[],
    excludes: string[] = [],
  ): ArtworkAsset => ({
    ...asset(id),
    type: "npc",
    primaryCues,
    excludes,
  });
  const pool = [
    npc("npc-fantasy-dwarf-cleric-01", ["dwarf", "cleric", "worker"]),
    npc("npc-fantasy-worker-02", ["worker"]),
  ];
  expect(
    matchArtwork(pool, {
      type: "npc",
      genre: "fantasy",
      primaryCues: ["worker"],
    })?.id,
  ).toBe("npc-fantasy-worker-02");
});
