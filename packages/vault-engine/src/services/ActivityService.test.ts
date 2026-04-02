import { describe, expect, it, vi } from "vitest";
import { ActivityServiceImplementation } from "./ActivityService";

describe("ActivityServiceImplementation", () => {
  it("returns recent activity sorted by frontpage pin and lastModified descending", async () => {
    const where = vi.fn().mockReturnValue({
      equals: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          {
            id: "old",
            title: "Old",
            tags: ["npc"],
            filePath: "old.md",
            lastModified: 1,
            image: "images/old.webp",
            thumbnail: "images/old-thumb.webp",
          },
          {
            id: "new",
            title: "New",
            tags: ["location"],
            filePath: "new.md",
            lastModified: 5,
            image: "images/new.webp",
            thumbnail: "images/new-thumb.webp",
          },
          {
            id: "front",
            title: "Front",
            tags: [],
            labels: ["frontpage"],
            filePath: "front.md",
            lastModified: 2,
            image: "images/front.webp",
            thumbnail: "images/front-thumb.webp",
          },
        ]),
      }),
    });

    const entityContent = {
      get: vi
        .fn()
        .mockResolvedValueOnce({
          content:
            "New body that is intentionally long so it gets clipped because the excerpt helper limits the text length to a short snippet for cards.",
        })
        .mockResolvedValueOnce({ content: "Front body" })
        .mockResolvedValueOnce({ content: "Old body" }),
    };

    const service = new ActivityServiceImplementation({
      db: {
        graphEntities: { where } as any,
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
    expect(result[0].image).toBe("images/front.webp");
    expect(result[0].thumbnail).toBe("images/front-thumb.webp");
  });
});
