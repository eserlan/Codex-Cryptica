import { describe, expect, it } from "vitest";
import { importStatBlock } from "./index";
import { fixtureById } from "../stat-block-reader/__fixtures__/stat-blocks";
import { prepareStatBlockSource } from "../stat-block-reader/source";

/**
 * Characterisation of the existing rule-based importer over the reference
 * fixtures (research R8). Clean and Foundry inputs must read a name and
 * vitals. Negative inputs must not throw.
 */
describe("importStatBlock over reference fixtures", () => {
  it("reads the clean ToV creature text into a sheet with a name", () => {
    const result = importStatBlock(fixtureById("clean-hill-brute").source, {
      systemHint: "tales-of-the-valiant",
    });
    expect(result.ir.identity.name).toBe("Hill Brute");
  });

  it("reads a Foundry Black Flag export", () => {
    const source = prepareStatBlockSource(
      fixtureById("foundry-hill-brute").source,
    );
    const result = importStatBlock(JSON.parse(source), {
      systemHint: "tales-of-the-valiant",
    });
    expect(result.ir.identity.name).toBe("Hill Brute");
    const hp = result.ir.vitals.find((v) => v.id === "hp");
    expect(hp?.max).toBe(45);
  });

  it("does not throw on a paragraph of lore", () => {
    expect(() =>
      importStatBlock(fixtureById("no-stat-block-lore").source, {
        systemHint: "tales-of-the-valiant",
      }),
    ).not.toThrow();
  });

  it("does not throw on empty text", () => {
    expect(() =>
      importStatBlock("", { systemHint: "tales-of-the-valiant" }),
    ).not.toThrow();
  });
});
