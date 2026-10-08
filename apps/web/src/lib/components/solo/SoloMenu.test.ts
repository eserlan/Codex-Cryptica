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
