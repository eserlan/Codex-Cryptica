/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import JournalHeader from "./JournalHeader.svelte";

const props = (overrides: Record<string, unknown> = {}) => ({
  title: "Session",
  active: true,
  isEnding: false,
  onEnd: vi.fn(),
  onBack: vi.fn(),
  onToggleCapture: vi.fn(),
  ...overrides,
});

describe("JournalHeader capture menu", () => {
  it("offers the Capture menu for an active journal and passes a switch change up", async () => {
    const input = props({ captureMapMoves: false });
    render(JournalHeader, { props: input as never });
    expect(screen.getByTestId("journal-capture-menu")).toBeTruthy();
    const details = screen.getByTestId(
      "journal-capture-menu",
    ) as HTMLDetailsElement;
    details.open = true;
    await fireEvent(details, new Event("toggle"));
    const mapMoves = screen.getByTestId(
      "capture-map-moves",
    ) as HTMLInputElement;
    expect(mapMoves.checked).toBe(false);
    await fireEvent.click(mapMoves);
    expect(input.onToggleCapture).toHaveBeenCalledWith("map-moves", true);
  });

  it("does not show the capture menu for a journal that is not active", () => {
    render(JournalHeader, { props: props({ active: false }) as never });
    expect(screen.queryByTestId("journal-capture-menu")).toBeNull();
  });
});
