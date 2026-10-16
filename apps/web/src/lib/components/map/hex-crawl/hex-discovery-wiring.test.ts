import { describe, expect, it, vi } from "vitest";
import { buildDiscoveryWiring } from "./hex-discovery-wiring";

const hex = { q: 2, r: 1 };

function fakes(draftFaction?: string) {
  const draft = draftFaction
    ? {
        parts: { factionPresence: { factionName: draftFaction } },
      }
    : undefined;
  const store = { recordFor: vi.fn(() => ({ draft })) };
  const controller = {
    explore: vi.fn(async () => ({ draft: {}, fellBackToTables: false })),
    rollTables: vi.fn(async () => ({})),
    regenerate: vi.fn(async () => ({})),
    discardPart: vi.fn(async () => undefined),
    discardDraft: vi.fn(async () => undefined),
    saveEntityPart: vi.fn(async () => ({ entityId: "e1" })),
    saveNotePart: vi.fn(async () => undefined),
    saveFactionPart: vi.fn(async () => ({ factionId: "f1" })),
    proposedLinkFor: vi.fn(() => ({ entityId: "loc-1", title: "Millbrook" })),
  };
  return { store, controller };
}

describe("buildDiscoveryWiring", () => {
  it("routes each control to the matching controller call for this hex", async () => {
    const { store, controller } = fakes();
    const wiring = buildDiscoveryWiring({
      controller: controller as never,
      store: store as never,
      mapId: "m1",
      hex,
      factions: [],
      aiEnabled: true,
    });
    const signal = new AbortController().signal;

    await wiring.controls.rollTables();
    await wiring.controls.discardPart("hazard");
    await wiring.controls.saveEntityPart("landmark", { linkTicked: true });
    await wiring.controls.regenerate("encounter", signal);

    expect(controller.rollTables).toHaveBeenCalledWith("m1", hex);
    expect(controller.discardPart).toHaveBeenCalledWith("m1", hex, "hazard");
    expect(controller.saveEntityPart).toHaveBeenCalledWith(
      "m1",
      hex,
      "landmark",
      {
        linkTicked: true,
      },
    );
    expect(controller.regenerate).toHaveBeenCalledWith(
      "m1",
      hex,
      "encounter",
      signal,
    );
    expect(wiring.proposedLink).toEqual({
      entityId: "loc-1",
      title: "Millbrook",
    });
  });

  it("reports an AI failure from explore without throwing", async () => {
    const { store, controller } = fakes();
    controller.explore.mockResolvedValueOnce({ failure: "ai-failed" } as never);
    const wiring = buildDiscoveryWiring({
      controller: controller as never,
      store: store as never,
      mapId: "m1",
      hex,
      factions: [],
      aiEnabled: true,
    });

    expect(await wiring.explore(new AbortController().signal)).toEqual({
      failure: "ai-failed",
    });
  });

  it("matches the drafted faction case-insensitively to a faction on the map", () => {
    const { store, controller } = fakes("the ash wardens");
    const wiring = buildDiscoveryWiring({
      controller: controller as never,
      store: store as never,
      mapId: "m1",
      hex,
      factions: [{ id: "f1", title: "The Ash Wardens" }],
      aiEnabled: true,
    });

    expect(wiring.factionMatch).toEqual({ id: "f1", title: "The Ash Wardens" });
  });

  it("offers no faction match when the draft names a faction that is not on the map", () => {
    const { store, controller } = fakes("The Iron Court");
    const wiring = buildDiscoveryWiring({
      controller: controller as never,
      store: store as never,
      mapId: "m1",
      hex,
      factions: [{ id: "f1", title: "The Ash Wardens" }],
      aiEnabled: true,
    });

    expect(wiring.factionMatch).toBeNull();
  });
});
