/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const track = vi.hoisted(() => vi.fn());
const inlineCopy = vi.hoisted(() => vi.fn());

vi.mock("$lib/services/analytics/zaraz-analytics", () => ({
  trackPublicGeneratorAction: track,
}));
vi.mock("$lib/components/seo/generator-inline-copy", () => ({
  handleGeneratorInlineCopy: inlineCopy,
}));

import { useGeneratorClipboard } from "./use-generator-clipboard.svelte";

function setup(options: { copyResult?: boolean; hasData?: boolean } = {}) {
  const clipboardService = {
    copyContent: vi.fn(async () => options.copyResult ?? true),
  };
  const clipboard = useGeneratorClipboard({
    getClipboardService: () => clipboardService as never,
    getGeneratorType: () => "npc",
    getGeneratedData: () =>
      (options.hasData === false
        ? null
        : { title: "Mira", summary: "s", labels: [] }) as never,
    getDocumentLayout: () => ({ content: "Body", lore: "Lore" }) as never,
  });
  return { clipboard, clipboardService };
}

describe("useGeneratorClipboard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    track.mockClear();
    inlineCopy.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("flags a successful markdown copy briefly", async () => {
    const { clipboard, clipboardService } = setup();

    await clipboard.handleCopyMarkdown();

    expect(clipboardService.copyContent).toHaveBeenCalledOnce();
    expect(clipboard.copied).toBe(true);
    expect(clipboard.copyError).toBe(false);
    expect(track).toHaveBeenCalledWith("copy", {
      generator_type: "npc",
      copy_target: "markdown",
    });
    vi.advanceTimersByTime(2000);
    expect(clipboard.copied).toBe(false);
  });

  it("reports a failed copy instead of claiming success", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { clipboard } = setup({ copyResult: false });

    await clipboard.handleCopyMarkdown();

    expect(clipboard.copied).toBe(false);
    expect(clipboard.copyError).toBe(true);
  });

  it("does nothing without a generated result", async () => {
    const { clipboard, clipboardService } = setup({ hasData: false });

    await clipboard.handleCopyMarkdown();

    expect(clipboardService.copyContent).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
  });

  it("marks only the copied section and clears it after a moment", async () => {
    const { clipboard } = setup();

    await clipboard.handleCopySection("s1", "## Section");

    expect(clipboard.copiedSectionId).toBe("s1");
    vi.advanceTimersByTime(1600);
    expect(clipboard.copiedSectionId).toBeNull();
  });

  it("returns the clipboard result for session entities", async () => {
    const { clipboard } = setup({ copyResult: false });

    const result = await clipboard.handleCopySessionEntity({
      title: "Hub",
    } as never);

    expect(result).toBe(false);
    expect(track).toHaveBeenCalledWith("copy", {
      generator_type: "npc",
      copy_target: "session_hub_detail",
    });
  });

  it("copies inline only for Enter and Space keys", () => {
    const { clipboard } = setup();

    clipboard.handleContainerKeydown({ key: "a" } as KeyboardEvent);
    expect(inlineCopy).not.toHaveBeenCalled();

    clipboard.handleContainerKeydown({ key: "Enter" } as KeyboardEvent);
    clipboard.handleContainerKeydown({ key: " " } as KeyboardEvent);
    expect(inlineCopy).toHaveBeenCalledTimes(2);
  });
});
