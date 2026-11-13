import { describe, expect, it, vi } from "vitest";
import { promotePersonArtwork } from "./artwork-promotion";

describe("artwork promotion", () => {
  it("links local explicit artwork to a canonical entity without overwriting Entity.image", async () => {
    const saveCanonical = vi.fn(async () => ({ ok: true as const }));
    const saveLocal = vi.fn(async () => ({ ok: true as const }));

    const result = await promotePersonArtwork(
      {
        personId: "person-1",
        targetEntityId: "entity-morgan",
        localChoice: {
          mode: "catalogue",
          assetId: "npc-captain",
          variantUrl:
            "https://assets.codexcryptica.com/adventure-artwork/npc.webp",
          sha256: "a".repeat(64),
        },
        canonicalArtwork: undefined,
      },
      { saveCanonical, saveLocal },
    );

    expect(result.status).toBe("promoted");
    expect(saveCanonical).toHaveBeenCalledWith("entity-morgan", {
      mode: "catalogue",
      assetId: "npc-captain",
      variantUrl: "https://assets.codexcryptica.com/adventure-artwork/npc.webp",
      sha256: "a".repeat(64),
    });
    expect(saveLocal).toHaveBeenCalledWith("person-1", "entity-morgan");
  });

  it("requires explicit owner choice when both local and canonical have explicit overrides", async () => {
    const saveCanonical = vi.fn();
    const saveLocal = vi.fn();

    const result = await promotePersonArtwork(
      {
        personId: "person-1",
        targetEntityId: "entity-morgan",
        localChoice: {
          mode: "catalogue",
          assetId: "npc-a",
          variantUrl:
            "https://assets.codexcryptica.com/adventure-artwork/a.webp",
          sha256: "a".repeat(64),
        },
        canonicalArtwork: {
          mode: "catalogue",
          assetId: "npc-b",
          variantUrl:
            "https://assets.codexcryptica.com/adventure-artwork/b.webp",
          sha256: "b".repeat(64),
        },
      },
      { saveCanonical, saveLocal },
    );

    expect(result.status).toBe("conflict");
    expect(saveCanonical).not.toHaveBeenCalled();
    expect(saveLocal).not.toHaveBeenCalled();
  });

  it("preserves local recovery data when canonical write fails", async () => {
    const saveCanonical = vi.fn(async () => ({ ok: false as const }));
    const saveLocal = vi.fn();

    const result = await promotePersonArtwork(
      {
        personId: "person-1",
        targetEntityId: "entity-morgan",
        localChoice: {
          mode: "dismissed",
        },
        canonicalArtwork: undefined,
      },
      { saveCanonical, saveLocal },
    );

    expect(result.status).toBe("retryable-failure");
    expect(saveLocal).not.toHaveBeenCalled();
  });
});
