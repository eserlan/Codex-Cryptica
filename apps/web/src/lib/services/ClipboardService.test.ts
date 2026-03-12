import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClipboardService } from "./ClipboardService";
import type { Entity } from "schema";

describe("ClipboardService", () => {
  let service: ClipboardService;

  beforeEach(() => {
    service = new ClipboardService();

    // Mock navigator.clipboard
    (global.navigator as any).clipboard = {
      write: vi.fn().mockResolvedValue(undefined),
      writeText: vi.fn().mockResolvedValue(undefined),
    };

    // Mock ClipboardItem
    (global as any).ClipboardItem = vi.fn();
  });

  it("should be instantiable", () => {
    expect(service).toBeDefined();
  });

  it("should attempt to write to clipboard when copying an entity", async () => {
    const mockEntity: Entity = {
      id: "test-id",
      title: "Test Entity",
      content: "Test Content",
      lore: "Test Lore",
      type: "npc",
      connections: [],
      tags: [],
      labels: [],
    };

    const result = await service.copyEntity(mockEntity);
    expect(result).toBe(true);
    expect(
      navigator.clipboard.write || navigator.clipboard.writeText,
    ).toHaveBeenCalled();
  });
});
