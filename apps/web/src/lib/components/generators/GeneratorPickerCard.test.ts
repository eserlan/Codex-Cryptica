/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { getGenerator } from "generator-engine";
import { describe, expect, it, vi } from "vitest";
import GeneratorPickerCard from "./GeneratorPickerCard.svelte";

describe("GeneratorPickerCard", () => {
  it("selects the generator and toggles its favourite independently", async () => {
    const onselect = vi.fn();
    const ontogglefavorite = vi.fn();
    render(GeneratorPickerCard, {
      gen: getGenerator("npc"),
      entityTypeLabel: "Character",
      selectedId: "faction",
      isFavorite: false,
      onselect,
      ontogglefavorite,
    });
    const radio = screen.getByRole("radio", { name: "NPC Creates Character" });
    expect(radio.hasAttribute("aria-describedby")).toBe(false);
    await fireEvent.click(radio);
    expect(onselect).toHaveBeenCalledWith("npc");
    await fireEvent.click(
      screen.getByRole("button", { name: "Add NPC to favourites" }),
    );
    expect(ontogglefavorite).toHaveBeenCalledWith("npc");
    expect(onselect).toHaveBeenCalledTimes(1);
  });

  it("preserves favourite description ids and disables both controls", () => {
    render(GeneratorPickerCard, {
      gen: getGenerator("npc"),
      entityTypeLabel: "Character",
      selectedId: "npc",
      isFavorite: true,
      idPrefix: "fav-generator",
      disabled: true,
      onselect: vi.fn(),
      ontogglefavorite: vi.fn(),
    });
    const radio = screen.getByRole("radio") as HTMLInputElement;
    expect(radio.checked).toBe(true);
    expect(radio.disabled).toBe(true);
    expect(radio.getAttribute("aria-describedby")).toBe(
      "fav-generator-description-npc",
    );
    expect(
      document.getElementById("fav-generator-description-npc")?.textContent,
    ).toContain("Generate a non-player character");
    const button = screen.getByRole("button", {
      name: "Remove NPC from favourites",
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });
});
