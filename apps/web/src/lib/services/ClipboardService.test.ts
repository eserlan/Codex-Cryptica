/** @vitest-environment jsdom */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClipboardService } from "./ClipboardService";
import type { Entity } from "schema";

describe("ClipboardService", () => {
  let service: ClipboardService;
  let mockClipboard: any;
  let createdItems: Array<Record<string, Blob>>;

  beforeEach(() => {
    // Mock navigator.clipboard
    mockClipboard = {
      write: vi.fn().mockResolvedValue(undefined),
      writeText: vi.fn().mockResolvedValue(undefined),
    };
    createdItems = [];

    // Proper global class mock for ClipboardItem
    class MockClipboardItem {
      constructor(public data: any) {}
    }
    vi.stubGlobal("ClipboardItem", MockClipboardItem);

    // Mock Document
    const mockDocument = {
      defaultView: window,
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
      createClipboardItem: (data) => {
        createdItems.push(data);
        return new MockClipboardItem(data) as unknown as ClipboardItem;
      },
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
      status: "active",
      connections: [],
      labels: [],
      aliases: [],
    };

    const result = await service.copyEntity(mockEntity);
    expect(result).toBe(true);
    expect(mockClipboard.write).toHaveBeenCalled();
  });

  it("should copy arbitrary rich text and plain text", async () => {
    const result = await service.copyHtmlAndText(
      "<p>Chronicle</p>",
      "Chronicle",
    );

    expect(result).toBe(true);
    expect(mockClipboard.write).toHaveBeenCalledTimes(1);
    expect(mockClipboard.writeText).not.toHaveBeenCalled();
    expect(createdItems[0]?.["text/plain"]).toBeInstanceOf(Blob);
    expect(createdItems[0]?.["text/html"]).toBeInstanceOf(Blob);
    expect(await createdItems[0]["text/plain"].text()).toBe("Chronicle");
  });

  it("preserves Markdown as plain text and sanitises generated HTML", async () => {
    const markdown = "# Heading\n\n[Link](javascript:alert(1))";

    const result = await service.copyContent({ markdown });

    expect(result).toBe(true);
    expect(await createdItems[0]["text/plain"].text()).toBe(markdown);
    const html = await createdItems[0]["text/html"].text();
    expect(html).toContain("<h1>");
    expect(html).not.toContain("javascript:");
  });

  it("sanitises supplied HTML before writing it", async () => {
    await service.copyContent({
      markdown: "Safe",
      html: '<p onclick="alert(1)">Safe</p><script>alert(1)</script>',
    });

    const html = await createdItems[0]["text/html"].text();
    expect(html).toContain("Safe");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("<script");
  });

  it("should fall back to plain text when rich clipboard write fails", async () => {
    mockClipboard.write.mockRejectedValueOnce(new Error("denied"));

    const result = await service.copyHtmlAndText(
      "<p>Chronicle</p>",
      "Chronicle",
    );

    expect(result).toBe(true);
    expect(mockClipboard.write).toHaveBeenCalledTimes(1);
    expect(mockClipboard.writeText).toHaveBeenCalledWith("Chronicle");
  });

  it("falls back when rich clipboard capabilities are unavailable", async () => {
    service = new ClipboardService({
      clipboard: {
        writeText: mockClipboard.writeText,
      } as unknown as Clipboard,
      createClipboardItem: undefined,
    });

    const result = await service.copyContent({ markdown: "# Markdown" });

    expect(result).toBe(true);
    expect(mockClipboard.writeText).toHaveBeenCalledWith("# Markdown");
  });

  it("returns false when rich and plain clipboard writes both fail", async () => {
    mockClipboard.write.mockRejectedValue(new Error("denied"));
    mockClipboard.writeText.mockRejectedValue(new Error("unavailable"));

    const result = await service.copyContent({ markdown: "Markdown" });

    expect(result).toBe(false);
  });

  it("keeps optional image MIME data when supplied", async () => {
    const imageBlob = new Blob(["png"], { type: "image/png" });

    await service.copyContent({ markdown: "Entity", imageBlob });

    expect(createdItems[0]["image/png"]).toBe(imageBlob);
  });

  it("copies text when optional image preparation fails", async () => {
    const imageFailureService = new ClipboardService({
      clipboard: mockClipboard as unknown as Clipboard,
      document: {} as Document,
      fetch: vi.fn().mockRejectedValue(new Error("image unavailable")),
      createClipboardItem: (data) => {
        createdItems.push(data);
        return { data } as unknown as ClipboardItem;
      },
      domPurify: {
        sanitize: (html: string) => html,
      },
    });

    const result = await imageFailureService.copyEntity(
      {
        id: "test-id",
        title: "Test Entity",
        content: "Test Content",
        lore: "Test Lore",
        type: "npc",
        status: "active",
        connections: [],
        labels: [],
        aliases: [],
      },
      "https://example.com/entity.png",
    );

    expect(result).toBe(true);
    expect(createdItems.at(-1)?.["text/plain"]).toBeInstanceOf(Blob);
    expect(createdItems.at(-1)?.["image/png"]).toBeUndefined();
  });
});
