/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdventureToolsDrawer from "./AdventureToolsDrawer.svelte";

vi.mock("$lib/actions/focusTrap", () => ({
  focusTrap: () => ({ destroy() {} }),
}));

beforeEach(() => {
  if (!Element.prototype.animate) {
    Element.prototype.animate = vi.fn(
      () =>
        ({
          finished: Promise.resolve(),
          cancel: vi.fn(),
          play: vi.fn(),
        }) as unknown as Animation,
    );
  }
});

function manager() {
  return {
    session: {
      dicePresets: [],
      resourceCounters: [],
    },
    readOnly: false,
    rollHistory: [],
    addDicePreset: vi.fn(),
    removeDicePreset: vi.fn(),
    addResourceCounter: vi.fn(),
    adjustResourceCounter: vi.fn(),
    removeResourceCounter: vi.fn(),
  } as any;
}

describe("AdventureToolsDrawer", () => {
  it("renders dice presets and resource trackers", () => {
    render(AdventureToolsDrawer, {
      props: { manager: manager(), onClose: vi.fn() },
    });

    expect(screen.getByText("Dice presets")).toBeTruthy();
    expect(screen.getByText("Resource trackers")).toBeTruthy();
  });

  it("closes on backdrop click", async () => {
    const onClose = vi.fn();
    const { container } = render(AdventureToolsDrawer, {
      props: { manager: manager(), onClose },
    });

    const backdrop = container.querySelector('[aria-hidden="true"]');
    await fireEvent.click(backdrop!);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    render(AdventureToolsDrawer, {
      props: { manager: manager(), onClose },
    });

    await fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes via the close button", async () => {
    const onClose = vi.fn();
    render(AdventureToolsDrawer, {
      props: { manager: manager(), onClose },
    });

    await fireEvent.click(
      screen.getByRole("button", { name: "Close adventure tools" }),
    );

    expect(onClose).toHaveBeenCalledOnce();
  });
});
