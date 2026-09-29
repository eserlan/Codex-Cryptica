import { describe, expect, it } from "vitest";
import { entity } from "../test-fixtures";
import { renderCharacterSummary } from "./character";
import { renderFactionSummary } from "./faction";
import { renderGenericSummary } from "./generic";
import { renderRelationshipLine } from "./relationship";

const full = entity("vargas", {
  title: "Vargas",
  summary: "Rogue.",
  description: "Rogue with a past.",
  notes: "## H\nn",
  portraitUrl: "p.png",
});
const rels = [{ sourceTitle: "Vargas", label: "friend", targetTitle: "Lajos" }];

describe("presentation views", () => {
  it("formats a relationship line", () => {
    const titles = new Map([
      ["a", "Vargas"],
      ["b", "Lajos"],
    ]);
    expect(
      renderRelationshipLine(
        { sourceId: "a", targetId: "b", label: "friend" },
        titles,
      ),
    ).toBe("Vargas — friend → Lajos");
  });

  it("character: brief has only name, type and summary", () => {
    const v = renderCharacterSummary(full, rels, ["Eagles"], "brief");
    expect(v.summary).toBe("Rogue.");
    expect(v.description).toBeUndefined();
    expect(v.relationships).toEqual([]);
    expect(v.affiliations).toEqual([]);
  });

  it("character: standard adds description and relationships, detailed adds notes", () => {
    const std = renderCharacterSummary(full, rels, ["Eagles"], "standard");
    expect(std.description).toBe("Rogue with a past.");
    expect(std.relationships).toEqual(["Vargas — friend → Lajos"]);
    expect(std.notes).toBeUndefined();
    expect(renderCharacterSummary(full, rels, [], "detailed").notes).toBe(
      "## H\nn",
    );
  });

  it("faction lists only the supplied members", () => {
    const v = renderFactionSummary(
      entity("f", { title: "F", type: "faction" }),
      [full],
      [],
      "standard",
    );
    expect(v.members).toEqual(["Vargas"]);
    expect(
      renderFactionSummary(entity("f", { type: "faction" }), [], [], "standard")
        .members,
    ).toEqual([]);
  });

  it("generic view carries no relationships", () => {
    const v = renderGenericSummary(
      entity("i", { type: "item", summary: "x" }),
      "brief",
    );
    expect(v.relationships).toEqual([]);
    expect(v.type).toBe("item");
  });
});
