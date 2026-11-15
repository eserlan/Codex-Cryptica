import { describe, expect, it } from "vitest";
import type { ArtworkAsset } from "@codex/adventure-artwork-engine";
import { seedArtwork } from "@codex/adventure-artwork-engine/seed";
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
      description: "Thorin stands watch by the gate.",
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

  describe("description", () => {
    function sessionWithFact(text: string): ArtworkNpcSession {
      return {
        vaultId: "v1",
        currentPlaceId: "place-1",
        places: [{ id: "place-1", name: "Market" }],
        visibleState: {
          activeCharacters: [
            {
              id: "c1",
              text,
              source: "provisional",
              placeId: "place-1",
              cues: ["human", "worker"],
            },
          ],
          knownFacts: [
            {
              id: "k1",
              text: "Mira is secretly a smuggler.",
              source: "provisional",
              placeId: "place-1",
            },
          ],
        },
      };
    }
    const select = (text: string) =>
      selectPresentNpcPortrait(
        sessionWithFact(text),
        "v1",
        {},
        true,
        "fantasy",
        [makeNpcAsset("npc-herbwife", ["human", "worker"])],
      );

    it("strips the leading name and separator", () => {
      const result = select("Mira, a grey-haired herb-wife in a green apron");
      expect(result).toMatchObject({
        kind: "catalogue",
        name: "Mira",
        description: "a grey-haired herb-wife in a green apron",
      });
    });

    it("keeps text whole when the name has no separator after it", () => {
      const result = selectPresentNpcPortrait(
        baseSession,
        "v1",
        {},
        true,
        "fantasy",
        [makeNpcAsset("npc-dwarf-ranger", ["dwarf", "ranger"])],
      );
      expect(result).toMatchObject({
        description: "Thorin stands watch by the gate.",
      });
    });

    it("leaves description undefined when the text is only the name", () => {
      const result = selectPresentNpcPortrait(
        sessionWithFact("Mira"),
        "v1",
        { c: { id: "c" } },
        true,
        "fantasy",
        [],
      );
      expect(result).toBeNull();
      const vault = selectPresentNpcPortrait(
        {
          ...sessionWithFact("Mira"),
          people: [
            {
              id: "p",
              name: "Mira",
              aliases: [],
              linkedFactIds: ["c1"],
              sourceRecordId: "e1",
            },
          ],
        },
        "v1",
        { e1: { id: "e1", image: "images/mira.webp" } },
        true,
        "fantasy",
      );
      expect(vault).toMatchObject({ kind: "vault", name: "Mira" });
      expect(vault && "description" in vault && vault.description).toBe(
        undefined,
      );
    });

    it("never uses a known fact as the description", () => {
      const result = select("Mira, a grey-haired herb-wife");
      expect(result?.description).toBe("a grey-haired herb-wife");
      expect(result?.description).not.toContain("smuggler");
    });
  });

  describe("role vs setting priority on seedArtwork", () => {
    it("selects a noble portrait over innkeeper when in a tavern", () => {
      const nobleInTavern: ArtworkNpcSession = {
        vaultId: "v1",
        currentPlaceId: "place-tavern",
        places: [{ id: "place-tavern", name: "The Rusty Anchor Tavern" }],
        visibleState: {
          activeCharacters: [
            {
              id: "c-noble",
              text: "Lord Cassian, a human noble in the tavern.",
              source: "provisional",
              placeId: "place-tavern",
            },
          ],
        },
      };
      const portrait = selectPresentNpcPortrait(
        nobleInTavern,
        "v1",
        {},
        true,
        "fantasy",
        seedArtwork,
      );
      expect(portrait?.kind).toBe("catalogue");
      if (portrait?.kind === "catalogue") {
        expect(portrait.asset.id).not.toBe("npc-fantasy-merchant-02");
        expect(portrait.asset.primaryCues).toContain("noble");
      }
    });

    it("selects a cleric portrait over rural worker when a priest is in a village", () => {
      const priestInVillage: ArtworkNpcSession = {
        vaultId: "v1",
        currentPlaceId: "place-village",
        places: [{ id: "place-village", name: "Oakhaven Village" }],
        visibleState: {
          activeCharacters: [
            {
              id: "c-priest",
              text: "Sister Mara, a human priest in the rural village.",
              source: "provisional",
              placeId: "place-village",
            },
          ],
        },
      };
      const portrait = selectPresentNpcPortrait(
        priestInVillage,
        "v1",
        {},
        true,
        "fantasy",
        seedArtwork,
      );
      expect(portrait?.kind).toBe("catalogue");
      if (portrait?.kind === "catalogue") {
        expect(portrait.asset.id).not.toBe("npc-fantasy-worker-02");
        expect(portrait.asset.primaryCues).toContain("cleric");
      }
    });

    it("selects the bard portrait when a minstrel is in a city", () => {
      const bardInCity: ArtworkNpcSession = {
        vaultId: "v1",
        currentPlaceId: "place-city",
        places: [{ id: "place-city", name: "Capital City" }],
        visibleState: {
          activeCharacters: [
            {
              id: "c-bard",
              text: "Julian, a human minstrel performing in the city.",
              source: "provisional",
              placeId: "place-city",
            },
          ],
        },
      };
      const portrait = selectPresentNpcPortrait(
        bardInCity,
        "v1",
        {},
        true,
        "fantasy",
        seedArtwork,
      );
      expect(portrait?.kind).toBe("catalogue");
      if (portrait?.kind === "catalogue") {
        expect(portrait.asset.id).toBe("npc-fantasy-bard-01");
      }
    });

    it("resolves social and civic archetypes and synonyms on seedArtwork", () => {
      const cases = [
        {
          id: "c-reeve",
          place: "Oakhaven Village",
          text: "Aldous, a human reeve in the rural village.",
          expectedId: "npc-fantasy-elder-01",
        },
        {
          id: "c-magistrate",
          place: "The Gilded Tankard Tavern",
          text: "Corvin, a human magistrate in the city tavern.",
          expectedId: "npc-fantasy-official-01",
        },
        {
          id: "c-guildmaster",
          place: "Guildhall",
          text: "Vesper, a guildmaster reviewing harbour ledgers.",
          expectedId: "npc-fantasy-official-01",
        },
        {
          id: "c-urchin",
          place: "Lower Ward Alley",
          text: "Pip, a street child watching the city alley at night.",
          expectedId: "npc-fantasy-urchin-01",
        },
        {
          id: "c-goblin",
          place: "Mossjaw Cave",
          text: "Skrit, a goblin tinker resting in the cave.",
          expectedId: "npc-fantasy-goblin-01",
        },
      ];

      for (const testCase of cases) {
        const session: ArtworkNpcSession = {
          vaultId: "v1",
          currentPlaceId: "place-1",
          places: [{ id: "place-1", name: testCase.place }],
          visibleState: {
            activeCharacters: [
              {
                id: testCase.id,
                text: testCase.text,
                source: "provisional",
                placeId: "place-1",
              },
            ],
          },
        };
        const portrait = selectPresentNpcPortrait(
          session,
          "v1",
          {},
          true,
          "fantasy",
          seedArtwork,
        );
        expect(portrait?.kind).toBe("catalogue");
        if (portrait?.kind === "catalogue") {
          expect(portrait.asset.id).toBe(testCase.expectedId);
        }
      }

      const informantSessions: ArtworkNpcSession[] = [
        {
          vaultId: "v1",
          currentPlaceId: "place-tavern",
          places: [{ id: "place-tavern", name: "The Velvet Lantern Tavern" }],
          visibleState: {
            activeCharacters: [
              {
                id: "c-informant-tavern",
                text: "Vesper, a whisper-network informant in the city tavern.",
                source: "provisional",
                placeId: "place-tavern",
              },
            ],
          },
        },
        {
          vaultId: "v1",
          currentPlaceId: "place-city",
          places: [{ id: "place-city", name: "Capital City" }],
          visibleState: {
            activeCharacters: [
              {
                id: "c-informant-city",
                text: "Vane, an informant waiting in the urban city.",
                source: "provisional",
                placeId: "place-city",
              },
            ],
          },
        },
      ];

      for (const session of informantSessions) {
        const portrait = selectPresentNpcPortrait(
          session,
          "v1",
          {},
          true,
          "fantasy",
          seedArtwork,
        );
        expect(portrait?.kind).toBe("catalogue");
        if (portrait?.kind === "catalogue") {
          expect(portrait.asset.id).toBe("npc-fantasy-informant-01");
          expect(portrait.asset.primaryCues).toContain("informant");
        }
      }
    });
  });
});
