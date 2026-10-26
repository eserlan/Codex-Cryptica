/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, beforeEach } from "vitest";
import GuidedModeToggle from "./GuidedModeToggle.svelte";
import { guidedModeStore } from "$lib/stores/ui/guided-mode.svelte";

describe("GuidedModeToggle", () => {
  beforeEach(() => {
    guidedModeStore.setGuidedMode(true);
  });

  it("reflects the current Guided Mode state", async () => {
    render(GuidedModeToggle);
    const toggle = await screen.findByTestId("guided-mode-toggle");
    expect(toggle.getAttribute("aria-checked")).toBe("true");
  });

  it("toggles Guided Mode instantly and non-destructively when clicked", async () => {
    render(GuidedModeToggle);
    const toggle = await screen.findByTestId("guided-mode-toggle");

    await fireEvent.click(toggle);
    expect(guidedModeStore.isGuidedMode).toBe(false);
    expect(toggle.getAttribute("aria-checked")).toBe("false");

    await fireEvent.click(toggle);
    expect(guidedModeStore.isGuidedMode).toBe(true);
    expect(toggle.getAttribute("aria-checked")).toBe("true");
  });
});
