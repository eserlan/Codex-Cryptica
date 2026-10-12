import { describe, expect, it } from "vitest";
import type { Entity, StatSheetField } from "schema";
import { gatherShopText } from "./shop-stock-context";

const shop = (over: Partial<Entity> = {}) =>
  ({
    title: "Shop",
    content: "",
    labels: [],
    connections: [],
    ...over,
  }) as unknown as Entity;

const field = (id: string, value: string): StatSheetField => ({
  id,
  label: id,
  type: "longtext",
  value,
});

describe("gatherShopText (#3965)", () => {
  it("clips oversized sheet text fields and entity text", () => {
    const huge = "salt ".repeat(100_000);
    const { shopText } = gatherShopText(
      shop({ content: huge }),
      [field("services", huge), field("gm_notes", huge)],
      () => undefined,
    );
    expect(shopText.length).toBeLessThan(5_000);
  });

  it("ignores sheet fields that are not shop text", () => {
    const { shopText } = gatherShopText(
      shop(),
      [field("funds", "CANARY-FUNDS"), field("random_field", "CANARY-OTHER")],
      () => undefined,
    );
    expect(shopText).toContain("CANARY-FUNDS");
    expect(shopText).not.toContain("CANARY-OTHER");
  });

  it("reads only a few connected places, and only place-like ones", () => {
    const places: Record<string, Entity> = {};
    const connections = [];
    for (let i = 0; i < 9; i++) {
      places[`p${i}`] = shop({
        title: `Town${i}`,
        type: "settlement",
      } as never);
      connections.push({ target: `p${i}`, type: "in" });
    }
    places.npc = shop({ title: "Bob", type: "character" } as never);
    connections.unshift({ target: "npc", type: "knows" });
    const { placeText } = gatherShopText(
      shop({ connections } as never),
      [],
      (id) => places[id],
    );
    expect(placeText).not.toContain("Bob");
    expect((placeText.match(/Town\d/g) ?? []).length).toBe(5);
  });
});
