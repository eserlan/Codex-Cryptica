import { describe, expect, it } from "vitest";
import { parseAdventureSession } from "../src/schemas";
import { session } from "./reducer-fixtures";

describe("adventure artwork recovery", () => {
  it.each([
    { version: 1, associations: [] },
    { version: 2, future: { picture: "unknown" } },
    { version: 1, associations: "corrupt" },
  ])("preserves optional artwork across unrelated saves: %j", (artwork) => {
    const loaded = parseAdventureSession({ ...session(), artwork });
    const saved = parseAdventureSession(
      JSON.parse(JSON.stringify({ ...loaded, title: "Renamed" })),
    );
    expect(saved.artwork).toEqual(artwork);
  });
});
