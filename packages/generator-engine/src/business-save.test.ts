import { describe, expect, it } from "vitest";
import {
  buildBusinessSavePlan,
  buildBusinessImportDrafts,
} from "./business-save";
import { generateBusinessLocal } from "./business-local";
import { seeded } from "./business-test-helpers";
import type { BusinessDocument, BusinessRelationship } from "./business-state";

function doc(
  over: Partial<BusinessDocument> = {},
  seed = 31,
): BusinessDocument {
  const base = generateBusinessLocal(
    {
      genre: "Classic Fantasy",
      businessType: "Blacksmith",
      scale: "established",
    },
    seeded(seed),
  );
  return { ...base, ...over };
}

function rel(
  name: string,
  partyKind: BusinessRelationship["partyKind"] = "organisation",
): BusinessRelationship {
  return {
    id: `rel-${name}`,
    name,
    kind: "competitor",
    label: "competes with",
    reason: "Rival.",
    partyKind,
  };
}

describe("buildBusinessSavePlan", () => {
  it("makes one Faction for the business, carrying its text", () => {
    const d = doc();
    const plan = buildBusinessSavePlan(d, { existingTitles: new Map() });
    expect(plan.business.type).toBe("faction");
    expect(plan.business.title).toBe(d.identity.name);
    expect(plan.business.content).toContain("## Identity");
    expect(plan.business.labels).toContain("business");
  });

  it("ticks every person and links the owner with owned by and staff with employs", () => {
    const d = doc({
      staff: [
        {
          id: "staff-1",
          name: "Tal Doran",
          role: "apprentice",
          goal: "g",
          trait: "t",
        },
      ],
    });
    const plan = buildBusinessSavePlan(d, { existingTitles: new Map() });
    const owner = plan.people.find((p) => p.personId === "lead");
    const staff = plan.people.find((p) => p.personId === "staff-1");
    expect(owner).toMatchObject({ link: "owned by", ticked: true });
    expect(staff).toMatchObject({ link: "employs", ticked: true });
  });

  it("links a manager with employs and never owned by when the players own it", () => {
    const d = doc({
      options: { ...doc().options, playersOwn: true },
      leadership: { ...doc().leadership, role: "manager" },
    });
    const plan = buildBusinessSavePlan(d, { existingTitles: new Map() });
    expect(plan.people.find((p) => p.personId === "lead")?.link).toBe(
      "employs",
    );
    expect(plan.people.some((p) => p.link === "owned by")).toBe(false);
  });

  it("matches an outside party whose name is already in the vault, ticked", () => {
    const d = doc({ relationships: [rel("The Crown Dispatch Company")] });
    const plan = buildBusinessSavePlan(d, {
      existingTitles: new Map([["the crown dispatch company", "ent-crown"]]),
    });
    expect(plan.parties[0].choice).toEqual({
      kind: "match",
      entityId: "ent-crown",
      ticked: true,
    });
  });

  it("offers an unmatched organisation as a new Faction, unticked", () => {
    const d = doc({ relationships: [rel("Unknown Guild", "organisation")] });
    const plan = buildBusinessSavePlan(d, { existingTitles: new Map() });
    expect(plan.parties[0].choice).toMatchObject({
      kind: "create",
      entityType: "faction",
      ticked: false,
    });
  });

  it("offers an unmatched individual as a new Character, unticked", () => {
    const d = doc({ relationships: [rel("Lady Vex", "individual")] });
    const plan = buildBusinessSavePlan(d, { existingTitles: new Map() });
    expect(plan.parties[0].choice).toMatchObject({
      kind: "create",
      entityType: "character",
      ticked: false,
    });
  });

  it("flags a name that already exists in the vault as a collision", () => {
    const d = doc();
    const plan = buildBusinessSavePlan(d, {
      existingTitles: new Map([[d.identity.name.toLowerCase(), "ent-same"]]),
    });
    expect(plan.business.collision).toBe("ent-same");
  });

  it("offers source link labels by entity type and defaults to the first", () => {
    const d = doc();
    expect(
      buildBusinessSavePlan(d, {
        existingTitles: new Map(),
        source: { entityId: "e1", entityType: "location" },
      }).source,
    ).toMatchObject({
      entityId: "e1",
      labelOptions: ["located in"],
      label: "located in",
      ticked: true,
    });
    expect(
      buildBusinessSavePlan(d, {
        existingTitles: new Map(),
        source: { entityId: "e2", entityType: "character" },
      }).source?.label,
    ).toBe("owned by");
    const faction = buildBusinessSavePlan(d, {
      existingTitles: new Map(),
      source: { entityId: "e3", entityType: "faction" },
    }).source;
    expect(faction?.labelOptions).toEqual(["protected by", "contracted by"]);
  });

  it("leaves out no source when the business was not launched from an entity", () => {
    expect(
      buildBusinessSavePlan(doc(), { existingTitles: new Map() }).source,
    ).toBeUndefined();
  });
});

describe("buildBusinessImportDrafts (public handoff)", () => {
  it("returns the business and the ticked people, with relationships, and no outside parties", () => {
    const d = doc({ relationships: [rel("Unknown Guild")] });
    const drafts = buildBusinessImportDrafts(d) as Array<{
      type: string;
      title: string;
      relationships?: unknown[];
    }>;
    expect(drafts.map((x) => x.type)).toEqual(
      expect.arrayContaining(["faction", "character"]),
    );
    const business = drafts.find((x) => x.type === "faction");
    expect(business?.relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: d.leadership.name, type: "owned by" }),
      ]),
    );
    expect(drafts.some((x) => x.title === "Unknown Guild")).toBe(false);
  });

  it("leaves out people who are not ticked", () => {
    const d = doc();
    const drafts = buildBusinessImportDrafts(d, []) as Array<{ type: string }>;
    expect(drafts.filter((x) => x.type === "character")).toHaveLength(0);
  });
});
