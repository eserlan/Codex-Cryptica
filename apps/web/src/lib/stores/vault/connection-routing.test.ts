import { describe, expect, it, vi } from "vitest";
import { VaultConnectionRouting } from "./connection-routing";
import type { LocalEntity } from "./types";

function setup() {
  const vault = {
    entities: {
      source: { id: "source", type: "character" } as LocalEntity,
      target: { id: "target", type: "character" } as LocalEntity,
    },
    entityStore: { addConnection: vi.fn().mockResolvedValue(true) },
    addFamilyLink: vi.fn().mockResolvedValue({ ok: true }),
    updateConnection: vi.fn().mockResolvedValue(true),
  };
  return { vault, routing: new VaultConnectionRouting(vault) };
}
describe("VaultConnectionRouting", () => {
  it("routes a family phrase through reciprocal mutation then applies its display label", async () => {
    const { vault, routing } = setup();
    expect(
      await routing.addConnection(
        "source",
        "target",
        "neutral",
        "Mother of",
        2,
      ),
    ).toBe(true);
    expect(vault.addFamilyLink).toHaveBeenCalledWith(
      "source",
      "target",
      "parent_of",
    );
    expect(vault.updateConnection).toHaveBeenCalledWith(
      "source",
      "target",
      "parent_of",
      "parent_of",
      "Mother",
    );
    expect(vault.entityStore.addConnection).not.toHaveBeenCalled();
  });

  it.each([
    ["parent_of", "Mother of", "character"],
    ["neutral", "friend", "character"],
    ["neutral", undefined, "character"],
    ["neutral", "Mother of", "location"],
  ])(
    "preserves generic dispatch for %s / %s / %s",
    async (type, label, targetType) => {
      const { vault, routing } = setup();
      vault.entities.target.type = targetType!;
      await routing.addConnection("source", "target", type!, label, 3);
      expect(vault.entityStore.addConnection).toHaveBeenCalledWith(
        "source",
        "target",
        type,
        label,
        3,
      );
      expect(vault.addFamilyLink).not.toHaveBeenCalled();
    },
  );

  it("reports a rejected family mutation without adding a display label", async () => {
    const { vault, routing } = setup();
    vault.addFamilyLink.mockResolvedValueOnce({ ok: false });
    expect(
      await routing.addConnection("source", "target", "neutral", "Mother of"),
    ).toBe(false);
    expect(vault.updateConnection).not.toHaveBeenCalled();
  });

  it.each([false, new Error("save")])(
    "keeps a successful family write when labelling fails: %s",
    async (failure) => {
      const { vault, routing } = setup();
      if (failure instanceof Error)
        vault.updateConnection.mockRejectedValueOnce(failure);
      else vault.updateConnection.mockResolvedValueOnce(failure);
      expect(
        await routing.addConnection("source", "target", "neutral", "Mother of"),
      ).toBe(true);
      expect(vault.entityStore.addConnection).not.toHaveBeenCalled();
    },
  );
});
