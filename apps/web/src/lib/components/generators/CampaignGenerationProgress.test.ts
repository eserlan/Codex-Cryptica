import { render, screen, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { tick } from "svelte";
import { getThemeLoadingMessages } from "generator-engine";
import CampaignGenerationProgress from "./CampaignGenerationProgress.svelte";

afterEach(() => vi.useRealTimers());
describe("generation progress", () => {
  it("shows the streamed preview, phase and cancellation action", async () => {
    const oncancel = vi.fn();
    render(CampaignGenerationProgress, {
      themeId: "fantasy",
      currentPhase: "Reviewing",
      streamedFields: {
        title: "Harbour",
        summary: "A port",
        lore: "The secret",
      },
      oncancel,
    });
    expect(screen.getByText("Reviewing")).toBeTruthy();
    expect(screen.getByText("Harbour")).toBeTruthy();
    expect(screen.getByText("A port")).toBeTruthy();
    expect(screen.getByText("The secret")).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(oncancel).toHaveBeenCalledOnce();
  });
  it("shields plot text and omits an empty preview", async () => {
    const { rerender } = render(CampaignGenerationProgress, {
      themeId: "fantasy",
      currentPhase: null,
      streamedFields: { lore: "The secret" },
      spoilerShield: true,
      oncancel: vi.fn(),
    });
    expect(screen.queryByText("The secret")).toBeNull();
    await rerender({ streamedFields: {} });
    expect(screen.queryByTestId("generator-stream-preview")).toBeNull();
  });
  it("rotates messages every 4.2 seconds and clears the interval on unmount", async () => {
    vi.useFakeTimers();
    const messages = getThemeLoadingMessages("fantasy");
    const { unmount } = render(CampaignGenerationProgress, {
      themeId: "fantasy",
      currentPhase: null,
      streamedFields: {},
      oncancel: vi.fn(),
    });
    await tick();
    expect(screen.getByText(messages[0])).toBeTruthy();
    await vi.advanceTimersByTimeAsync(4200);
    await tick();
    expect(screen.getByText(messages[1])).toBeTruthy();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
