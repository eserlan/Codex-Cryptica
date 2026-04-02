import { describe, expect, it, vi } from "vitest";
import { CampaignServiceImplementation } from "./CampaignService";

describe("CampaignServiceImplementation", () => {
  it("returns vault metadata with fallbacks", async () => {
    const get = vi.fn().mockResolvedValue({
      id: "vault-1",
      name: "Moonfall",
      tagline: "A world hanging by moonlight",
      description: "A dark world",
      coverImage: "cover.webp",
      lastModified: 123,
    });
    const put = vi.fn().mockResolvedValue(undefined);
    const service = new CampaignServiceImplementation({
      db: {
        vaultMetadata: { get, put } as any,
        graphEntities: { where: vi.fn() } as any,
        entityContent: { get: vi.fn() } as any,
      },
    });

    await expect(service.getMetadata("vault-1")).resolves.toEqual({
      id: "vault-1",
      name: "Moonfall",
      tagline: "A world hanging by moonlight",
      description: "A dark world",
      coverImage: "cover.webp",
    });
    expect(get).toHaveBeenCalledWith("vault-1");
  });

  it("returns an empty name when vault metadata is missing", async () => {
    const get = vi.fn().mockResolvedValue(undefined);
    const service = new CampaignServiceImplementation({
      db: {
        vaultMetadata: { get, put: vi.fn() } as any,
        graphEntities: { where: vi.fn() } as any,
        entityContent: { get: vi.fn() } as any,
      },
    });

    await expect(service.getMetadata("vault-1")).resolves.toEqual({
      id: "vault-1",
      name: "",
      tagline: undefined,
      description: undefined,
      coverImage: undefined,
    });
  });

  it("updates vault metadata while preserving existing fields", async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({
        id: "vault-1",
        name: "Old name",
        tagline: "Old tagline",
        description: "Old description",
        coverImage: "old.webp",
        lastModified: 10,
      })
      .mockResolvedValueOnce({
        id: "vault-1",
        name: "Old name",
        tagline: "Old tagline",
        description: "Old description",
        coverImage: "old.webp",
        lastModified: 10,
      });
    const put = vi.fn().mockResolvedValue(undefined);
    const service = new CampaignServiceImplementation({
      db: {
        vaultMetadata: { get, put } as any,
        graphEntities: { where: vi.fn() } as any,
        entityContent: { get: vi.fn() } as any,
      },
    });

    await service.updateMetadata("vault-1", { description: "New" });

    expect(put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "vault-1",
        name: "Old name",
        tagline: "Old tagline",
        description: "New",
        coverImage: "old.webp",
        lastModified: expect.any(Number),
      }),
    );
  });

  it("selects the most recently modified frontpage entity", async () => {
    const records = [
      { id: "older", title: "Older", tags: ["frontpage"], lastModified: 10 },
      { id: "newer", title: "Newer", tags: ["frontpage"], lastModified: 20 },
    ];
    const where = vi.fn().mockReturnValue({
      equals: vi.fn().mockReturnValue({
        and: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(records),
        }),
      }),
    });
    const service = new CampaignServiceImplementation({
      db: {
        vaultMetadata: { get: vi.fn(), put: vi.fn() } as any,
        graphEntities: { where } as any,
        entityContent: {
          get: vi.fn().mockResolvedValue({ content: "Front page body" }),
        } as any,
      },
    });

    await expect(service.getFrontPageEntity("vault-1")).resolves.toEqual({
      id: "newer",
      content: "Front page body",
      chronicle: "Front page body",
      image: undefined,
      thumbnail: undefined,
    });
  });

  it("returns recent activity cards from graph data and entity content", async () => {
    const where = vi.fn().mockReturnValue({
      equals: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          {
            id: "a",
            title: "A",
            tags: ["npc"],
            filePath: "a.md",
            lastModified: 1,
          },
          {
            id: "b",
            title: "B",
            tags: ["location"],
            filePath: "b.md",
            lastModified: 2,
          },
        ]),
      }),
    });
    const service = new CampaignServiceImplementation({
      db: {
        vaultMetadata: { get: vi.fn(), put: vi.fn() } as any,
        graphEntities: { where } as any,
        entityContent: {
          get: vi
            .fn()
            .mockResolvedValueOnce({ content: "First content paragraph." })
            .mockResolvedValueOnce({
              content:
                "Second content paragraph with extra detail that should be trimmed when it gets too long.",
            }),
        } as any,
      },
    });

    const result = await service.getRecentActivity("vault-1", 2);

    expect(result).toEqual([
      expect.objectContaining({
        id: "b",
        title: "B",
        path: "b.md",
        tags: ["location"],
        lastModified: 2,
      }),
      expect.objectContaining({
        id: "a",
        title: "A",
        path: "a.md",
        tags: ["npc"],
        lastModified: 1,
      }),
    ]);
    expect(result[0].excerpt.length).toBeGreaterThan(0);
  });
});
