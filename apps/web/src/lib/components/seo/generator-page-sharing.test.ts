import { describe, expect, it, vi } from "vitest";
import { createGeneratorPageSharing } from "./generator-page-sharing";

function createDeps() {
  const createShare = vi.fn().mockResolvedValue({
    url: "https://codexcryptica.com/share/share-1",
    share: {
      shareId: "share-1",
      metadata: { description: "A useful description" },
    },
    managementToken: "token",
  });
  return {
    createShare,
    revokeShare: vi.fn().mockResolvedValue(undefined),
    onShareCreated: vi.fn(),
    getGeneratorType: () => "npc",
    getTheme: () => "fantasy",
    getWorldTheme: () => "workspace",
    getCanonicalPath: () => "/generators/npc",
    getOgImage: () => "https://assets.example/npc.jpg",
  };
}

describe("generator page sharing", () => {
  it("builds share metadata and returns cleanup for the current output", async () => {
    const deps = createDeps();
    const sharing = createGeneratorPageSharing(deps);

    const result = await sharing.prepareCurrentOutputShare({
      title: "Mara Venn",
      summary: "A watchful guide.",
      labels: ["npc", "ally"],
      content: "## Details\nA watchful guide.",
      lore: "She knows the old road.",
    });

    expect(deps.createShare).toHaveBeenCalledWith(
      expect.objectContaining({
        generatorId: "npc",
        title: "Mara Venn",
        metadata: expect.objectContaining({
          description: "A watchful guide.",
          theme: "fantasy",
          generatorPath: "/generators/npc",
          imageUrl: "https://assets.example/npc.jpg",
          silhouette: expect.any(String),
        }),
      }),
    );
    expect(result).toMatchObject({
      url: "https://codexcryptica.com/share/share-1",
      title: "Mara Venn",
      text: "A useful description",
    });
    expect(deps.onShareCreated).toHaveBeenCalledWith({
      generatorType: "npc",
      source: "current_output",
    });

    await result.cleanup();
    expect(deps.revokeShare).toHaveBeenCalledWith("share-1");
  });

  it("uses content as the fallback description and omits non-HTTPS images", async () => {
    const deps = createDeps();
    deps.getOgImage = () => "/local-preview.jpg";
    const sharing = createGeneratorPageSharing(deps);

    await sharing.prepareSessionEntityShare({
      id: "entity-1",
      type: "faction",
      title: "The Hollow Crown",
      summary: "",
      content: "## Control\nThey command the gates.",
      lore: "",
      labels: [],
      status: "draft",
      reuseEnabled: true,
      pinned: false,
      createdOrder: 1,
    });

    const input = deps.createShare.mock.calls[0][0];
    expect(input.metadata.description).toBe("Control They command the gates.");
    expect(input.metadata.imageUrl).toBeUndefined();
    expect(deps.onShareCreated).toHaveBeenCalledWith({
      generatorType: "npc",
      source: "session_hub_detail",
    });
  });
});
