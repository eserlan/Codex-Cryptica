/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import CifTipChip from "./CifTipChip.svelte";

// jsdom has no layout or ResizeObserver: run the position once, as autoUpdate
// would on mount, and decide from the test whether the Cif button is in view.
const floating = vi.hoisted(() => ({ referenceHidden: false }));
vi.mock("@floating-ui/dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@floating-ui/dom")>()),
  autoUpdate: (_ref: unknown, _floating: unknown, update: () => void) => {
    update();
    return () => {};
  },
  computePosition: async () => ({
    x: 12,
    y: 34,
    middlewareData: { hide: { referenceHidden: floating.referenceHidden } },
  }),
}));

function setup() {
  const props = {
    label: "Drop a pin on a map",
    onAct: vi.fn(),
    onDismiss: vi.fn(),
  };
  render(CifTipChip, { props });
  return props;
}

describe("CifTipChip (spec 176, US2 and US3)", () => {
  it("shows the label with a screen-reader prefix and no dialog role", () => {
    setup();
    expect(screen.getByText("Drop a pin on a map")).toBeTruthy();
    expect(
      screen.getByText("Cif has a tip:", { selector: ".sr-only" }),
    ).toBeTruthy();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.querySelector('[aria-modal="true"]')).toBeNull();
  });

  it("announces the tip once, politely, without taking focus", () => {
    setup();
    const live = document.querySelector('[aria-live="polite"]');
    expect(live?.textContent).toContain("Cif has a tip: Drop a pin on a map");
    expect(document.activeElement).toBe(document.body);
  });

  it("asks Cif only when the label is tapped", () => {
    const props = setup();
    expect(props.onAct).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("cif-tip-act"));
    expect(props.onAct).toHaveBeenCalledTimes(1);
  });

  it("dismisses from its own button with an accessible name", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss tip" }));
    expect(props.onDismiss).toHaveBeenCalledTimes(1);
    expect(props.onAct).not.toHaveBeenCalled();
  });

  it("dismisses on Escape while focus is inside the chip", async () => {
    const props = setup();
    screen.getByTestId("cif-tip-act").focus();
    await fireEvent.keyDown(window, { key: "Escape" });
    expect(props.onDismiss).toHaveBeenCalledTimes(1);
  });

  it("ignores Escape when focus is elsewhere (negative case)", async () => {
    const props = setup();
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.focus();
    await fireEvent.keyDown(window, { key: "Escape" });
    expect(props.onDismiss).not.toHaveBeenCalled();
    outside.remove();
  });

  it("keeps tap targets at least 44px", () => {
    setup();
    const act = screen.getByTestId("cif-tip-act");
    expect(act.className).toContain("min-h-11");
    expect(
      screen.getByRole("button", { name: "Dismiss tip" }).className,
    ).toContain("min-w-11");
  });

  it("sits beside the Cif button when it is on screen (plan D7)", async () => {
    floating.referenceHidden = false;
    const button = document.createElement("button");
    button.setAttribute("data-testid", "help-assistant-button");
    document.body.appendChild(button);
    setup();
    const chip = screen.getByTestId("cif-tip-chip");
    await vi.waitFor(() => expect(chip.style.left).toMatch(/px$/));
    expect(chip.style.top).toMatch(/px$/);
    expect(chip.className).not.toContain("bottom-24");
    button.remove();
  });

  it("keeps the fixed corner when the Cif button is not on screen (negative case)", () => {
    setup();
    const chip = screen.getByTestId("cif-tip-chip");
    expect(chip.className).toContain("bottom-24");
    expect(chip.style.left).toBe("");
  });

  it("finds a Cif button that mounts after the chip, on resize", async () => {
    setup();
    const chip = screen.getByTestId("cif-tip-chip");
    expect(chip.className).toContain("bottom-24");
    const button = document.createElement("button");
    button.setAttribute("data-testid", "help-assistant-button");
    document.body.appendChild(button);
    window.dispatchEvent(new Event("resize"));
    await vi.waitFor(() => expect(chip.style.left).toMatch(/px$/));
    expect(chip.className).not.toContain("bottom-24");
    button.remove();
  });

  it("keeps the dismiss control readable in every theme (text token, not muted)", () => {
    setup();
    const dismiss = screen.getByRole("button", { name: "Dismiss tip" });
    expect(dismiss.className).toContain("text-theme-text");
    expect(dismiss.className).not.toContain("text-theme-muted");
  });

  it("uses the corner when the Cif button is clipped out of view (negative case)", async () => {
    floating.referenceHidden = true;
    const button = document.createElement("button");
    button.setAttribute("data-testid", "help-assistant-button");
    document.body.appendChild(button);
    setup();
    const chip = screen.getByTestId("cif-tip-chip");
    await vi.waitFor(() => expect(chip.className).toContain("bottom-24"));
    expect(chip.style.left).toBe("");
    expect(chip.style.top).toBe("");
    button.remove();
    floating.referenceHidden = false;
  });

  describe("never covers another control (Story 3, scenario 5)", () => {
    // jsdom has no layout: give the chip and test buttons real-looking boxes.
    const boxes: Record<string, DOMRect> = {
      "cif-tip-chip": DOMRect.fromRect({
        x: 12,
        y: 34,
        width: 200,
        height: 20,
      }),
      "graph-fab-create": DOMRect.fromRect({
        x: 100,
        y: 30,
        width: 56,
        height: 56,
      }),
    };
    function stubBoxes() {
      return vi
        .spyOn(HTMLElement.prototype, "getBoundingClientRect")
        .mockImplementation(function (this: HTMLElement) {
          const id = this.getAttribute("data-testid") ?? "";
          return (
            boxes[id] ?? DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 })
          );
        });
    }
    function anchorButton() {
      const button = document.createElement("button");
      button.setAttribute("data-testid", "help-assistant-button");
      document.body.appendChild(button);
      return button;
    }
    function fab() {
      const b = document.createElement("button");
      b.setAttribute("data-testid", "graph-fab-create");
      document.body.appendChild(b);
      return b;
    }

    it("rises just above a floating button it would cover", async () => {
      const spy = stubBoxes();
      const anchor = anchorButton();
      const button = fab();
      setup();
      const chip = screen.getByTestId("cif-tip-chip");
      // The button's top is 30; 8px gap; chip is 20 tall.
      await vi.waitFor(() => expect(chip.style.top).toBe(`${30 - 8 - 20}px`));
      button.remove();
      anchor.remove();
      spy.mockRestore();
    });

    it("moves when a control renders after the chip, as the graph's buttons do", async () => {
      const spy = stubBoxes();
      const anchor = anchorButton();
      setup();
      const chip = screen.getByTestId("cif-tip-chip");
      await vi.waitFor(() => expect(chip.style.top).toBe("34px"));
      const button = fab();
      await vi.waitFor(() => expect(chip.style.top).toBe(`${30 - 8 - 20}px`));
      button.remove();
      anchor.remove();
      spy.mockRestore();
    });

    it("stays put when nothing is underneath (negative case)", async () => {
      const spy = stubBoxes();
      const anchor = anchorButton();
      setup();
      const chip = screen.getByTestId("cif-tip-chip");
      await vi.waitFor(() => expect(chip.style.top).toBe("34px"));
      anchor.remove();
      spy.mockRestore();
    });
  });
});
