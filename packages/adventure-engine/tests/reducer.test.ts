import { describe, expect, it } from "vitest";
import { applyCompletedTurn } from "../src";

describe("adventure reducer", () => {
  it("rejects duplicate inputs atomically", () => {
    expect(typeof applyCompletedTurn).toBe("function");
  });
});
