import { describe, expect, it } from "vitest";
import { parseAdventureSession } from "../src";

describe("adventure schemas", () => {
  it("requires exactly one discriminated player character", () => {
    expect(() => parseAdventureSession({})).toThrow();
  });
});
