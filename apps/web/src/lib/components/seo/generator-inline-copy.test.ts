/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleGeneratorInlineCopy } from "./generator-inline-copy";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("handleGeneratorInlineCopy", () => {
  it("copies the literal value and briefly shows copied feedback", async () => {
    vi.useFakeTimers();
    const root = document.createElement("div");
    root.innerHTML =
      '<button data-copy-text="Mara Venn"><span></span></button>';
    const button = root.querySelector("button")!;
    const icon = button.querySelector("span")!;
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    const trackCopy = vi.fn();

    handleGeneratorInlineCopy({ target: icon } as unknown as MouseEvent, {
      clipboard,
      trackCopy,
    });
    await Promise.resolve();

    expect(clipboard.writeText).toHaveBeenCalledWith("Mara Venn");
    expect(trackCopy).toHaveBeenCalledOnce();
    expect(icon.className).toContain("lucide--check");
    vi.advanceTimersByTime(1500);
    expect(icon.className).toContain("lucide--copy");
  });

  it("does nothing when no copy control is targeted", () => {
    const clipboard = { writeText: vi.fn() };
    const trackCopy = vi.fn();
    const target = document.createElement("p");

    handleGeneratorInlineCopy({ target } as unknown as MouseEvent, {
      clipboard,
      trackCopy,
    });

    expect(clipboard.writeText).not.toHaveBeenCalled();
    expect(trackCopy).not.toHaveBeenCalled();
  });

  it("logs clipboard failures without showing success feedback", async () => {
    const root = document.createElement("div");
    root.innerHTML = '<button data-copy-text="literal"><span></span></button>';
    const icon = root.querySelector("span")!;
    const error = new Error("denied");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const clipboard = { writeText: vi.fn().mockRejectedValue(error) };
    const trackCopy = vi.fn();

    handleGeneratorInlineCopy({ target: icon } as unknown as MouseEvent, {
      clipboard,
      trackCopy,
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(clipboard.writeText).toHaveBeenCalledWith("literal");
    expect(trackCopy).toHaveBeenCalledOnce();
    expect(icon.className).toBe("");
    expect(log).toHaveBeenCalledWith("Failed to copy text:", error);
  });
});
