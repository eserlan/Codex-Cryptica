import { describe, expect, it } from "vitest";
import {
  assembleChronicaCampaign,
  detectChronicaExport,
  groupChronicaExports,
  parseChronicaExports,
  type ChronicaExportDocument,
} from "../../src/cc/chronica";

const campaignCharacters = {
  export_created_at: "2026-06-27T20:00:00Z",
  campaign: {
    id: "grecia-1",
    name: "Grecia",
    about: "<p>Ancient campaign</p>",
    characters: [
      {
        id: "char-1",
        name: "Ariadne",
        description: "<p>Scout of the party.</p>",
        gm_secrets: "<p>Secret heir.</p>",
        place_id: "place-1",
      },
    ],
  },
};

const campaignPlaces = {
  export_created_at: "2026-06-27T20:00:01Z",
  campaign: {
    id: "grecia-1",
    name: "Grecia",
    places: [
      {
        id: "place-1",
        name: "Knossos",
        description: "<p>Labyrinth city.</p>",
      },
    ],
    quests: [
      {
        id: "quest-1",
        title: "Find the Thread",
        notes: "<p>Recover the sacred thread.</p>",
        character_id: "char-1",
      },
    ],
  },
};

const campaignFolders = {
  export_created_at: "2026-06-27T20:00:02Z",
  campaign: {
    id: "grecia-1",
    name: "Grecia",
    entity_folders: [
      {
        id: "folder-1",
        name: "Relics",
        entities: [
          {
            id: "entity-1",
            name: "Bronze Spear",
            entity_type: "item",
            description: "<p>Recovered from a ruin.</p>",
          },
        ],
      },
    ],
    kinship_folders: [
      {
        id: "kin-folder-1",
        name: "Houses",
        kinships: [
          {
            id: "kin-1",
            name: "House Minos",
            kintype: "family",
            description: "<p>Royal bloodline.</p>",
          },
        ],
      },
    ],
    stat_groups: [{ id: "stats-1", name: "Character Stats" }],
  },
};

describe("Chronica export adapter", () => {
  it("detects a Chronica export summary", () => {
    expect(detectChronicaExport(campaignCharacters)).toEqual({
      campaignId: "grecia-1",
      campaignName: "Grecia",
      domains: ["characters"],
    });
  });

  it("groups multiple files from the same campaign", () => {
    const documents: ChronicaExportDocument[] = [
      { fileName: "characters.json", json: campaignCharacters },
      { fileName: "places.json", json: campaignPlaces },
    ];

    const result = groupChronicaExports(documents);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]?.campaignId).toBe("grecia-1");
    expect(result.groups[0]?.documents).toHaveLength(2);
  });

  it("rejects mixed campaigns", () => {
    expect(() =>
      groupChronicaExports([
        { fileName: "a.json", json: campaignCharacters },
        {
          fileName: "b.json",
          json: {
            export_created_at: "2026-06-27T20:00:03Z",
            campaign: { id: "other", name: "Other", places: [{ id: "p2" }] },
          },
        },
      ]),
    ).toThrow("Chronica imports cannot mix multiple campaigns");
  });

  it("assembles nested folders and carries metadata warnings", () => {
    const assembled = assembleChronicaCampaign({
      campaignId: "grecia-1",
      campaignName: "Grecia",
      documents: [{ fileName: "folders.json", json: campaignFolders }],
      summaries: [
        {
          campaignId: "grecia-1",
          campaignName: "Grecia",
          domains: ["entity_folders", "kinship_folders", "stat_groups"],
          fileName: "folders.json",
        },
      ],
    });

    expect(assembled.records.map((record) => record.title)).toContain(
      "Bronze Spear",
    );
    expect(assembled.records.map((record) => record.title)).toContain(
      "House Minos",
    );
    expect(assembled.warnings[0]?.code).toBe("CHRONICA_METADATA_ONLY_DOMAIN");
  });

  it("builds a valid CC package with deterministic source refs and links", () => {
    const pkg = parseChronicaExports([
      { fileName: "characters.json", json: campaignCharacters },
      { fileName: "places.json", json: campaignPlaces },
      { fileName: "folders.json", json: campaignFolders },
    ]);

    expect(pkg.sourceSystem).toBe("chronica");
    expect(pkg.sourceLabel).toBe("Chronica Campaign Grecia");
    expect(pkg.entityDrafts.map((draft) => draft.sourceId)).toContain(
      "grecia-1:characters:char-1",
    );
    expect(pkg.entityDrafts.map((draft) => draft.sourceId)).toContain(
      "grecia-1:places:place-1",
    );
    expect(
      pkg.relationshipDrafts.some(
        (draft) =>
          draft.fromRef === "chronica:character:grecia-1:characters:char-1" &&
          draft.toRef === "chronica:place:grecia-1:places:place-1",
      ),
    ).toBe(true);
  });

  it("rejects selections with no importable records", () => {
    expect(() =>
      parseChronicaExports([
        {
          fileName: "stats.json",
          json: {
            export_created_at: "2026-06-27T20:00:04Z",
            campaign: {
              id: "grecia-1",
              name: "Grecia",
              stat_groups: [{ id: "stats-1", name: "Stats" }],
            },
          },
        },
      ]),
    ).toThrow("does not contain any importable Chronica records");
  });
});
