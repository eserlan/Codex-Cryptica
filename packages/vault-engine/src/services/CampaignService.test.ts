import { describe, expect, it, vi } from "vitest";
import { CampaignServiceImplementation } from "./CampaignService";

const createGraphEntitiesMock = ({
  tagRecords = [],
  labelRecords = [],
  recentRecords = [],
}: {
  tagRecords?: any[];
  labelRecords?: any[];
  recentRecords?: any[];
} = {}) => ({
  where: vi.fn((index: string) => {
    if (index === "tags") {
      return {
        equals: vi.fn().mockReturnValue({
          and: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue(tagRecords),
          }),
        }),
      };
    }

    if (index === "labels") {
      return {
        equals: vi.fn().mockReturnValue({
          and: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue(labelRecords),
          }),
        }),
      };
    }

    if (index === "[vaultId+lastModified]") {
      return {
        between: vi.fn().mockReturnValue({
          reverse: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              toArray: vi.fn().mockResolvedValue(recentRecords),
            }),
          }),
        }),
      };
    }

    throw new Error(`Unexpected graphEntities index: ${index}`);
  }),
  orderBy: vi.fn(),
});

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
        graphEntities: createGraphEntitiesMock() as any,
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
        graphEntities: createGraphEntitiesMock() as any,
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

  it("selects the most recently modified frontpage entity from tag and label indexes", async () => {
    const records = [
      {
        id: "older",
        title: "Older",
        type: "npc",
        tags: ["frontpage"],
        lastModified: 10,
      },
      {
        id: "newer",
        title: "Newer",
        type: "location",
        labels: ["frontpage"],
        lastModified: 20,
      },
    ];
    const service = new CampaignServiceImplementation({
      db: {
        vaultMetadata: { get: vi.fn(), put: vi.fn() } as any,
        graphEntities: createGraphEntitiesMock({
          tagRecords: [records[0]],
          labelRecords: [records[1]],
        }) as any,
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
    const service = new CampaignServiceImplementation({
      db: {
        vaultMetadata: { get: vi.fn(), put: vi.fn() } as any,
        graphEntities: createGraphEntitiesMock({
          tagRecords: [
            {
              id: "front",
              title: "Front",
              type: "npc",
              labels: ["frontpage"],
              filePath: "front.md",
              lastModified: 3,
            },
          ],
          recentRecords: [
            {
              id: "b",
              title: "B",
              type: "location",
              tags: ["location"],
              filePath: "b.md",
              lastModified: 2,
            },
            {
              id: "a",
              title: "A",
              type: "npc",
              tags: ["npc"],
              filePath: "a.md",
              lastModified: 1,
            },
          ],
        }) as any,
        entityContent: {
          get: vi
            .fn()
            .mockResolvedValueOnce({ content: "Front content." })
            .mockResolvedValueOnce({ content: "First content paragraph." })
            .mockResolvedValueOnce({ content: "Second content paragraph." }),
        } as any,
      },
    });

    const result = await service.getRecentActivity("vault-1", 3);

    expect(result).toEqual([
      expect.objectContaining({
        id: "front",
        path: "front.md",
        type: "npc",
        labels: ["frontpage"],
        lastModified: 3,
      }),
      expect.objectContaining({
        id: "b",
        title: "B",
        path: "b.md",
        type: "location",
        tags: ["location"],
        lastModified: 2,
      }),
      expect.objectContaining({
        id: "a",
        title: "A",
        path: "a.md",
        type: "npc",
        tags: ["npc"],
        lastModified: 1,
      }),
    ]);
    expect(result[0].excerpt.length).toBeGreaterThan(0);
  });
});
