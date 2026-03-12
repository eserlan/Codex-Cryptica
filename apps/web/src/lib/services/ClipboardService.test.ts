import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClipboardService } from "./ClipboardService";
import type { Entity } from "schema";

describe("ClipboardService", () => {
  let service: ClipboardService;
  let mockClipboard: any;

  beforeEach(() => {
    // Mock navigator.clipboard
    mockClipboard = {
      write: vi.fn().mockResolvedValue(undefined),
      writeText: vi.fn().mockResolvedValue(undefined),
    };

    // Proper global class mock for ClipboardItem
    class MockClipboardItem {
      constructor(public data: any) {}
    }
    vi.stubGlobal("ClipboardItem", MockClipboardItem);

    // Mock Document
    const mockDocument = {
      createElement: vi.fn().mockReturnValue({
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue({
          drawImage: vi.fn(),
        }),
        toBlob: vi.fn().mockImplementation((cb) => cb(new Blob())),
      }),
    } as unknown as Document;

    service = new ClipboardService({
      clipboard: mockClipboard as unknown as Clipboard,
      document: mockDocument,
    });

    // Setup global navigator mock
    vi.stubGlobal("navigator", {
      ...global.navigator,
      clipboard: mockClipboard,
    });
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
    expect(mockClipboard.write).toHaveBeenCalled();
  });
});
