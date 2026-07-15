/** @vitest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, it, expect } from "vitest";
import { vi } from "vitest";
import type { Entity } from "schema";

const { hero } = vi.hoisted(() => ({
  hero: {
    id: "hero",
    type: "character",
    title: "Hero",
    connections: [],
  } as unknown as Entity,
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    entities: { hero },
    selectedEntityId: null,
    addFamilyLink: vi.fn(),
    createEntity: vi.fn(),
  },
}));

// EmptyFamilySlot pulls in the search-worker-backed Autocomplete; stub it.
vi.mock("$lib/components/ui/Autocomplete.svelte", async () => {
  const mod = await import("./MockAutocomplete.svelte");
  return { default: mod.default };
});

import DetailFamilyTab from "./DetailFamilyTab.svelte";

describe("DetailFamilyTab zoom + full screen controls", () => {
  it("zooms out and in, updating the percentage, and resets", async () => {
    render(DetailFamilyTab, { entity: hero });

    const reset = screen.getByTestId("family-zoom-reset");
    expect(reset.textContent?.trim()).toBe("100%");

    await fireEvent.click(screen.getByTestId("family-zoom-out"));
    expect(reset.textContent?.trim()).toBe("90%");

    await fireEvent.click(screen.getByTestId("family-zoom-in"));
    await fireEvent.click(screen.getByTestId("family-zoom-in"));
    expect(reset.textContent?.trim()).toBe("110%");

    await fireEvent.click(reset);
    expect(reset.textContent?.trim()).toBe("100%");
  });

  it("clamps zoom out at the minimum (disables the button)", async () => {
    render(DetailFamilyTab, { entity: hero });
    const out = screen.getByTestId("family-zoom-out");
    // 100% -> 50% is five steps of 10%.
    for (let i = 0; i < 6; i++) await fireEvent.click(out);
    expect(screen.getByTestId("family-zoom-reset").textContent?.trim()).toBe(
      "50%",
    );
    expect((out as HTMLButtonElement).disabled).toBe(true);
  });

  it("exposes a full-screen toggle", () => {
    render(DetailFamilyTab, { entity: hero });
    expect(screen.getByTestId("family-fullscreen")).toBeTruthy();
  });
});
