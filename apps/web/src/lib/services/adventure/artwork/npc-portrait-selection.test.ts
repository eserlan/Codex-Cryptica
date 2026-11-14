import { describe, expect, it } from "vitest";
import type { ArtworkAsset } from "@codex/adventure-artwork-engine";
import {
  selectPresentNpcPortrait,
  type ArtworkNpcSession,
} from "./npc-portrait-selection";

function makeNpcAsset(
  id: string,
  primaryCues: string[],
  genres: ArtworkAsset["genres"] = ["fantasy"],
): ArtworkAsset {
  return {
    id,
    version: 1,
    type: "npc",
    genres,
    primaryCues,
    settingCues: [],
    moodCues: [],
    timeCues: [],
    excludes: [],
    alt: `Portrait of ${id}`,
    origin: "team-generated-ai",
    variants: {
      preview: {
        url: `https://example.test/${id}-preview.webp`,
        mime: "image/webp",
        width: 256,
        height: 320,
        sha256: "a".repeat(64),
        bytes: 1000,
      },
      display: {
        url: `https://example.test/${id}-display.webp`,
        mime: "image/webp",
        width: 512,
        height: 640,
        sha256: "b".repeat(64),
        bytes: 2000,
      },
    },
    provenance: {
      tool: "test-tool",
      model: "test-model",
      generatedAt: "2026-01-01T00:00:00Z",
      prompt: "test prompt",
      creator: "Codex Cryptica",
      distributionBasis: "curated",
      referencePermissions: "none",
      attribution: "Codex Cryptica Team",
    },
    review: {
      status: "approved",
      reviewer: "reviewer",
      date: "2026-01-01",
      notes: "ok",
    },
    withdrawn: false,
  };
}

const baseSession: ArtworkNpcSession = {
  vaultId: "v1",
  currentPlaceId: "place-1",
  places: [
    { id: "place-1", name: "Gatehouse" },
    { id: "place-2", name: "Tavern" },
  ],
  people: [
    {
      id: "person-1",
      name: "Thorin",
      aliases: ["Dwarf Ranger"],
      linkedFactIds: ["char-1"],
      sourceRecordId: "ent-1",
    },
  ],
  visibleState: {
    activeCharacters: [
      {
        id: "char-1",
        text: "Thorin stands watch by the gate.",
        source: "provisional",
        placeId: "place-1",
      },
    ],
    knownFacts: [
      {
        id: "fact-1",
        text: "Thorin is an experienced traveller.",
        source: "provisional",
        placeId: "place-1",
      },
    ],
  },
};

describe("selectPresentNpcPortrait", () => {
  it("resolves a matching NPC portrait from race/class/role cues", () => {
    const catalogue = [
      makeNpcAsset("npc-wizard", ["wizard"]),
      makeNpcAsset("npc-dwarf-ranger", ["dwarf", "ranger"]),
    ];
    const result = selectPresentNpcPortrait(
      baseSession,
      "v1",
      {
        "ent-1": {
          id: "ent-1",
          title: "Thorin Oakenshield",
          type: "character",
          labels: ["traveller"],
        },
      },
      true,
      "fantasy",
      catalogue,
    );

    expect(result).toMatchObject({
      kind: "catalogue",
      name: "Thorin",
      aiLabel: "AI illustration",
      credits: "Codex Cryptica Team",
      subjectKey: "entity:ent-1",
    });
    if (result?.kind === "catalogue") {
      expect(result.asset.id).toBe("npc-dwarf-ranger");
    }
  });

  it("prefers a linked Vault entity image over catalogue matching", () => {
    const catalogue = [makeNpcAsset("npc-dwarf-ranger", ["dwarf", "ranger"])];
    const result = selectPresentNpcPortrait(
      baseSession,
      "v1",
      {
        "ent-1": {
          id: "ent-1",
          image: "images/thorin.webp",
        },
      },
      true,
      "fantasy",
      catalogue,
    );

    expect(result).toEqual({
      kind: "vault",
      name: "Thorin",
      image: "images/thorin.webp",
      alt: "Portrait of Thorin",
      subjectKey: "entity:ent-1",
    });
  });

  it("returns null when cues do not match any catalogue asset", () => {
    const session: ArtworkNpcSession = {
      vaultId: "v1",
      currentPlaceId: "place-1",
      places: [{ id: "place-1", name: "Gatehouse" }],
      people: [
        {
          id: "person-unknown",
          name: "Zorg",
          aliases: ["Mysterious Stranger"],
          linkedFactIds: ["char-unknown"],
        },
      ],
      visibleState: {
        activeCharacters: [
          {
            id: "char-unknown",
            text: "Zorg waits quietly.",
            source: "provisional",
            placeId: "place-1",
          },
        ],
      },
    };
    const catalogue = [makeNpcAsset("npc-elf", ["elf"])];

    expect(
      selectPresentNpcPortrait(session, "v1", {}, true, "fantasy", catalogue),
    ).toBeNull();
  });

  it("returns null when no NPCs are present in the current place or feature is disabled", () => {
    const catalogue = [makeNpcAsset("npc-dwarf-ranger", ["dwarf", "ranger"])];
    const noActiveSession: ArtworkNpcSession = {
      ...baseSession,
      visibleState: { activeCharacters: [] },
    };
    const elsewhereSession: ArtworkNpcSession = {
      ...baseSession,
      visibleState: {
        activeCharacters: [
          {
            id: "char-1",
            text: "Thorin is elsewhere.",
            source: "provisional",
            placeId: "place-2",
          },
        ],
      },
    };

    expect(
      selectPresentNpcPortrait(
        noActiveSession,
        "v1",
        {},
        true,
        "fantasy",
        catalogue,
      ),
    ).toBeNull();
    expect(
      selectPresentNpcPortrait(
        elsewhereSession,
        "v1",
        {},
        true,
        "fantasy",
        catalogue,
      ),
    ).toBeNull();
    expect(
      selectPresentNpcPortrait(
        baseSession,
        "v1",
        {},
        false,
        "fantasy",
        catalogue,
      ),
    ).toBeNull();
    expect(
      selectPresentNpcPortrait(null, "v1", {}, true, "fantasy", catalogue),
    ).toBeNull();
  });

  it("falls back to activeCharacters when session.people is empty", () => {
    const catalogue = [
      makeNpcAsset("npc-human-merchant", ["human", "merchant"]),
    ];
    const noPeopleSession: ArtworkNpcSession = {
      vaultId: "v1",
      currentPlaceId: "place-1",
      places: [{ id: "place-1", name: "Kettleford" }],
      visibleState: {
        activeCharacters: [
          {
            id: "char-1",
            text: "Nella Brant, a human merchant at the market.",
            source: "provisional",
            placeId: "place-1",
          },
        ],
      },
    };
    const result = selectPresentNpcPortrait(
      noPeopleSession,
      "v1",
      {},
      true,
      "fantasy",
      catalogue,
    );
    expect(result).toMatchObject({
      kind: "catalogue",
      asset: { id: "npc-human-merchant" },
    });
  });

  it("reads explicit cues on activeCharacters even when prose text has no cue words", () => {
    const catalogue = [makeNpcAsset("npc-human-worker", ["human", "worker"])];
    const cuedSession: ArtworkNpcSession = {
      vaultId: "v1",
      currentPlaceId: "place-1",
      places: [{ id: "place-1", name: "Kettleford" }],
      visibleState: {
        activeCharacters: [
          {
            id: "char-1",
            text: "The miller of Kettleford Mill.",
            source: "provisional",
            placeId: "place-1",
            cues: ["human", "worker"],
          },
        ],
      },
    };
    const result = selectPresentNpcPortrait(
      cuedSession,
      "v1",
      {},
      true,
      "fantasy",
      catalogue,
    );
    expect(result).toMatchObject({
      kind: "catalogue",
      asset: { id: "npc-human-worker" },
    });
  });
});
