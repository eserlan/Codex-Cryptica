import { describe, expect, it } from "vitest";
import { canTransition } from "../src";

describe("adventure state machine", () => {
  it("rejects skipping directly from ready to commit", () => {
    expect(canTransition("ready", "committing")).toBe(false);
  });
});
