import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import CampaignGeneratorConfigure from "./CampaignGeneratorConfigure.svelte";

const props = () => ({
  generatorId: "npc" as const,
  onsubmit: vi.fn(),
  aiPolicy: { isEnabled: false, isAvailable: false },
  categoryLabels: [],
  onPlotTwist: vi.fn(),
});
describe("campaign generator configuration", () => {
  it("shows a single remembered quest hook and forwards its plot twist action", async () => {
    const input = props();
    render(CampaignGeneratorConfigure, {
      ...input,
      questHook: { title: "The missing ferryman" },
    });
    expect(screen.getByText("The missing ferryman")).toBeTruthy();
    await fireEvent.click(
      screen.getByRole("button", { name: "Turn it into a Plot Twist" }),
    );
    expect(input.onPlotTwist).toHaveBeenCalledOnce();
    await fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    expect(input.onsubmit).toHaveBeenCalledWith(
      expect.objectContaining({ generatorId: "npc", useAI: false }),
    );
  });
  it("omits the invitation without a hook or while configuring a plot twist", async () => {
    const { rerender } = render(CampaignGeneratorConfigure, props());
    expect(screen.queryByTestId("plot-twist-from-quest-hook")).toBeNull();
    await rerender({ generatorId: "plot-twist", questHook: { title: "Hook" } });
    expect(screen.queryByTestId("plot-twist-from-quest-hook")).toBeNull();
  });
});
