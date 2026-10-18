import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { parseKankaExportZip } from "./kanka";

function json(value: unknown): Uint8Array {
  return strToU8(JSON.stringify(value));
}

function realisticKankaZip(
  overrides: Record<string, Uint8Array> = {},
): Uint8Array {
  return zipSync({
    "info.md": strToU8(
      "# Kanka campaign export\n\nkanka_version: 3.10\nexport_version: 3.10\n",
    ),
    "campaign.json": json({ id: 7, name: "The Ashen Coast" }),
    "tags/allies_40.json": json({
      id: 40,
      name: "Allies",
      entity: { id: 400, entry: "Trusted friends" },
    }),
    "characters/aria_10.json": json({
      id: 10,
      name: "Aria Voss",
      title: "Wayfinder",
      entity: {
        id: 100,
        entry: "<p>Captain of the <strong>Dawn Gull</strong>.</p>",
        parent_id: null,
        image_path: "campaigns/7/characters/aria.png",
        entityTags: [{ tag_id: 40 }],
        entityAttributes: [
          { name: "Pronouns", value: "she/her", is_private: false },
          { name: "Secret", value: "Owes the crown", is_private: true },
        ],
        relationships: [
          { owner_id: 100, target_id: 200, relation: "Based in" },
          { owner_id: 100, target_id: 999, relation: "Knows" },
        ],
      },
    }),
    "locations/greyharbor_20.json": json({
      id: 20,
      name: "Greyharbor",
      entity: {
        id: 200,
        entry: "<p>A rain-soaked port.</p>",
        image_uuid: "gallery-greyharbor",
      },
    }),
    "races/skyborn_30.json": json({
      id: 30,
      name: "Skyborn",
      entity: { id: 300, entry: "Winged folk." },
    }),
    "oddities/moon_50.json": json({
      id: 50,
      name: "The Singing Moon",
      entity: { id: 500, entry: "Nobody agrees what it is." },
    }),
    "campaigns/7/characters/aria.png": new Uint8Array([137, 80, 78, 71]),
    "gallery/gallery-greyharbor.json": json({
      id: "gallery-greyharbor",
      name: "Greyharbor skyline",
      ext: "webp",
      is_folder: false,
    }),
    "gallery/gallery-greyharbor.webp": new Uint8Array([82, 73, 70, 70]),
    ...overrides,
  });
}

describe("parseKankaExportZip", () => {
  it("converts a realistic JSON export without AI or vault writes", async () => {
    const pkg = await parseKankaExportZip(realisticKankaZip());

    expect(pkg).toMatchObject({
      version: "1.0",
      sourceSystem: "kanka",
      sourceLabel: "The Ashen Coast",
    });
    expect(pkg.entityDrafts).toHaveLength(4);

    const aria = pkg.entityDrafts.find((draft) => draft.sourceId === "100");
    expect(aria).toMatchObject({
      sourceType: "character",
      title: "Aria Voss",
      labels: ["Allies"],
      content: "Captain of the **Dawn Gull**.",
      metadata: {
        kankaType: "character",
        kankaEntityId: 100,
        kankaModelId: 10,
        attributes: { Pronouns: "she/her", Secret: "Owes the crown" },
      },
    });

    expect(
      pkg.entityDrafts.find((draft) => draft.sourceId === "300"),
    ).toMatchObject({ sourceType: "species", title: "Skyborn" });
    expect(
      pkg.entityDrafts.find((draft) => draft.sourceId === "500"),
    ).toMatchObject({
      sourceType: "note",
      metadata: { kankaType: "oddity" },
    });

    expect(pkg.relationshipDrafts).toEqual([
      {
        fromRef: "kanka:character:100",
        toRef: "kanka:location:200",
        type: "related_to",
        label: "Based in",
      },
    ]);
    expect(pkg.assetDrafts).toHaveLength(2);
    expect(pkg.assetDrafts[0]).toMatchObject({
      originalName: "aria.png",
      mimeType: "image/png",
      placementRef: "kanka:character:100",
    });
    expect(pkg.assetDrafts[0].bytes).toEqual(new Uint8Array([137, 80, 78, 71]));
    expect(pkg.assetDrafts[1]).toMatchObject({
      originalName: "gallery-greyharbor.webp",
      mimeType: "image/webp",
      placementRef: "kanka:location:200",
    });
    expect(pkg.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "KANKA_UNKNOWN_TYPE", ref: "500" }),
        expect.objectContaining({
          code: "KANKA_UNRESOLVED_RELATIONSHIP",
          ref: "999",
        }),
      ]),
    );
  });

  it("maps the relationship collections used by official Kanka exports", async () => {
    const zip = realisticKankaZip({
      "characters/aria_10.json": json({
        id: 10,
        name: "Aria Voss",
        entity: {
          id: 100,
          entry: "Captain of the Dawn Gull.",
        },
        character_families: [{ family_id: 40 }],
        character_races: [{ race_id: 30 }],
        organisation_memberships: [{ organisation_id: 50, role: "Captain" }],
      }),
      "families/house_40.json": json({
        id: 40,
        name: "House Voss",
        entity: { id: 400, entry: "A noble house." },
      }),
      "organisations/crew_50.json": json({
        id: 50,
        name: "Dawn Gull Crew",
        entity: { id: 500, entry: "A ship's crew." },
        members: [{ character_id: 10 }],
      }),
      "events/voyage_60.json": json({
        id: 60,
        name: "The Voyage",
        entity: { id: 600, entry: "A long journey." },
        entityLocations: [{ location_id: 20 }],
      }),
      "items/compass_70.json": json({
        id: 70,
        name: "Star Compass",
        entity: { id: 700, entry: "A brass compass." },
        itemCreators: [{ creator_id: 100 }],
      }),
    });

    const pkg = await parseKankaExportZip(zip);

    expect(pkg.relationshipDrafts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fromRef: "kanka:character:100",
          toRef: "kanka:faction:400",
          label: "family",
        }),
        expect.objectContaining({
          fromRef: "kanka:character:100",
          toRef: "kanka:species:300",
          label: "race",
        }),
        expect.objectContaining({
          fromRef: "kanka:character:100",
          toRef: "kanka:faction:500",
          label: "Captain",
        }),
        expect.objectContaining({
          fromRef: "kanka:event:600",
          toRef: "kanka:location:200",
          label: "located in",
        }),
        expect.objectContaining({
          fromRef: "kanka:item:700",
          toRef: "kanka:character:100",
          label: "created by",
        }),
      ]),
    );
  });

  it("accepts current exports that use info.json", async () => {
    const zip = realisticKankaZip({
      "info.md": new Uint8Array(),
      "info.json": json({ kanka_version: "3.13", export_version: "3.13" }),
    });

    const pkg = await parseKankaExportZip(zip);

    expect(pkg.entityDrafts).toHaveLength(4);
  });

  it("rejects missing and unsupported version metadata clearly", async () => {
    const missing = zipSync({
      "campaign.json": json({ id: 7, name: "No Version" }),
    });
    const old = realisticKankaZip({
      "info.md": strToU8("kanka_version: 2.0.9"),
    });
    const future = realisticKankaZip({
      "info.md": strToU8("kanka_version: 4.0"),
    });

    await expect(parseKankaExportZip(missing)).rejects.toThrow(
      /info\.md.*info\.json.*kanka_version/i,
    );
    await expect(parseKankaExportZip(old)).rejects.toThrow(/2\.0\.9.*2\.1/i);
    await expect(parseKankaExportZip(future)).rejects.toThrow(
      /4\.0.*supported/i,
    );
  });

  it("warns for missing assets instead of failing the package", async () => {
    const pkg = await parseKankaExportZip(
      realisticKankaZip({
        "characters/aria_10.json": json({
          id: 10,
          name: "Aria Voss",
          entity: {
            id: 100,
            entry: "Captain",
            image_path: "campaigns/7/characters/missing.png",
          },
        }),
      }),
    );

    expect(pkg.assetDrafts).toHaveLength(1);
    expect(pkg.assetDrafts[0].placementRef).toBe("kanka:location:200");
    expect(pkg.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "KANKA_ASSET_MISSING", ref: "100" }),
      ]),
    );
  });
});
