import { describe, it, expect } from "vitest";
import {
  buildCultureGuidance,
  collectCultures,
  cultureLabelBase,
  extractNamingGuidance,
  resolveCultureNaming,
} from "./generator-culture-naming";
import type { Entity } from "schema";

function entity(
  id: string,
  title: string,
  type: string,
  extra: Partial<Entity> = {},
): Entity {
  return {
    id,
    title,
    type,
    content: "",
    lore: "",
    labels: [],
    connections: [],
    createdAt: 0,
    updatedAt: 0,
    ...extra,
  } as Entity;
}

function vault(entities: Entity[]): Record<string, Entity> {
  return Object.fromEntries(entities.map((e) => [e.id, e]));
}

describe("cultureLabelBase", () => {
  it("reads the culture or language name from a label", () => {
    expect(cultureLabelBase("Stormber culture")).toBe("Stormber");
    expect(cultureLabelBase("Srathi (orcish) culture")).toBe("Srathi");
    expect(cultureLabelBase("Uldekh (goblin) language")).toBe("Uldekh");
  });

  it("ignores labels that are not culture or language labels", () => {
    expect(cultureLabelBase("Human")).toBeUndefined();
    expect(cultureLabelBase("culture")).toBeUndefined();
    expect(cultureLabelBase("")).toBeUndefined();
  });
});

describe("collectCultures", () => {
  it("counts the cultures named by labels across the vault", () => {
    const cultures = collectCultures(
      vault([
        entity("a", "A", "location", { labels: ["Stormber culture"] }),
        entity("b", "B", "location", { labels: ["Stormber culture"] }),
        entity("c", "C", "location", { labels: ["Dunirr language"] }),
      ]),
    );
    expect(cultures.get("stormber")?.count).toBe(2);
    expect(cultures.get("dunirr")?.name).toBe("Dunirr");
  });
});

describe("resolveCultureNaming", () => {
  const entities = vault([
    entity("n1", "Clan Leadership of the Stormber", "note"),
    entity("n2", "Dunirr naming conventions", "note"),
    entity("n3", "Naming conventions", "note"),
    entity("l1", "Fevespok", "location", { labels: ["Stormber culture"] }),
    entity("l2", "Ar'thuss", "location", { labels: ["Stormber culture"] }),
    ...["Béla", "Eszter", "Csilla", "Dávid"].map((n, i) =>
      entity(`c${i}`, n, "character", { labels: ["Stormberi", "Human"] }),
    ),
    entity("d1", "Dorim Ironheart", "character", {
      labels: ["Dunirr language", "Dwarf"],
    }),
    entity("x", "Mira", "character", { labels: ["Human"] }),
  ]);

  it("picks the culture the user's instructions name", () => {
    const r = resolveCultureNaming({
      allEntities: entities,
      instructions: "a horse-clan chieftain of the stormber plains",
      targetEntityType: "character",
    });
    expect(r?.culture).toBe("Stormber");
  });

  it("falls back to the source entity's culture label", () => {
    const r = resolveCultureNaming({
      allEntities: entities,
      sourceEntity: entities["l1"],
      targetEntityType: "character",
    });
    expect(r?.culture).toBe("Stormber");
  });

  it("falls back to the culture most of the connected entities share", () => {
    const r = resolveCultureNaming({
      allEntities: entities,
      sourceEntity: entity("s", "Hub", "faction"),
      connectedIds: new Set(["c0", "c1", "c2", "x"]),
      targetEntityType: "character",
    });
    expect(r?.culture).toBe("Stormber");
  });

  it("uses same-type members of the culture as name examples, including demonym labels", () => {
    const r = resolveCultureNaming({
      allEntities: entities,
      instructions: "stormber",
      targetEntityType: "character",
    });
    expect(r?.examples.sort()).toEqual(["Béla", "Csilla", "Dávid", "Eszter"]);
  });

  it("points at the culture's naming notes first, then generic naming notes", () => {
    const r = resolveCultureNaming({
      allEntities: entities,
      instructions: "dunirr",
      targetEntityType: "character",
    });
    expect(r?.docIds[0]).toBe("n2");
    expect(r?.docIds).toContain("n3");
    expect(r?.docIds.length).toBeLessThanOrEqual(8);
  });

  it("returns nothing when no culture is signalled or recognised", () => {
    expect(
      resolveCultureNaming({
        allEntities: entities,
        instructions: "a quiet baker",
        targetEntityType: "character",
      }),
    ).toBeUndefined();
    expect(
      resolveCultureNaming({
        allEntities: vault([entity("x", "Mira", "character")]),
        instructions: "stormber",
        targetEntityType: "character",
      }),
    ).toBeUndefined();
  });

  it("does not mistake a culture name inside a longer word for a mention", () => {
    const r = resolveCultureNaming({
      allEntities: entities,
      instructions: "a stormberry farmer",
      targetEntityType: "character",
    });
    expect(r).toBeUndefined();
  });
});

describe("extractNamingGuidance", () => {
  it("keeps sentences about naming and inspiration, drops the rest", () => {
    const n = entity("n", "Clan Leadership", "note", {
      content:
        "The clans gather each spring. Drawing inspiration from the Magyar people, leaders carry titles like Vezér. Weather is harsh. Given names are short and surnames are occupations.",
    });
    const out = extractNamingGuidance(n);
    expect(out.join(" ")).toContain("Magyar");
    expect(out.join(" ")).toContain("surnames are occupations");
    expect(out.join(" ")).not.toContain("Weather");
  });

  it("returns nothing for an entity with no naming cues", () => {
    expect(
      extractNamingGuidance(
        entity("n", "Weather", "note", { content: "It rains often." }),
      ),
    ).toEqual([]);
  });
});

describe("buildCultureGuidance", () => {
  const magyar = "Stormber names follow Magyar patterns.";

  it("keeps guidance only from notes that mention the culture", () => {
    const docs = vault([
      entity("a", "Karesh naming conventions", "note", {
        content: `${magyar} Surnames are trades.`,
      }),
      entity("b", "Names of the Morvali", "note", {
        content: "Morvali names are given at birth.",
      }),
    ]);
    const out = buildCultureGuidance(docs, ["a", "b"], "Stormber");
    expect(out.join(" ")).toContain("Magyar");
    expect(out.join(" ")).not.toContain("Morvali");
  });

  it("accepts a note whose title or labels name the culture", () => {
    const docs = vault([
      entity("a", "Stormber naming conventions", "note", {
        content: "Given names are short.",
      }),
    ]);
    expect(buildCultureGuidance(docs, ["a"], "Stormber")).toEqual([
      "Given names are short.",
    ]);
  });

  it("stays within a size budget", () => {
    const long = "Stormber names follow Magyar patterns. ".repeat(80);
    const docs = vault([
      entity("a", "A", "note", { content: long }),
      entity("b", "B", "note", { content: long }),
    ]);
    const out = buildCultureGuidance(docs, ["a", "b", "missing"], "Stormber");
    expect(out.length).toBeGreaterThan(0);
    expect(out.join("").length).toBeLessThanOrEqual(900);
  });

  it("returns an empty list when there are no usable documents", () => {
    expect(buildCultureGuidance({}, ["a"], "Stormber")).toEqual([]);
  });
});
