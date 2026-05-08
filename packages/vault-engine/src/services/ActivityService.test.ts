import { describe, expect, it, vi } from "vitest";
import { ActivityServiceImplementation } from "./ActivityService";

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

describe("ActivityServiceImplementation", () => {
  it("returns recent activity sorted by frontpage pin and lastModified descending", async () => {
    const entityContent = {
      get: vi
        .fn()
        .mockResolvedValueOnce({
          content:
            "Pinned frontpage body that is intentionally long so it gets clipped because the excerpt helper limits the text length to a short snippet for cards.",
        })
        .mockResolvedValueOnce({
          content:
            "New body that is intentionally long so it gets clipped because the excerpt helper limits the text length to a short snippet for cards.",
        })
        .mockResolvedValueOnce({ content: "Old body" }),
    };

    const service = new ActivityServiceImplementation({
      db: {
        graphEntities: createGraphEntitiesMock({
          tagRecords: [
            {
              id: "front",
              title: "Front",
              type: "npc",
              labels: ["frontpage"],
              filePath: "front.md",
              lastModified: 2,
              image: "images/front.webp",
              thumbnail: "images/front-thumb.webp",
            },
          ],
          recentRecords: [
            {
              id: "new",
              title: "New",
              type: "location",
              tags: ["location"],
              filePath: "new.md",
              lastModified: 5,
              image: "images/new.webp",
              thumbnail: "images/new-thumb.webp",
            },
            {
              id: "old",
              title: "Old",
              type: "npc",
              tags: ["npc"],
              filePath: "old.md",
              lastModified: 1,
              image: "images/old.webp",
              thumbnail: "images/old-thumb.webp",
            },
          ],
        }) as any,
        entityContent,
      },
    });

    const result = await service.getRecentActivity("vault-1", 10);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("front");
    expect(result[1].id).toBe("new");
    expect(result[2].id).toBe("old");
    expect(result[0].excerpt.length).toBeLessThanOrEqual(151);
    expect(result[0].path).toBe("front.md");
    expect(result[0].type).toBe("npc");
    expect(result[0].image).toBe("images/front.webp");
    expect(result[0].thumbnail).toBe("images/front-thumb.webp");
  });

  it("truncates correctly when the limit is less than the number of pinned records", async () => {
    const entityContent = {
      get: vi.fn().mockResolvedValue({ content: "test body" }),
    };

    const service = new ActivityServiceImplementation({
      db: {
        graphEntities: createGraphEntitiesMock({
          tagRecords: [
            {
              id: "front1",
              title: "Front 1",
              type: "npc",
              lastModified: 3,
              labels: ["frontpage"],
            },
            {
              id: "front2",
              title: "Front 2",
              type: "npc",
              lastModified: 5,
              labels: ["frontpage"],
            },
          ],
          recentRecords: [
            { id: "new", title: "New", type: "location", lastModified: 6 },
          ],
        }) as any,
        entityContent,
      },
    });

    // Request limit 1: Should only get the highest sorted pinned record (front2)
    const result = await service.getRecentActivity("vault-1", 1);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("front2");
  });

  it("skips recent candidates that are already pinned", async () => {
    const entityContent = {
      get: vi.fn().mockResolvedValue({ content: "test body" }),
    };

    const service = new ActivityServiceImplementation({
      db: {
        graphEntities: createGraphEntitiesMock({
          tagRecords: [
            {
              id: "pinned1",
              title: "Pinned 1",
              type: "npc",
              lastModified: 3,
              labels: ["frontpage"],
            },
          ],
          recentRecords: [
            // Pinned record appears in recent as well
            { id: "pinned1", title: "Pinned 1", type: "npc", lastModified: 3 },
            {
              id: "unpinned1",
              title: "Unpinned 1",
              type: "location",
              lastModified: 1,
            },
          ],
        }) as any,
        entityContent,
      },
    });

    const result = await service.getRecentActivity("vault-1", 5);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("pinned1");
    expect(result[1].id).toBe("unpinned1");
  });
});
