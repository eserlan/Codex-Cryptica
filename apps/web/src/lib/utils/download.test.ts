/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadBlob, downloadText } from "./download";

describe("download", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn((blob: Blob) => `blob:mock-${blob.size}`),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  describe("downloadBlob", () => {
    it("creates an anchor, triggers download, and cleans up the element and URL", () => {
      const appendSpy = vi.spyOn(document.body, "appendChild");
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click");
      const removeSpy = vi.spyOn(HTMLAnchorElement.prototype, "remove");

      const blob = new Blob(["hello world"], { type: "text/plain" });
      downloadBlob(blob, "hello.txt");

      expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(appendSpy).toHaveBeenCalledTimes(1);

      const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
      expect(anchor.tagName).toBe("A");
      expect(anchor.download).toBe("hello.txt");
      expect(anchor.href).toBe(`blob:mock-${blob.size}`);

      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(removeSpy).toHaveBeenCalledTimes(1);

      // Before timer ticks, URL should not be revoked yet
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();

      // After tick, URL is revoked
      vi.advanceTimersByTime(0);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(
        `blob:mock-${blob.size}`,
      );
    });
  });

  describe("downloadText", () => {
    it("encodes text with utf-8 charset and initiates blob download", async () => {
      let createdBlob: Blob | null = null;
      vi.stubGlobal("URL", {
        createObjectURL: vi.fn((blob: Blob) => {
          createdBlob = blob;
          return "blob:mock-text";
        }),
        revokeObjectURL: vi.fn(),
      });

      const textContent = "fantasy lore with — em dash";
      downloadText(textContent, "lore.md", "text/markdown");

      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(createdBlob).not.toBeNull();
      expect(createdBlob?.type).toBe("text/markdown;charset=utf-8");
      expect(await createdBlob!.text()).toBe(textContent);

      vi.advanceTimersByTime(0);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-text");
    });
  });
});
