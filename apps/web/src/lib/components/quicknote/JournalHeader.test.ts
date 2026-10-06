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
  onToggleMapMoves: vi.fn(),
  ...overrides,
});

describe("JournalHeader map capture switch", () => {
  it("shows the active journal setting and toggles it", async () => {
    const input = props({ captureMapMoves: false });
    render(JournalHeader, { props: input as never });
    const button = screen.getByRole("button", { name: "Record map moves" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(button.textContent).toContain("Off");
    await fireEvent.click(button);
    expect(input.onToggleMapMoves).toHaveBeenCalledOnce();
  });

  it("does not show the setting for a journal that is not active", () => {
    render(JournalHeader, { props: props({ active: false }) as never });
    expect(
      screen.queryByRole("button", { name: "Record map moves" }),
    ).toBeNull();
  });
});
