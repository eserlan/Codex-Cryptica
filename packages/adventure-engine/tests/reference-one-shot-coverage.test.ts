import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateAdventureJson } from "../src/adventure-json";
import { ReferenceOneShotKeySchema } from "./reference-one-shot-key";
import { auditReferenceCoverage } from "./reference-one-shot-coverage";

const dir = resolve(
  __dirname,
  "../../../fixtures/adventures/reference-one-shot",
);
const published = resolve(
  __dirname,
  "../../../apps/web/static/schemas/adventure-json/examples/reference-one-shot.v1.json",
);
const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));

const key = ReferenceOneShotKeySchema.parse(
  readJson(resolve(dir, "answer-key.json")),
);
const load = () => readJson(resolve(dir, "adventure.v1.json"));
const audit = (pkg: unknown) =>
  auditReferenceCoverage(
    pkg as Parameters<typeof auditReferenceCoverage>[0],
    key,
  );

describe("reference one-shot coverage audit", () => {
  it("passes the fixture", () => {
    const pkg = load();
    expect(validateAdventureJson(pkg).ok).toBe(true);
    const { covered, missing } = audit(pkg);
    expect(missing).toEqual([]);
    for (const name of [
      "hidden-motive",
      "missable-clue",
      "optional-branch",
      "alternative-solution",
      "ending:ending-restored",
      "ending:ending-flooded",
    ]) {
      expect(covered).toContain(name);
    }
  });

  it("passes the published example", () => {
    expect(audit(readJson(published)).missing).toEqual([]);
  });

  it("flags the incomplete variant although it is schema-valid", () => {
    const pkg = readJson(resolve(dir, "variants/incomplete.v1.json"));
    expect(validateAdventureJson(pkg).ok).toBe(true);
    expect(audit(pkg).missing.sort()).toEqual(
      [
        "section:ros-branch-shrine",
        "optional-branch",
        "alternative-solution",
        "ending:ending-flooded",
        "section:ros-ending-flooded",
      ].sort(),
    );
  });

  it("flags a motive leaked into a player-visible record", () => {
    const pkg = load();
    const tobiah = pkg.actors.find(
      (a: { id: string }) => a.id === "actor-tobiah-reed",
    );
    tobiah.motivation = key.npcs.find(
      (n) => n.name === "Tobiah Reed",
    )!.motivation;
    expect(audit(pkg).missing).toContain("hidden-motive");
  });

  it("flags a clue that lost its alternative source", () => {
    const pkg = load();
    delete pkg.clues[0].alternativeSourceId;
    expect(audit(pkg).missing).toContain("missable-clue");
  });
});
