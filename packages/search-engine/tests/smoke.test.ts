import { describe, it, expect } from "vitest";
import { SearchEngine } from "../src";

describe("SearchEngine Smoke Test", () => {
  it("should be instantiable", () => {
    const engine = new SearchEngine();
    expect(engine).toBeDefined();
  });
});
