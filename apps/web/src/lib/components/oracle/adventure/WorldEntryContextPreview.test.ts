/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import WorldEntryContextPreview from "./WorldEntryContextPreview.svelte";

describe("WorldEntryContextPreview", () => {
  it("offers an accessible summary, reveal-on-demand references and adjustment", async () => {
    const onBack = vi.fn();
    const onStart = vi.fn();
    render(WorldEntryContextPreview, {
      props: {
        onBack,
        onStart,
        preview: {
          records: [
            {
              id: "location-1",
              title: "Bell Yard",
              type: "location",
              applicability: "uncertain" as const,
              linkedBy: "selected" as const,
            },
          ],
          omitted: 0,
          warnings: ["Time is unspecified."],
          dated: false,
          counts: { people: 0, locations: 1, events: 0 },
        },
      },
    });
    expect(screen.getByTestId("preview-count-locations").textContent).toContain(
      "1",
    );
    expect(screen.getByText("Bell Yard")).toBeTruthy();
    expect(screen.getByText(/Time is unspecified/)).toBeTruthy();
    await fireEvent.click(screen.getByTestId("world-entry-adjust"));
    await fireEvent.click(screen.getByTestId("world-entry-start"));
    expect(onBack).toHaveBeenCalledOnce();
    expect(onStart).toHaveBeenCalledOnce();
  });
});
