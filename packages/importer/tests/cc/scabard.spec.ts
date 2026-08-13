import { describe, it, expect } from "vitest";
import { parseScabardExport } from "../../src/cc/scabard";

describe("Scabard Campaign Export Importer Adapter", () => {
  const mockCampaign = {
    conns: [
      {
        from: "Character",
        fromid: 65,
        relationship: "CONCEPT_OF",
        to: "Benjamin Bowman",
        toid: 4543966,
      },
      {
        from: "Benjamin Bowman",
        fromid: 4543966,
        relationship: "MEMBER_OF",
        to: "The Coterie",
        toid: 5271180,
      },
      {
        from: "Benjamin Bowman",
        fromid: 4543966,
        relationship: "PARTICIPANT_OF",
        to: "1 - Chapter One: The Ghost Town",
        toid: 4543885,
      },
      {
        from: "Adventuring Group",
        fromid: 5625209,
        relationship: "CATEGORY_OF",
        to: "Group Category",
        toid: 5625232,
      },
      {
        from: "Benjamin Bowman",
        fromid: 4543966,
        relationship: "FOLDER_OF",
        to: "NPCs Folder",
        toid: 7777777,
      },
      {
        from: "NPCs Folder",
        fromid: 7777777,
        relationship: "PARENT_FOLDER",
        to: "Campaign Root",
        toid: 9999999,
      },
      {
        from: "Benjamin Bowman",
        fromid: 4543966,
        relationship: "ATTRIBUTE_OF",
        to: "Strength Stat",
        toid: 8888888,
      },
      {
        from: "Dark Cities",
        fromid: 123456,
        relationship: "PLACE_CATEGORY_OF",
        to: "London",
        toid: 5271180,
      },
      {
        from: "Benjamin Bowman",
        fromid: 4543966,
        relationship: "ALIGNMENT_OF",
        to: "Chaotic Neutral",
        toid: 9999991,
      },
      {
        from: "Vampire",
        fromid: 9999992,
        relationship: "CONCEPT_OF",
        to: "Benjamin Bowman",
        toid: 4543966,
      },
      {
        from: "Adventurers",
        fromid: 123457,
        relationship: "CATEGORY_OF",
        to: "Benjamin Bowman",
        toid: 4543966,
      },
      {
        from: "Brujah Clan",
        fromid: 123458,
        relationship: "GROUP_CATEGORY_OF",
        to: "Benjamin Bowman",
        toid: 4543966,
      },
      {
        from: "Event",
        fromid: 66,
        relationship: "CATEGORY_OF",
        to: "The Red Wedding",
        toid: 9999993,
      },
    ],
    pages: [
      {
        concept: "ccategory",
        id: 9999993,
        isGoldStar: false,
        page: {
          id: 9999993,
          name: "The Red Wedding",
          concept: "ccategory",
          description: "<p>A tragic banquet event.</p>",
        },
        uri: "/campaign/4543909/ccategory/9999993",
      },
      {
        concept: "Character",
        id: 4543966,
        isGoldStar: false,
        page: {
          id: 4543966,
          name: "Benjamin Bowman",
          concept: "Character",
          description:
            "<p>The <strong>Egyptologist</strong> and adventurer.</p>",
          gmSecrets: "<p>Secretly a vampire of the Brujah clan.</p>",
          aliases: "The Egyptologist, Bowman",
          imageURL: "https://img.example.com/bowman.jpg",
          largeImageURL: "/assets/rf_images/character/bowman_large.png",
          isSecret: false,
          uri: "/campaign/4543909/character/4543966",
        },
        uri: "/campaign/4543909/character/4543966",
      },
      {
        concept: "Event",
        id: 4543885,
        isGoldStar: false,
        page: {
          id: 4543885,
          name: "1 - Chapter One: The Ghost Town",
          concept: "Event",
          description: "<p>The story begins in London.</p>",
          gmSecrets: "",
          isSecret: false,
          uri: "/campaign/4543909/event/4543885",
        },
        uri: "/campaign/4543909/event/4543885",
      },
      {
        concept: "Place",
        id: 5271180,
        isGoldStar: false,
        page: {
          id: 5271180,
          name: "London",
          concept: "Place",
          description: "<p>A dark city.</p>",
          gmSecrets: "",
          isSecret: false,
          uri: "/campaign/4543909/place/5271180",
        },
        uri: "/campaign/4543909/place/5271180",
      },
      {
        concept: "ccategory",
        id: 5625232,
        isGoldStar: false,
        page: {
          id: 5625232,
          name: "Group Category",
          concept: "ccategory",
          description: "<p>Structural campaign category.</p>",
          isSecret: false,
          uri: "/campaign/4543909/ccategory/5625232",
        },
        uri: "/campaign/4543909/ccategory/5625232",
      },
      {
        concept: "folder",
        id: 7777777,
        isGoldStar: false,
        page: {
          id: 7777777,
          name: "NPCs Folder",
          concept: "folder",
          description: "",
          isSecret: false,
          uri: "/campaign/4543909/folder/7777777",
        },
        uri: "/campaign/4543909/folder/7777777",
      },
      {
        concept: "attribute",
        id: 8888888,
        isGoldStar: false,
        page: {
          id: 8888888,
          name: "Strength Stat",
          concept: "attribute",
          description: "",
          isSecret: false,
          uri: "/campaign/4543909/attribute/8888888",
        },
        uri: "/campaign/4543909/attribute/8888888",
      },
    ],
  };

  it("should successfully parse a valid Scabard export structure", () => {
    const pkg = parseScabardExport(mockCampaign);

    expect(pkg.version).toBe("1.0");
    expect(pkg.sourceSystem).toBe("scabard");
    expect(pkg.sourceLabel).toBe("Scabard Campaign 4543909");
    expect(pkg.entityDrafts.length).toBe(4);
    expect(pkg.relationshipDrafts.length).toBe(2); // MEMBER_OF and PARTICIPANT_OF, CONCEPT_OF and CATEGORY_OF become labels/metadata
    expect(pkg.warnings).toContainEqual(
      expect.objectContaining({ code: "SCABARD_CONNECTION_SUMMARY" }),
    );
  });

  it("should map concept types to standard CC types", () => {
    const pkg = parseScabardExport(mockCampaign);

    const characterDraft = pkg.entityDrafts.find(
      (d) => d.sourceId === "4543966",
    );
    expect(characterDraft).toBeDefined();
    expect(characterDraft?.sourceType).toBe("Character");
    expect(characterDraft?.title).toBe("Benjamin Bowman");

    const eventDraft = pkg.entityDrafts.find((d) => d.sourceId === "4543885");
    expect(eventDraft).toBeDefined();
    expect(eventDraft?.sourceType).toBe("Event");
    expect(eventDraft?.title).toBe("1 - Chapter One: The Ghost Town");

    const locationDraft = pkg.entityDrafts.find(
      (d) => d.sourceId === "5271180",
    );
    expect(locationDraft).toBeDefined();
    expect(locationDraft?.sourceType).toBe("Location");
    expect(locationDraft?.title).toBe("London");
  });

  it("should convert HTML descriptions and secrets to Markdown", () => {
    const pkg = parseScabardExport(mockCampaign);

    const characterDraft = pkg.entityDrafts.find(
      (d) => d.sourceId === "4543966",
    );
    expect(characterDraft?.content).toBe(
      "The **Egyptologist** and adventurer.",
    );
    expect(characterDraft?.lore).toBe("Secretly a vampire of the Brujah clan.");
  });

  it("should parse aliases, imageURL and other metadata", () => {
    const pkg = parseScabardExport(mockCampaign);

    const characterDraft = pkg.entityDrafts.find(
      (d) => d.sourceId === "4543966",
    );
    expect(characterDraft?.metadata?.aliases).toEqual([
      "The Egyptologist",
      "Bowman",
    ]);
    expect(characterDraft?.metadata?.imageURL).toBe(
      "https://img.example.com/bowman.jpg",
    );
    expect(characterDraft?.metadata?.largeImageURL).toBe(
      "/assets/rf_images/character/bowman_large.png",
    );
    expect(characterDraft?.image).toBe(
      "https://www.scabard.com/assets/rf_images/character/bowman_large.png",
    );
    expect(characterDraft?.thumbnail).toBe(
      "https://img.example.com/bowman.jpg",
    );
    expect(characterDraft?.metadata?.isSecret).toBe(false);
  });

  it("should normalize connection types to snake_case and labels to Title Case", () => {
    const pkg = parseScabardExport(mockCampaign);

    const memberOfConn = pkg.relationshipDrafts.find(
      (r) =>
        r.fromRef === "scabard:Character:4543966" &&
        r.toRef === "scabard:Location:5271180",
    );
    expect(memberOfConn).toBeDefined();
    expect(memberOfConn?.type).toBe("member_of");
    expect(memberOfConn?.label).toBe("Member Of");

    const participantOfConn = pkg.relationshipDrafts.find(
      (r) =>
        r.fromRef === "scabard:Character:4543966" &&
        r.toRef === "scabard:Event:4543885",
    );
    expect(participantOfConn).toBeDefined();
    expect(participantOfConn?.type).toBe("participant_of");
    expect(participantOfConn?.label).toBe("Participant Of");
  });

  it("should throw an error on invalid JSON input", () => {
    expect(() => parseScabardExport("invalid-json")).toThrow();
    expect(() => parseScabardExport({})).toThrow();
  });

  it("should map place_category_of and other *_category_of relationships to entity labels", () => {
    const pkg = parseScabardExport(mockCampaign);

    const locationDraft = pkg.entityDrafts.find(
      (d) => d.sourceId === "5271180",
    );
    expect(locationDraft).toBeDefined();
    expect(locationDraft?.labels).toContain("Dark Cities");
    expect(locationDraft?.tags).toEqual([]);

    const characterDraft = pkg.entityDrafts.find(
      (d) => d.sourceId === "4543966",
    );
    expect(characterDraft).toBeDefined();
    expect(characterDraft?.labels).toContain("Vampire");
    expect(characterDraft?.labels).toContain("Chaotic Neutral");
    expect(characterDraft?.labels).toContain("Adventurers");
    expect(characterDraft?.labels).toContain("Brujah Clan");
    expect(characterDraft?.labels).not.toContain("Character");
    expect(characterDraft?.tags).toEqual([]);
  });

  it("should infer entity types from CATEGORY_OF connections linking standard categories to generic pages", () => {
    const pkg = parseScabardExport(mockCampaign);

    const eventDraft = pkg.entityDrafts.find((d) => d.sourceId === "9999993");
    expect(eventDraft).toBeDefined();
    expect(eventDraft?.sourceType).toBe("Event");
    expect(eventDraft?.title).toBe("The Red Wedding");
    expect(eventDraft?.content).toContain("A tragic banquet event.");
  });

  it("should map connections pointing from skipped custom category pages (gender_of, race_of) to labels", () => {
    const customCampaign = {
      conns: [
        {
          from: "Female",
          fromid: 5626268,
          relationship: "gender_of",
          to: "Benjamin Bowman",
          toid: 4543966,
        },
        {
          from: "Human",
          fromid: 5625208,
          relationship: "race_of",
          to: "Benjamin Bowman",
          toid: 4543966,
        },
      ],
      pages: [
        {
          concept: "ccategory",
          id: 5626268,
          isGoldStar: false,
          page: {
            id: 5626268,
            name: "Female",
            concept: "ccategory",
            description: "",
          },
          uri: "/campaign/4543909/ccategory/5626268",
        },
        {
          concept: "ccategory",
          id: 5625208,
          isGoldStar: false,
          page: {
            id: 5625208,
            name: "Human",
            concept: "ccategory",
            description: "",
          },
          uri: "/campaign/4543909/ccategory/5625208",
        },
        {
          concept: "Character",
          id: 4543966,
          isGoldStar: false,
          page: {
            id: 4543966,
            name: "Benjamin Bowman",
            concept: "Character",
            description: "<p>GYPTOLOGIST</p>",
          },
          uri: "/campaign/4543909/character/4543966",
        },
      ],
    };

    const pkg = parseScabardExport(customCampaign);
    const draft = pkg.entityDrafts.find((d) => d.sourceId === "4543966");
    expect(draft).toBeDefined();
    expect(draft?.labels).toContain("Female");
    expect(draft?.labels).toContain("Human");
    expect(draft?.tags).toEqual([]);
    expect(pkg.relationshipDrafts.length).toBe(0);
    expect(pkg.warnings).toContainEqual(
      expect.objectContaining({ code: "SCABARD_CONNECTION_SUMMARY" }),
    );
  });

  it("collapses duplicate connections with identical endpoints and type", () => {
    const duplicateConn = {
      from: "Faction A",
      fromid: 100,
      relationship: "PINNER_OF",
      to: "Faction B",
      toid: 200,
    };
    const campaign = {
      conns: [duplicateConn, { ...duplicateConn }],
      pages: [
        {
          concept: "Group",
          id: 100,
          isGoldStar: false,
          page: { id: 100, name: "Faction A", concept: "Group" },
          uri: "/campaign/1/group/100",
        },
        {
          concept: "Group",
          id: 200,
          isGoldStar: false,
          page: { id: 200, name: "Faction B", concept: "Group" },
          uri: "/campaign/1/group/200",
        },
      ],
    };

    const pkg = parseScabardExport(campaign);

    // Both connections are identical, so only one relationship draft survives.
    expect(pkg.relationshipDrafts.length).toBe(1);

    // The keys used by the review UI must be unique.
    const keys = pkg.relationshipDrafts.map(
      (r) => `${r.fromRef}:${r.toRef}:${r.type}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("ignores clone_of and template_of connections entirely", () => {
    const cloneConn = {
      from: "Faction A",
      fromid: 100,
      relationship: "clone_of",
      to: "Faction B",
      toid: 200,
    };
    const templateConn = {
      from: "Faction A",
      fromid: 100,
      relationship: "template_of",
      to: "Faction B",
      toid: 200,
    };
    const campaign = {
      conns: [cloneConn, templateConn],
      pages: [
        {
          concept: "Group",
          id: 100,
          isGoldStar: false,
          page: { id: 100, name: "Faction A", concept: "Group" },
          uri: "/campaign/1/group/100",
        },
        {
          concept: "Group",
          id: 200,
          isGoldStar: false,
          page: { id: 200, name: "Faction B", concept: "Group" },
          uri: "/campaign/1/group/200",
        },
      ],
    };

    const pkg = parseScabardExport(campaign);
    expect(pkg.relationshipDrafts.length).toBe(0);
  });
});
