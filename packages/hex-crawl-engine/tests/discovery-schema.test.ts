import { describe, expect, it } from "bun:test";
import {
  HexStockingSchema,
  StockingPartSchemas,
} from "../src/discovery/schema";

const valid = {
  landmark: { title: "Old Mill", description: "A ruined mill by the ford." },
  encounter: { title: "Wolves", description: "A pack shadows the road." },
  hazard: "Loose scree on the slope.",
  secret: "The mill hides a smuggler's cache.",
  factionPresence: {
    faction: "Iron Guild",
    description: "Guild wardens patrol.",
  },
  atmosphere: "Damp air and the smell of wet pine.",
};

describe("HexStockingSchema (T055)", () => {
  it("accepts valid output", () => {
    expect(HexStockingSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a factionPresence with no named faction", () => {
    const parsed = HexStockingSchema.safeParse({
      ...valid,
      factionPresence: { description: "No banners fly here." },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects output with a missing part", () => {
    const { atmosphere: _omitted, ...rest } = valid;
    expect(HexStockingSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects over-long fields at each documented limit", () => {
    const over = (n: number) => "x".repeat(n);
    const cases = [
      { ...valid, landmark: { title: over(81), description: "ok" } },
      { ...valid, landmark: { title: "ok", description: over(1201) } },
      { ...valid, encounter: { title: over(81), description: "ok" } },
      { ...valid, encounter: { title: "ok", description: over(1201) } },
      { ...valid, hazard: over(601) },
      { ...valid, secret: over(601) },
      { ...valid, factionPresence: { description: over(601) } },
      { ...valid, factionPresence: { faction: over(81), description: "ok" } },
      { ...valid, atmosphere: over(401) },
    ];
    for (const input of cases) {
      expect(HexStockingSchema.safeParse(input).success).toBe(false);
    }
  });

  it("rejects empty required text", () => {
    expect(HexStockingSchema.safeParse({ ...valid, hazard: "" }).success).toBe(
      false,
    );
  });

  it("accepts text exactly at each limit", () => {
    const at = (n: number) => "x".repeat(n);
    const edge = {
      landmark: { title: at(80), description: at(1200) },
      encounter: { title: at(80), description: at(1200) },
      hazard: at(600),
      secret: at(600),
      factionPresence: { faction: at(80), description: at(600) },
      atmosphere: at(400),
    };
    expect(HexStockingSchema.safeParse(edge).success).toBe(true);
  });

  it("exposes per-part sub-schemas that validate on their own", () => {
    expect(StockingPartSchemas.hazard.safeParse("Quicksand.").success).toBe(
      true,
    );
    expect(
      StockingPartSchemas.landmark.safeParse({ title: "", description: "x" })
        .success,
    ).toBe(false);
    expect(
      StockingPartSchemas.factionPresence.safeParse({ description: "x" })
        .success,
    ).toBe(true);
  });
});
