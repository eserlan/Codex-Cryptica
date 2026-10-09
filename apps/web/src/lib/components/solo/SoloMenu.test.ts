/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import SoloMenuHarness from "./SoloMenuHarness.svelte";

describe("SoloMenu", () => {
  it("has an accessible trigger that reports its open state", async () => {
    render(SoloMenuHarness, {
      props: { label: "Recent", testId: "solo-recent" },
    });
    const trigger = screen.getByTestId("solo-recent");
    expect(trigger.getAttribute("aria-label") ?? trigger.textContent).toMatch(
      /Recent/,
    );
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    await fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByTestId("solo-menu-panel")).toBeTruthy();
  });

  it("opens below a trigger near the top of the screen, so it is not clipped", async () => {
    render(SoloMenuHarness, {
      props: { label: "Recent", testId: "solo-recent" },
    });
    const trigger = screen.getByTestId("solo-recent");
    trigger.getBoundingClientRect = () =>
      ({ top: 60, bottom: 90, left: 40 }) as DOMRect;
    await fireEvent.click(trigger);
    const style = screen.getByTestId("solo-menu-panel").getAttribute("style");
    expect(style).toContain("top: 98px");
    expect(style).toContain(`max-height: ${window.innerHeight - 98}px`);
    expect(style).not.toContain("bottom");
  });

  it("opens above a trigger in the lower half of the screen, as on the phone sheet", async () => {
    render(SoloMenuHarness, {
      props: { label: "Recent", testId: "solo-recent" },
    });
    const trigger = screen.getByTestId("solo-recent");
    trigger.getBoundingClientRect = () =>
      ({
        top: window.innerHeight - 80,
        bottom: window.innerHeight - 50,
        left: 40,
      }) as DOMRect;
    await fireEvent.click(trigger);
    const style = screen.getByTestId("solo-menu-panel").getAttribute("style");
    expect(style).toContain("bottom: 88px");
    expect(style).toContain(`max-height: ${window.innerHeight - 88}px`);
    expect(style).not.toContain("top:");
  });

  it("is fixed to the viewport so a scrolling bar cannot clip it", async () => {
    render(SoloMenuHarness, {
      props: { label: "Recent", testId: "solo-recent" },
    });
    await fireEvent.click(screen.getByTestId("solo-recent"));
    expect(screen.getByTestId("solo-menu-panel").className).toContain("fixed");
  });

  it("keeps the panel inside the right edge of the window", async () => {
    render(SoloMenuHarness, {
      props: { label: "Recent", testId: "solo-recent" },
    });
    const trigger = screen.getByTestId("solo-recent");
    trigger.getBoundingClientRect = () =>
      ({ top: 60, bottom: 90, left: window.innerWidth - 10 }) as DOMRect;
    await fireEvent.click(trigger);
    expect(
      screen.getByTestId("solo-menu-panel").getAttribute("style"),
    ).toContain(`left: ${window.innerWidth - 320}px`);
  });

  it("closes when the bar scrolls or the window resizes", async () => {
    render(SoloMenuHarness, {
      props: { label: "Recent", testId: "solo-recent" },
    });
    const trigger = screen.getByTestId("solo-recent");
    await fireEvent.click(trigger);
    await fireEvent.scroll(document.body);
    expect(screen.queryByTestId("solo-menu-panel")).toBeNull();

    await fireEvent.click(trigger);
    await fireEvent.resize(window);
    expect(screen.queryByTestId("solo-menu-panel")).toBeNull();
  });

  it("keeps the menu open while its contents scroll", async () => {
    render(SoloMenuHarness, {
      props: { label: "Recent", testId: "solo-recent" },
    });
    await fireEvent.click(screen.getByTestId("solo-recent"));
    const panel = screen.getByTestId("solo-menu-panel");
    expect(panel.className).toContain("overflow-y-auto");
    await fireEvent.scroll(panel);
    expect(screen.getByTestId("solo-menu-panel")).toBeTruthy();
  });

  it("closes on a second click", async () => {
    render(SoloMenuHarness, {
      props: { label: "Recent", testId: "solo-recent" },
    });
    const trigger = screen.getByTestId("solo-recent");
    await fireEvent.click(trigger);
    await fireEvent.click(trigger);
    expect(screen.queryByTestId("solo-menu-panel")).toBeNull();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    render(SoloMenuHarness, {
      props: { label: "Recent", testId: "solo-recent" },
    });
    const trigger = screen.getByTestId("solo-recent");
    await fireEvent.click(trigger);
    await fireEvent.keyDown(screen.getByTestId("solo-menu-panel"), {
      key: "Escape",
    });
    expect(screen.queryByTestId("solo-menu-panel")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes when the player clicks outside", async () => {
    render(SoloMenuHarness, {
      props: { label: "Recent", testId: "solo-recent" },
    });
    await fireEvent.click(screen.getByTestId("solo-recent"));
    await fireEvent.pointerDown(document.body);
    expect(screen.queryByTestId("solo-menu-panel")).toBeNull();
  });

  it("stays shut and shows its reason when disabled", async () => {
    render(SoloMenuHarness, {
      props: {
        label: "Generate",
        testId: "solo-generate",
        disabled: true,
        reason: "Generators open once your vault has loaded.",
      },
    });
    const trigger = screen.getByTestId("solo-generate") as HTMLButtonElement;
    expect(trigger.disabled).toBe(true);
    expect(trigger.title).toBe("Generators open once your vault has loaded.");
    await fireEvent.click(trigger);
    expect(screen.queryByTestId("solo-menu-panel")).toBeNull();
  });
});
