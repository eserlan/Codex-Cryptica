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
    expect(pkg.relationshipDrafts.length).toBe(2); // MEMBER_OF and PARTICIPANT_OF, CONCEPT_OF and CATEGORY_OF skipped
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
    expect(characterDraft?.metadata?.isSecret).toBe(false);
  });

  it("should normalize connection types to snake_case and labels to Title Case", () => {
    const pkg = parseScabardExport(mockCampaign);

    const memberOfConn = pkg.relationshipDrafts.find(
      (r) => r.fromRef === "4543966" && r.toRef === "5271180",
    );
    expect(memberOfConn).toBeDefined();
    expect(memberOfConn?.type).toBe("member_of");
    expect(memberOfConn?.label).toBe("Member Of");

    const participantOfConn = pkg.relationshipDrafts.find(
      (r) => r.fromRef === "4543966" && r.toRef === "4543885",
    );
    expect(participantOfConn).toBeDefined();
    expect(participantOfConn?.type).toBe("participant_of");
    expect(participantOfConn?.label).toBe("Participant Of");
  });

  it("should throw an error on invalid JSON input", () => {
    expect(() => parseScabardExport("invalid-json")).toThrow();
    expect(() => parseScabardExport({})).toThrow();
  });

  it("should map place_category_of and other *_category_of relationships to entity tags/labels", () => {
    const pkg = parseScabardExport(mockCampaign);

    const locationDraft = pkg.entityDrafts.find(
      (d) => d.sourceId === "5271180",
    );
    expect(locationDraft).toBeDefined();
    expect(locationDraft?.tags).toContain("Dark Cities");

    const characterDraft = pkg.entityDrafts.find(
      (d) => d.sourceId === "4543966",
    );
    expect(characterDraft).toBeDefined();
    expect(characterDraft?.tags).toContain("Vampire");
    expect(characterDraft?.tags).toContain("Chaotic Neutral");
    expect(characterDraft?.tags).toContain("Adventurers");
    expect(characterDraft?.tags).toContain("Brujah Clan");
    expect(characterDraft?.tags).not.toContain("Character");
  });

  it("should infer entity types from CATEGORY_OF connections linking standard categories to generic pages", () => {
    const pkg = parseScabardExport(mockCampaign);

    const eventDraft = pkg.entityDrafts.find((d) => d.sourceId === "9999993");
    expect(eventDraft).toBeDefined();
    expect(eventDraft?.sourceType).toBe("Event");
    expect(eventDraft?.title).toBe("The Red Wedding");
    expect(eventDraft?.content).toContain("A tragic banquet event.");
  });
});
