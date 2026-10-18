import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import HexDiscoveryFailure from "./HexDiscoveryFailure.svelte";

describe("HexDiscoveryFailure", () => {
  it("explains the failure and offers retry and the terrain-table fallback", async () => {
    const onRetry = vi.fn();
    const onRollTables = vi.fn();
    render(HexDiscoveryFailure, { busy: false, onRetry, onRollTables });

    expect(screen.getByText("The AI couldn't draft this hex.")).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await fireEvent.click(
      screen.getByRole("button", { name: "Roll on terrain tables" }),
    );
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRollTables).toHaveBeenCalledTimes(1);
  });

  it("disables retry while a draft is already running (negative path)", () => {
    render(HexDiscoveryFailure, {
      busy: true,
      onRetry: vi.fn(),
      onRollTables: vi.fn(),
    });
    expect(
      (screen.getByRole("button", { name: "Try again" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
