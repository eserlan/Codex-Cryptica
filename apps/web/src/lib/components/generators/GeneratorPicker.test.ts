/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { GeneratorFavoritesStore } from "#lib/stores/ui/generator-favorites.svelte.js";
import { UIPersistence } from "#lib/stores/ui/persistence.js";
import GeneratorPicker from "./GeneratorPicker.svelte";

function favorites() {
  return new GeneratorFavoritesStore(
    new UIPersistence({
      storage: { getItem: () => "[]", setItem: vi.fn(), removeItem: vi.fn() },
    }),
  );
}

describe("GeneratorPicker", () => {
  it("searches categories and restores collapsed categories after clearing", async () => {
    render(GeneratorPicker, {
      selectedId: "npc",
      generatorId: null,
      favoritesStore: favorites(),
    });
    const group = screen.getByRole("button", {
      name: /encounters & complications/i,
    });
    expect(group.getAttribute("aria-expanded")).toBe("false");
    await fireEvent.input(screen.getByRole("searchbox"), {
      target: { value: "complications" },
    });
    expect(group.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("radio", { name: /Plot Twist/ })).toBeTruthy();
    await fireEvent.click(
      screen.getByRole("button", { name: "Clear generator search" }),
    );
    expect(group.getAttribute("aria-expanded")).toBe("false");
  });

  it("shows an empty result and prevents Enter submitting a search", async () => {
    const submit = vi.fn();
    const { container } = render(GeneratorPicker, {
      selectedId: "npc",
      generatorId: null,
      favoritesStore: favorites(),
    });
    container.addEventListener("submit", submit);
    const search = screen.getByRole("searchbox");
    await fireEvent.input(search, { target: { value: "no such generator" } });
    expect(
      screen.getByText('No generators match "no such generator".'),
    ).toBeTruthy();
    expect(await fireEvent.keyDown(search, { key: "Enter" })).toBe(false);
    expect(submit).not.toHaveBeenCalled();
  });
});
