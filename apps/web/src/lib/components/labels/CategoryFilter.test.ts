/** @vitest-environment jsdom */
import { render } from "@testing-library/svelte";
import { describe, it, expect, vi } from "vitest";
import { FANTASY_DARK, deriveEntityTypeTone, parseColor } from "schema";
import CategoryFilter from "./CategoryFilter.svelte";

const NEON_GREEN = "#4ade80";

/** jsdom serialises inline colours as `rgb(r, g, b)`. */
const asCss = (hex: string) => {
  const { r, g, b } = parseColor(hex)!;
  return `rgb(${r}, ${g}, ${b})`;
};

vi.mock("$lib/stores/categories.svelte", () => ({
  categories: {
    list: [
      {
        id: "location",
        label: "Location",
        icon: "lucide:map-pin",
        color: "#4ade80",
      },
    ],
  },
}));

const themeStoreMock = vi.hoisted(() => ({
  activeTheme: undefined as unknown,
}));

vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: themeStoreMock,
}));

const renderExpanded = async () => {
  const utils = render(CategoryFilter, {
    activeCategories: new Set<string>(),
    onToggle: vi.fn(),
    onClear: vi.fn(),
  });
  const toggle = utils.getByTestId("category-filter-toggle");
  toggle.click();
  await Promise.resolve();
  return utils;
};

describe("CategoryFilter type legend colours (issue #2680)", () => {
  it("tints type icons with the active theme's tone, not the raw category colour", async () => {
    themeStoreMock.activeTheme = FANTASY_DARK;

    const { getByTestId } = await renderExpanded();
    const icon = getByTestId("category-filter-location").querySelector("span");

    const expected = deriveEntityTypeTone(
      NEON_GREEN,
      FANTASY_DARK.tokens,
    ).accent;
    expect(icon?.getAttribute("style")).toContain(asCss(expected));
    expect(icon?.getAttribute("style")).not.toContain(asCss(NEON_GREEN));
  });

  it("falls back to the category colour when no theme is active", async () => {
    themeStoreMock.activeTheme = undefined;

    const { getByTestId } = await renderExpanded();
    const icon = getByTestId("category-filter-location").querySelector("span");

    expect(icon?.getAttribute("style")).toContain(asCss(NEON_GREEN));
  });
});
