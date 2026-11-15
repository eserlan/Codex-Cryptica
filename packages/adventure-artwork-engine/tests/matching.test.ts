import { describe, expect, it } from "vitest";
import { matchArtwork } from "../src/matching";
import type { ArtworkAsset } from "../src/catalogue";
import { seedArtwork } from "../src/catalogue/seed";
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
  ).toBe("npc-elf-wizard");
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

describe("seedArtwork NPC role matching and collision avoidance", () => {
  it("matches direct role queries to the distinguished fantasy portraits", () => {
    expect(
      matchArtwork(seedArtwork, {
        type: "npc",
        genre: "fantasy",
        primaryCues: ["cleric"],
      })?.id,
    ).toBe("npc-fantasy-cleric-01");
    expect(
      matchArtwork(seedArtwork, {
        type: "npc",
        genre: "fantasy",
        primaryCues: ["healer"],
      })?.id,
    ).toBe("npc-fantasy-cleric-01");
    expect(
      matchArtwork(seedArtwork, {
        type: "npc",
        genre: "fantasy",
        primaryCues: ["innkeeper"],
      })?.id,
    ).toBe("npc-fantasy-merchant-02");
    expect(
      matchArtwork(seedArtwork, {
        type: "npc",
        genre: "fantasy",
        primaryCues: ["noble"],
      })?.id,
    ).toBe("npc-fantasy-noble-01");
    expect(
      matchArtwork(seedArtwork, {
        type: "npc",
        genre: "fantasy",
        primaryCues: ["rogue"],
      })?.id,
    ).toBe("npc-fantasy-rogue-01");
    expect(
      matchArtwork(seedArtwork, {
        type: "npc",
        genre: "fantasy",
        primaryCues: ["bard"],
      })?.id,
    ).toBe("npc-fantasy-bard-01");
    expect(
      matchArtwork(seedArtwork, {
        type: "npc",
        genre: "fantasy",
        primaryCues: ["smith"],
      })?.id,
    ).toBe("npc-fantasy-worker-01");
  });

  it("avoids merchant/noble and bard/rogue collisions", () => {
    const merchantMatch = matchArtwork(seedArtwork, {
      type: "npc",
      genre: "fantasy",
      primaryCues: ["merchant"],
    });
    expect(merchantMatch?.id).toBe("npc-fantasy-merchant-01");
    expect(merchantMatch?.id).not.toBe("npc-fantasy-noble-01");

    const bardMatch = matchArtwork(seedArtwork, {
      type: "npc",
      genre: "fantasy",
      primaryCues: ["bard"],
    });
    expect(bardMatch?.id).toBe("npc-fantasy-bard-01");
    expect(bardMatch?.id).not.toBe("npc-fantasy-rogue-01");

    const rogueMatch = matchArtwork(seedArtwork, {
      type: "npc",
      genre: "fantasy",
      primaryCues: ["rogue"],
    });
    expect(rogueMatch?.id).toBe("npc-fantasy-rogue-01");
    expect(rogueMatch?.id).not.toBe("npc-fantasy-bard-01");
  });

  it("selects all eight published fantasy narrative roles and rejects unsupported roles", () => {
    const archetypes = [
      "elder",
      "witch",
      "cultist",
      "bandit",
      "official",
      "urchin",
      "goblin",
      "necromancer",
    ] as const;
    for (const role of archetypes) {
      expect(
        matchArtwork(seedArtwork, {
          type: "npc",
          genre: "fantasy",
          primaryCues: [role],
        })?.id,
      ).toBe(`npc-fantasy-${role}-01`);
    }
    expect(
      matchArtwork(seedArtwork, {
        type: "npc",
        genre: "fantasy",
        primaryCues: ["clockmaker"],
      }),
    ).toBeNull();
  });

  it("resolves occult and outlaw synonyms to the dedicated portraits", () => {
    for (const synonym of ["seer", "oracle"]) {
      expect(
        matchArtwork(seedArtwork, {
          type: "npc",
          genre: "fantasy",
          primaryCues: [synonym],
        })?.id,
      ).toBe("npc-fantasy-witch-01");
    }

    for (const synonym of ["highwayman", "outlaw"]) {
      expect(
        matchArtwork(seedArtwork, {
          type: "npc",
          genre: "fantasy",
          primaryCues: [synonym],
        })?.id,
      ).toBe("npc-fantasy-bandit-01");
    }
  });

  it("prioritizes witch, bandit, and necromancer roles over ancestry and setting", () => {
    const witchInTempleVillage = matchArtwork(seedArtwork, {
      type: "npc",
      genre: "fantasy",
      primaryCues: ["human", "witch"],
      settingCues: ["temple", "village"],
    });
    expect(witchInTempleVillage?.id).toBe("npc-fantasy-witch-01");
    expect(witchInTempleVillage?.id).not.toBe("npc-fantasy-cleric-01");
    expect(witchInTempleVillage?.id).not.toBe("npc-fantasy-scholar-02");

    const banditInTownRoad = matchArtwork(seedArtwork, {
      type: "npc",
      genre: "fantasy",
      primaryCues: ["human", "bandit"],
      settingCues: ["town", "road"],
    });
    expect(banditInTownRoad?.id).toBe("npc-fantasy-bandit-01");
    expect(banditInTownRoad?.id).not.toBe("npc-fantasy-guard-01");

    const necromancerInLabTemple = matchArtwork(seedArtwork, {
      type: "npc",
      genre: "fantasy",
      primaryCues: ["human", "necromancer"],
      settingCues: ["laboratory", "temple"],
    });
    expect(necromancerInLabTemple?.id).toBe("npc-fantasy-necromancer-01");
    expect(necromancerInLabTemple?.id).not.toBe("npc-fantasy-scholar-02");
  });

  it("separates urchin and informant cues and resolves social/civic synonyms on seedArtwork", () => {
    expect(
      matchArtwork(seedArtwork, {
        type: "npc",
        genre: "fantasy",
        primaryCues: ["informant"],
      }),
    ).toBeNull();

    expect(
      matchArtwork(seedArtwork, {
        type: "npc",
        genre: "fantasy",
        primaryCues: ["informant"],
        settingCues: ["city", "urban"],
      }),
    ).toBeNull();

    expect(
      matchArtwork(seedArtwork, {
        type: "npc",
        genre: "fantasy",
        primaryCues: ["urchin", "informant"],
        settingCues: ["city", "urban"],
      })?.id,
    ).toBe("npc-fantasy-urchin-01");

    expect(
      matchArtwork(seedArtwork, {
        type: "npc",
        genre: "fantasy",
        primaryCues: ["human", "elder"],
        settingCues: ["village", "rural"],
      })?.id,
    ).toBe("npc-fantasy-elder-01");

    expect(
      matchArtwork(seedArtwork, {
        type: "npc",
        genre: "fantasy",
        primaryCues: ["human", "official"],
        settingCues: ["city", "tavern"],
      })?.id,
    ).toBe("npc-fantasy-official-01");

    expect(
      matchArtwork(seedArtwork, {
        type: "npc",
        genre: "fantasy",
        primaryCues: ["urchin"],
        settingCues: ["city"],
        timeCues: ["night"],
      })?.id,
    ).toBe("npc-fantasy-urchin-01");

    expect(
      matchArtwork(seedArtwork, {
        type: "npc",
        genre: "fantasy",
        primaryCues: ["goblin"],
        settingCues: ["cave", "tavern"],
      })?.id,
    ).toBe("npc-fantasy-goblin-01");
  });

  it("prioritizes explicit NPC role matches over ancestry and setting matches", () => {
    const noble01 = seedArtwork.find((a) => a.id === "npc-fantasy-noble-01")!;
    const merchant02 = seedArtwork.find(
      (a) => a.id === "npc-fantasy-merchant-02",
    )!;
    const cleric01 = seedArtwork.find((a) => a.id === "npc-fantasy-cleric-01")!;
    const worker02 = seedArtwork.find((a) => a.id === "npc-fantasy-worker-02")!;

    expect(
      matchArtwork([merchant02, noble01], {
        type: "npc",
        genre: "fantasy",
        primaryCues: ["human", "noble"],
        settingCues: ["tavern"],
      })?.id,
    ).toBe("npc-fantasy-noble-01");
    expect(
      matchArtwork(seedArtwork, {
        type: "npc",
        genre: "fantasy",
        primaryCues: ["human", "noble"],
        settingCues: ["tavern"],
      })?.id,
    ).not.toBe("npc-fantasy-merchant-02");

    expect(
      matchArtwork([worker02, cleric01], {
        type: "npc",
        genre: "fantasy",
        primaryCues: ["human", "cleric"],
        settingCues: ["village", "rural"],
      })?.id,
    ).toBe("npc-fantasy-cleric-01");
    expect(
      matchArtwork(seedArtwork, {
        type: "npc",
        genre: "fantasy",
        primaryCues: ["human", "cleric"],
        settingCues: ["village", "rural"],
      })?.id,
    ).not.toBe("npc-fantasy-worker-02");

    const bardInCity = matchArtwork(seedArtwork, {
      type: "npc",
      genre: "fantasy",
      primaryCues: ["human", "bard"],
      settingCues: ["city"],
    });
    expect(bardInCity?.id).toBe("npc-fantasy-bard-01");
    expect(bardInCity?.id).not.toBe("npc-fantasy-guard-01");
    expect(bardInCity?.id).not.toBe("npc-fantasy-scholar-01");
  });
});
