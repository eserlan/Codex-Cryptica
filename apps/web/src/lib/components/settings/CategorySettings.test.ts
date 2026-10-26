import { render, screen } from "@testing-library/svelte";
import { describe, it, expect, vi } from "vitest";
import CategorySettings from "./CategorySettings.svelte";

const categoriesMock = vi.hoisted(() => ({
  list: [
    {
      id: "npc",
      label: "NPC",
      color: "#60a5fa",
      icon: "icon-[lucide--user]",
    },
    {
      id: "location",
      label: "Location",
      color: "#34d399",
      icon: "icon-[lucide--map-pin]",
    },
  ],
  getCategory: vi.fn(),
  addCategory: vi.fn(),
  updateCategory: vi.fn(),
  removeCategory: vi.fn(),
  resetToDefaults: vi.fn(),
}));

vi.mock("$lib/stores/categories.svelte", () => ({
  categories: categoriesMock,
}));
vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: { confirm: vi.fn(), notify: vi.fn() },
}));

describe("CategorySettings", () => {
  it("names each category's colour and name inputs after that category", () => {
    const { container } = render(CategorySettings);

    for (const label of ["NPC", "Location"]) {
      expect(
        (
          screen.getByRole("textbox", {
            name: `Category name for ${label}`,
          }) as HTMLInputElement
        ).value,
      ).toBe(label);
      expect(
        container.querySelector(
          `input[type="color"][aria-label="Category color for ${label}"]`,
        ),
      ).not.toBeNull();
    }
  });

  it("names the new-category inputs", () => {
    const { container } = render(CategorySettings);

    expect(
      screen
        .getByRole("textbox", { name: "New category name" })
        .getAttribute("placeholder"),
    ).toBe("New category...");
    expect(
      container.querySelector(
        'input[type="color"][aria-label="New category color"]',
      ),
    ).not.toBeNull();
  });

  it("leaves no text or colour input without an accessible name", () => {
    const { container } = render(CategorySettings);
    const inputs = container.querySelectorAll<HTMLInputElement>(
      'input[type="text"], input[type="color"]',
    );

    expect(inputs.length).toBe(6);
    for (const input of inputs) {
      expect(
        input.getAttribute("aria-label")?.trim(),
        input.outerHTML,
      ).toBeTruthy();
    }
  });
});
