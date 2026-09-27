import { describe, expect, it } from "vitest";
import type { Connection } from "schema";
import {
  extractDossierAttributes,
  extractDossierSections,
  extractEntitySubtitle,
  extractQuote,
  formatCoordinates,
  getConnectionStance,
  getEntityPrimaryStance,
  getFactionMemberIcon,
  getFactionMembers,
  getFactionRelations,
  getFactionTags,
  getGroupedRelations,
  normalizeEntityCardViewPreference,
  resolveEntityCardVariant,
} from "./entity-card-variant";

function connection(
  target: string,
  overrides: Partial<Connection> = {},
): Connection {
  return { target, type: "neutral", strength: 1, ...overrides };
}

describe("resolveEntityCardVariant", () => {
  it.each([["character"], ["creature"]])(
    "maps %s to the character card",
    (type) => {
      expect(resolveEntityCardVariant(type)).toBe("character");
    },
  );

  it("maps faction to the faction card", () => {
    expect(resolveEntityCardVariant("faction")).toBe("faction");
  });

  it("maps location to the location card", () => {
    expect(resolveEntityCardVariant("location")).toBe("location");
  });

  it.each([["note"], ["event"], ["item"], ["custom-type"], [""]])(
    "falls back to the default card for %s",
    (type) => {
      expect(resolveEntityCardVariant(type)).toBe("default");
    },
  );

  it("falls back to the default card when the type is missing", () => {
    expect(resolveEntityCardVariant(undefined)).toBe("default");
    expect(resolveEntityCardVariant(null)).toBe("default");
  });

  it("matches case-insensitively", () => {
    expect(resolveEntityCardVariant("Character")).toBe("character");
    expect(resolveEntityCardVariant("FACTION")).toBe("faction");
  });
});

describe("resolveEntityCardVariant with view preference", () => {
  it("prefers an explicit card choice over the entity type", () => {
    expect(resolveEntityCardVariant("character", "default")).toBe("default");
    expect(resolveEntityCardVariant("note", "faction")).toBe("faction");
    expect(resolveEntityCardVariant("faction", "location")).toBe("location");
    expect(resolveEntityCardVariant("character", "image_only")).toBe(
      "image_only",
    );
  });

  it("falls back to the entity type for auto or missing preferences", () => {
    expect(resolveEntityCardVariant("character", "auto")).toBe("character");
    expect(resolveEntityCardVariant("character", undefined)).toBe("character");
    expect(resolveEntityCardVariant("note", "auto")).toBe("default");
  });

  it("ignores invalid preferences", () => {
    expect(resolveEntityCardVariant("character", "portrait" as never)).toBe(
      "character",
    );
  });
});

describe("normalizeEntityCardViewPreference", () => {
  it("accepts known preferences", () => {
    expect(normalizeEntityCardViewPreference("faction")).toBe("faction");
    expect(normalizeEntityCardViewPreference("auto")).toBe("auto");
    expect(normalizeEntityCardViewPreference("image_only")).toBe("image_only");
  });

  it("falls back to auto for unknown or missing values", () => {
    expect(normalizeEntityCardViewPreference(undefined)).toBe("auto");
    expect(normalizeEntityCardViewPreference(null)).toBe("auto");
    expect(normalizeEntityCardViewPreference("portrait")).toBe("auto");
    expect(normalizeEntityCardViewPreference(42)).toBe("auto");
  });
});

describe("getConnectionStance", () => {
  it("maps enemy, friendly and knows to coloured stances", () => {
    expect(getConnectionStance("enemy")).toBe("enemy");
    expect(getConnectionStance("friendly")).toBe("ally");
    expect(getConnectionStance("knows")).toBe("friend");
  });

  it("treats everything else as neutral", () => {
    expect(getConnectionStance("neutral")).toBe("neutral");
    expect(getConnectionStance("parent_of")).toBe("neutral");
    expect(getConnectionStance("sworn-rival")).toBe("neutral");
    expect(getConnectionStance(undefined)).toBe("neutral");
    expect(getConnectionStance("")).toBe("neutral");
  });
});

describe("extractQuote", () => {
  it("returns the first explicit blockquote line", () => {
    expect(
      extractQuote("A rogue with a past.\n\n> Protect the weak.\n\nMore text."),
    ).toBe("Protect the weak.");
  });

  it("strips markdown from the quote", () => {
    expect(
      extractQuote("> **Bold** words with [link](https://x.example)."),
    ).toBe("Bold words with link.");
  });

  it("extracts multi-line quotes and contiguous blockquotes", () => {
    const multiLineQuote = extractQuote(
      '"Beskytter de svake.\nDet er derfor vi bærer våpen."',
    );
    expect(multiLineQuote).toBe(
      "Beskytter de svake. Det er derfor vi bærer våpen.",
    );

    const blockquote = extractQuote(
      "> Shadows are my armor.\n> Silence is my blade.",
    );
    expect(blockquote).toBe("Shadows are my armor. Silence is my blade.");
  });

  it("extracts quote from metadata when present", () => {
    const quote = extractQuote(undefined, {
      quote: "Knowledge without compassion is raw power.",
    });
    expect(quote).toBe("Knowledge without compassion is raw power.");
  });

  it("returns undefined when the entity has no explicit quote", () => {
    expect(extractQuote("## Backstory\nRaised in the north.")).toBeUndefined();
    expect(extractQuote("Just a description, no quote.")).toBeUndefined();
  });

  it("truncates long quotes", () => {
    const quote = extractQuote(`> ${"x".repeat(200)}`, null, 140);
    expect(quote?.length).toBeLessThanOrEqual(140);
    expect(quote?.endsWith("…")).toBe(true);
  });

  it("returns undefined for empty or markup-only content", () => {
    expect(extractQuote(undefined)).toBeUndefined();
    expect(extractQuote("")).toBeUndefined();
    expect(extractQuote("\n  \n")).toBeUndefined();
    expect(extractQuote("## ")).toBeUndefined();
  });
});

describe("getGroupedRelations", () => {
  const lookup = (id: string) =>
    ({
      a: { title: "Lajos", type: "character" },
      b: { title: "Black Eagles", type: "faction" },
      c: { title: "Buried Tower", type: "location" },
      d: { title: "Field Note", type: "note" },
    })[id];

  it("groups links under Characters, Factions, Locations, then Other", () => {
    const groups = getGroupedRelations(
      [
        connection("d", { label: "scribbled about" }),
        connection("c", { type: "located_in", label: "hides in" }),
        connection("b", { type: "part_of" }),
        connection("a", { type: "friendly", label: "Sworn Ally" }),
      ],
      lookup,
    );

    expect(groups.map((group) => group.label)).toEqual([
      "Characters",
      "Factions",
      "Locations",
      "Other",
    ]);
    expect(groups[0].rows).toEqual([
      { target: "a", title: "Lajos", text: "Sworn Ally", stance: "ally" },
    ]);
    expect(groups[3].rows[0].title).toBe("Field Note");
  });

  it("omits empty groups and resolves unknown titles", () => {
    const groups = getGroupedRelations(
      [connection("ghost", { type: "enemy", label: "killer of" })],
      lookup,
    );

    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Other");
    expect(groups[0].rows).toEqual([
      {
        target: "ghost",
        title: "Unknown",
        text: "killer of",
        stance: "enemy",
      },
    ]);
  });

  it("returns no groups without connections", () => {
    expect(getGroupedRelations(undefined, lookup)).toEqual([]);
    expect(getGroupedRelations([], lookup)).toEqual([]);
  });

  it("deduplicates identical connections within the same link group", () => {
    const groups = getGroupedRelations(
      [
        connection("c1", { label: "Sworn Ally", type: "friendly" }),
        connection("c1", { label: "Sworn Ally", type: "friendly" }),
      ],
      lookup,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].rows).toHaveLength(1);
  });
});

describe("getFactionMembers", () => {
  it("resolves member titles through the lookup", () => {
    const { members, memberCount } = getFactionMembers(
      [connection("a"), connection("b")],
      (id) => ({ a: "Vargas", b: "Lajos" })[id],
    );

    expect(members).toEqual([
      { id: "a", title: "Vargas", stance: "neutral" },
      { id: "b", title: "Lajos", stance: "neutral" },
    ]);
    expect(memberCount).toBe(2);
  });

  it("falls back to Unknown for unresolvable members but still counts them", () => {
    const { members, memberCount } = getFactionMembers(
      [connection("a"), connection("ghost")],
      (id) => (id === "a" ? "Vargas" : undefined),
      5,
    );

    expect(members).toEqual([
      { id: "a", title: "Vargas", stance: "neutral" },
      { id: "ghost", title: "Unknown", stance: "neutral" },
    ]);
    expect(memberCount).toBe(2);
  });

  it("caps visible members at the limit while keeping the full count", () => {
    const connections = Array.from({ length: 7 }, (_, index) =>
      connection(`member-${index}`),
    );
    const { members, memberCount } = getFactionMembers(
      connections,
      (id) => id,
      5,
    );

    expect(members).toHaveLength(5);
    expect(memberCount).toBe(7);
  });

  it("handles missing connections", () => {
    expect(getFactionMembers(undefined, () => "x")).toEqual({
      members: [],
      memberCount: 0,
    });
  });
});

describe("getFactionRelations", () => {
  const vaultEntities = {
    c1: { id: "c1", title: "Commander Valen", type: "character" },
    c2: { id: "c2", title: "Scout Eric", type: "character" },
    c3: {
      id: "c3",
      title: "Agent Selene",
      type: "npc",
      connections: [{ target: "fac1", type: "member", strength: 1 }],
    },
    c4: {
      id: "c4",
      title: "High King Alistair",
      type: "character",
      connections: [{ target: "fac1", label: "Lord Commander", strength: 1 }],
    },
    item1: { id: "item1", title: "The Defiler's Fetish", type: "item" },
    loc1: { id: "loc1", title: "Citadel of Dawn", type: "location" },
    note1: { id: "note1", title: "01 - 010423", type: "note" },
    note2: { id: "note2", title: "02 - 280423", type: "session" },
  };

  it("extracts Leaders and Members, strictly omitting items, locations, and session notes", () => {
    const faction = {
      id: "fac1",
      title: "The Younglings",
      connections: [
        connection("item1", { label: "Artifact" }),
        connection("note1", { label: "Session 1" }),
        connection("note2", { label: "Session 2" }),
        connection("loc1", { label: "HQ" }),
        connection("c1", { label: "Leader & Founder", type: "friendly" }),
        connection("c2", { label: "Member", type: "friendly" }),
      ],
    };

    const { groups, members, memberCount } = getFactionRelations(
      faction,
      vaultEntities,
    );

    // Only Leaders and Members should be grouped; zero items, session notes, or locations
    expect(groups.map((g) => g.label)).toEqual(["Leaders", "Members"]);

    const leadersGroup = groups.find((g) => g.label === "Leaders");
    expect(leadersGroup?.rows).toEqual([
      expect.objectContaining({
        target: "c1",
        title: "Commander Valen",
        text: "Leader & Founder",
      }),
      expect.objectContaining({
        target: "c4",
        title: "High King Alistair",
        text: "Lord Commander",
      }),
    ]);

    const membersGroup = groups.find((g) => g.label === "Members");
    expect(membersGroup?.rows).toEqual([
      expect.objectContaining({
        target: "c2",
        title: "Scout Eric",
        text: "Member",
      }),
      expect.objectContaining({
        target: "c3",
        title: "Agent Selene",
        text: "Member",
      }),
    ]);

    // Member count should reflect total people (2 leaders + 2 members = 4)
    expect(memberCount).toBe(4);

    // Members avatar dots should only contain character titles, never items or session logs
    expect(members.map((m) => m.title)).toEqual([
      "Commander Valen",
      "High King Alistair",
      "Scout Eric",
      "Agent Selene",
    ]);
  });

  it("handles missing faction or empty entities gracefully", () => {
    expect(getFactionRelations(undefined, undefined)).toEqual({
      groups: [],
      members: [],
      memberCount: 0,
      leaders: [],
      allRosterMembers: [],
    });
  });

  it("extracts all roster members with leaders marked correctly", () => {
    const faction = {
      id: "fac1",
      title: "The Silver Hand",
      connections: [
        connection("c1", { label: "High Commander", type: "friendly" }),
        connection("c2", { label: "Infantry", type: "friendly" }),
      ],
    };

    const { allRosterMembers, leaders } = getFactionRelations(
      faction,
      vaultEntities,
    );

    expect(leaders).toHaveLength(2); // c1 (outgoing) + c4 (incoming Lord Commander)
    expect(allRosterMembers).toHaveLength(4);
    expect(allRosterMembers.filter((m) => m.isLeader)).toHaveLength(2);
    expect(allRosterMembers.filter((m) => !m.isLeader)).toHaveLength(2);
  });

  it("strictly excludes enemies, rivals, prisoners, and non-member characters", () => {
    const faction = {
      id: "fac1",
      title: "The Silver Hand",
      connections: [
        connection("c1", { label: "High Commander", type: "friendly" }),
        connection("c2", { label: "Infantry Member", type: "friendly" }),
        connection("enemy1", { label: "Sworn Enemy", type: "enemy" }),
        connection("prisoner1", { label: "Prisoner of War", type: "hostile" }),
        connection("contact1", { label: "Informant", type: "knows" }),
      ],
    };

    const extendedEntities = {
      ...vaultEntities,
      enemy1: { id: "enemy1", title: "Malakor", type: "character" },
      prisoner1: { id: "prisoner1", title: "Captured Spy", type: "character" },
      contact1: { id: "contact1", title: "Tavern Barkeep", type: "npc" },
      rivalChar: {
        id: "rivalChar",
        title: "Rival Boss",
        type: "character",
        connections: [{ target: "fac1", label: "Arch-Nemesis", type: "enemy" }],
      },
    };

    const { allRosterMembers, memberCount } = getFactionRelations(
      faction,
      extendedEntities,
    );

    // Only actual leaders & members should be present: c1 (leader), c2 (member), c4 (incoming leader), c3 (incoming member)
    expect(allRosterMembers.map((m) => m.title)).not.toContain("Malakor");
    expect(allRosterMembers.map((m) => m.title)).not.toContain("Captured Spy");
    expect(allRosterMembers.map((m) => m.title)).not.toContain(
      "Tavern Barkeep",
    );
    expect(allRosterMembers.map((m) => m.title)).not.toContain("Rival Boss");
    expect(allRosterMembers).toHaveLength(4);
    expect(memberCount).toBe(4);
  });
});

describe("formatCoordinates", () => {
  it("formats finite coordinates", () => {
    expect(formatCoordinates({ coordinates: { x: 12, y: -4 } })).toBe("12, -4");
  });

  it("returns undefined when coordinates are absent or invalid", () => {
    expect(formatCoordinates(undefined)).toBeUndefined();
    expect(formatCoordinates(null)).toBeUndefined();
    expect(formatCoordinates({})).toBeUndefined();
    expect(
      formatCoordinates({ coordinates: { x: NaN, y: 1 } }),
    ).toBeUndefined();
  });
});

describe("extractEntitySubtitle", () => {
  it("formats ancestry and role from content key-values", () => {
    const entity = {
      type: "character",
      content: "**Rase:** Menneske\n**Klasse:** Kriger\nSome history.",
    };
    expect(extractEntitySubtitle(entity)).toBe("Menneske · Kriger");
  });

  it("formats ancestry and role in English", () => {
    const entity = {
      type: "character",
      content: "- **Race:** Half-Elf\n- **Role:** Wizard",
    };
    expect(extractEntitySubtitle(entity)).toBe("Half-Elf · Wizard");
  });

  it("extracts from metadata when present", () => {
    const entity = {
      type: "character",
      metadata: { ancestry: "Dwarf", role: "Cleric" },
    };
    expect(extractEntitySubtitle(entity)).toBe("Dwarf · Cleric");
  });

  it("falls back to kind or capitalized entity type", () => {
    expect(extractEntitySubtitle({ kind: "Infiltrator" })).toBe("Infiltrator");
    expect(extractEntitySubtitle({ type: "character" })).toBe("Character");
    expect(extractEntitySubtitle(undefined)).toBe("");
  });
});

describe("extractDossierAttributes", () => {
  it("extracts Scandinavian and English dossier attributes", () => {
    const content = `
**Alder:** 32
**Opprinnelse:** Nordmarkene
**Nåværende lokasjon:** De Frie Byene
**Tilknytning:** Partyet
**Yrke/rolle:** Kriger
**Spesielle trekk:** Tidligere soldat
### Bakgrunn
Kael vokste opp i en liten by.
`;
    const attributes = extractDossierAttributes(content);
    expect(attributes.map((a) => a.label)).toEqual([
      "Age",
      "Origin",
      "Location",
      "Affiliation",
      "Role",
      "Traits",
    ]);
    expect(attributes[0].value).toBe("32");
    expect(attributes[1].value).toBe("Nordmarkene");
    expect(attributes[2].icon).toBe("icon-[lucide--map-pin]");
    expect(attributes[3].icon).toBe("icon-[lucide--shield]");
  });

  it("falls back to metadata attributes", () => {
    const attributes = extractDossierAttributes("", {
      age: 28,
      origin: "Valdren",
      role: "Diplomat",
      location: "Free Cities",
      status: "Ally",
    });
    expect(attributes).toHaveLength(5);
    expect(attributes[0].label).toBe("Age");
    expect(attributes[0].value).toBe("28");
    expect(attributes[1].label).toBe("Origin");
    expect(attributes[1].value).toBe("Valdren");
    expect(attributes[2].label).toBe("Location");
    expect(attributes[2].value).toBe("Free Cities");
    expect(attributes[3].label).toBe("Role");
    expect(attributes[4].label).toBe("Status");
  });

  it("derives fallback stats from entity labels and stance when sparse", () => {
    const attributes = extractDossierAttributes("", null, {
      type: "character",
      labels: ["Sworn Ally", "Veteran Marksman"],
    });
    expect(
      attributes.some(
        (a) =>
          a.label === "Role" || a.label === "Traits" || a.label === "Status",
      ),
    ).toBe(true);
  });
});

describe("extractDossierSections", () => {
  it("extracts background narrative and bulleted goals", () => {
    const content = `
> Protect the weak.

**Age:** 32

### Background
Kael grew up in a border town.
After several years he left the military.

### Goals
- Protect friends
- Find the truth
- Build a better home
`;
    const sections = extractDossierSections(content);
    expect(sections.background).toContain("Kael grew up in a border town");
    expect(sections.goals).toEqual([
      "Protect friends",
      "Find the truth",
      "Build a better home",
    ]);
  });
});

describe("getFactionTags", () => {
  it("maps faction labels to stylized pills with icons", () => {
    const tags = getFactionTags(["Alliert", "Politisk makt", "Valdren"]);
    expect(tags).toEqual([
      { label: "Ally", icon: "icon-[lucide--shield]", variant: "ally" },
      {
        label: "Political Power",
        icon: "icon-[lucide--swords]",
        variant: "default",
      },
      { label: "Valdren", icon: "icon-[lucide--map-pin]", variant: "default" },
    ]);
  });

  it("handles hostile and neutral tags", () => {
    const tags = getFactionTags(["Fiende", "Kult", "Nøytral"]);
    expect(tags[0].variant).toBe("enemy");
    expect(tags[0].label).toBe("Enemy");
    expect(tags[0].icon).toBe("icon-[lucide--skull]");
    expect(tags[1].label).toBe("Cult");
    expect(tags[1].icon).toBe("icon-[lucide--sparkles]");
    expect(tags[2].variant).toBe("neutral");
    expect(tags[2].label).toBe("Neutral");
    expect(tags[2].icon).toBe("icon-[lucide--scale]");
  });
});

describe("getFactionMemberIcon", () => {
  it("chooses a role icon and gives leaders a crown", () => {
    expect(getFactionMemberIcon("Northern Wizard", false)).toBe(
      "icon-[lucide--sparkles]",
    );
    expect(getFactionMemberIcon("Unknown", true)).toBe("icon-[lucide--crown]");
    expect(getFactionMemberIcon("Unknown", false)).toBe("icon-[lucide--user]");
  });
});

describe("compact variant and primary stance", () => {
  it("resolves compact view preference", () => {
    expect(resolveEntityCardVariant("character", "compact")).toBe("compact");
    expect(normalizeEntityCardViewPreference("compact")).toBe("compact");
  });

  it("extracts primary stance for factions", () => {
    expect(getEntityPrimaryStance({ type: "faction" })).toEqual({
      stance: "faction",
      badgeText: "Faction",
    });
  });

  it("extracts ally stance from labels or metadata", () => {
    expect(
      getEntityPrimaryStance({
        type: "character",
        labels: ["Alliert", "Viktig person"],
      }),
    ).toEqual({
      stance: "ally",
      badgeText: "Ally",
    });
  });

  it("extracts enemy stance from labels or metadata", () => {
    expect(
      getEntityPrimaryStance({
        type: "character",
        metadata: { stance: "Fiende" },
      }),
    ).toEqual({
      stance: "enemy",
      badgeText: "Enemy",
    });
  });

  it("extracts party/friend stance from labels or metadata", () => {
    expect(
      getEntityPrimaryStance({
        type: "character",
        metadata: { tilknytning: "Partyet" },
      }),
    ).toEqual({
      stance: "friend",
      badgeText: "Party",
    });
  });
});
