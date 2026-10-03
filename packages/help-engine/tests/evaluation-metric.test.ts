import { describe, expect, it } from "vitest";
import { matchesExpectedSources } from "./eval/evaluate";

describe("recall@3 evaluation", () => {
  it("counts a correct source in the third position", () => {
    expect(
      matchesExpectedSources(["a", "b", "right", "d"], { expect: ["right"] }),
    ).toBe(true);
  });
  it("does not count a correct source only in the fourth position", () => {
    expect(
      matchesExpectedSources(["a", "b", "c", "right"], { expect: ["right"] }),
    ).toBe(false);
  });
  it("requires both comparison subjects in the top three", () => {
    const question = { expect: ["map"], alsoExpect: ["canvas"] };
    expect(matchesExpectedSources(["map", "canvas", "extra"], question)).toBe(
      true,
    );
    expect(matchesExpectedSources(["map", "a", "b", "canvas"], question)).toBe(
      false,
    );
    expect(matchesExpectedSources([], question)).toBe(false);
  });
});
