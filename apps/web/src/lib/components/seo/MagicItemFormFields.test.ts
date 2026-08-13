/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import MagicItemFormFields from "./MagicItemFormFields.svelte";

vi.mock("$lib/services/seo/generator-engine", () => ({
  magicItemConfig: {
    typesByTheme: {
      "Classic Fantasy": ["Weapon", "Armor"],
    },
    rarities: ["Common", "Uncommon", "Rare"],
  },
}));

describe("MagicItemFormFields", () => {
  it("renders item type and rarity choices", () => {
    render(MagicItemFormFields, {
      props: { type: "Weapon", rarity: "Uncommon" },
    });

    expect(screen.getByLabelText("Item Type")).toBeTruthy();
    expect(screen.getByLabelText("Rarity")).toBeTruthy();
  });

  it("updates rarity on selection", async () => {
    render(MagicItemFormFields, {
      props: { type: "Weapon", rarity: "Uncommon" },
    });

    const raritySelect = screen.getByLabelText("Rarity");
    await fireEvent.change(raritySelect, { target: { value: "Rare" } });

    expect((raritySelect as HTMLSelectElement).value).toBe("Rare");
  });
});
