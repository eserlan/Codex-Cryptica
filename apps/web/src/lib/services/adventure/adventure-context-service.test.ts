import { describe, expect, it, vi } from "vitest";
import { AdventureContextService } from "./adventure-context-service";

const session = {
  vaultId: "vault-1",
  title: "The Drowned March",
  premise: "A king stirs beneath the flooded bridge.",
  playerCharacter: {
    kind: "provisional" as const,
    name: "Kirvan",
    description: "A young farmhand.",
  },
  sourceRecords: [{ recordId: "anchor-1" }],
} as any;

describe("AdventureContextService", () => {
  it("retrieves a bounded, setup-grounded opening context without duplicate anchors", async () => {
    const search = vi.fn().mockResolvedValue([
      { id: "anchor-1", title: "Anchor", type: "place", text: "Ignored" },
      {
        id: "bridge-1",
        title: "Flooded Bridge",
        type: "place",
        text: "x".repeat(4_100),
        lore: "The bridge conceals the drowned king's shrine.",
      },
    ]);
    const service = new AdventureContextService({ getById: vi.fn(), search });

    const result = await service.resolveOpeningRelevant(session);

    expect(search).toHaveBeenCalledWith(
      "vault-1",
      expect.stringContaining("The Drowned March"),
      8,
    );
    expect(search.mock.calls[0][1]).toContain("Kirvan");
    expect(result).toEqual([
      expect.objectContaining({
        recordId: "bridge-1",
        role: "turn-source",
        content: "x".repeat(4_000),
        lore: "The bridge conceals the drowned king's shrine.",
      }),
    ]);
  });

  it("returns no opening context when search finds no matching records", async () => {
    const service = new AdventureContextService({
      getById: vi.fn(),
      search: vi.fn().mockResolvedValue([]),
    });

    await expect(service.resolveOpeningRelevant(session)).resolves.toEqual([]);
  });
});
