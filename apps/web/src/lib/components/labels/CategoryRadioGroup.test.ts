/** @vitest-environment jsdom */
import { render, fireEvent } from "@testing-library/svelte";
import { describe, it, expect, vi } from "vitest";
import CategoryRadioGroup from "./CategoryRadioGroup.svelte";

vi.mock("$lib/stores/categories.svelte", () => ({
  categories: {
    list: [
      {
        id: "character",
        label: "Character",
        icon: "lucide:user",
        color: "#3b82f6",
      },
      {
        id: "location",
        label: "Location",
        icon: "lucide:map-pin",
        color: "#10b981",
      },
      {
        id: "faction",
        label: "Faction",
        icon: "lucide:shield",
        color: "#8b5cf6",
      },
      { id: "item", label: "Item", icon: "lucide:sword", color: "#f59e0b" },
    ],
  },
}));

describe("CategoryRadioGroup component", () => {
  it("renders radiogroup with radio items for all categories", () => {
    const { getByRole, getAllByRole } = render(CategoryRadioGroup, {
      value: "character",
      label: "Category",
    });

    const group = getByRole("radiogroup", { name: "Category" });
    expect(group).toBeTruthy();

    const radios = getAllByRole("radio");
    expect(radios).toHaveLength(4);
    expect(radios[0].getAttribute("aria-label")).toBe("Character");
    expect(radios[0].getAttribute("aria-checked")).toBe("true");
    expect(radios[1].getAttribute("aria-checked")).toBe("false");
  });

  it("handles selection changes via click", async () => {
    const selected = "character";
    const { getByRole } = render(CategoryRadioGroup, {
      value: selected,
    });

    const locationRadio = getByRole("radio", { name: "Location" });
    await fireEvent.click(locationRadio);

    expect(locationRadio.getAttribute("aria-checked")).toBe("true");
  });

  it("supports keyboard navigation with arrow keys (right/down)", async () => {
    const { getAllByRole } = render(CategoryRadioGroup, {
      value: "character",
    });

    const radios = getAllByRole("radio");
    radios[0].focus();

    await fireEvent.keyDown(radios[0], { key: "ArrowRight" });
    expect(radios[1].getAttribute("aria-checked")).toBe("true");

    await fireEvent.keyDown(radios[1], { key: "ArrowDown" });
    expect(radios[2].getAttribute("aria-checked")).toBe("true");
  });

  it("supports keyboard navigation with arrow keys (left/up and wrap around)", async () => {
    const { getAllByRole } = render(CategoryRadioGroup, {
      value: "character",
    });

    const radios = getAllByRole("radio");
    radios[0].focus();

    await fireEvent.keyDown(radios[0], { key: "ArrowLeft" });
    expect(radios[3].getAttribute("aria-checked")).toBe("true");

    await fireEvent.keyDown(radios[3], { key: "ArrowUp" });
    expect(radios[2].getAttribute("aria-checked")).toBe("true");
  });

  it("supports Home and End keys", async () => {
    const { getAllByRole } = render(CategoryRadioGroup, {
      value: "faction",
    });

    const radios = getAllByRole("radio");
    radios[2].focus();

    await fireEvent.keyDown(radios[2], { key: "Home" });
    expect(radios[0].getAttribute("aria-checked")).toBe("true");

    await fireEvent.keyDown(radios[0], { key: "End" });
    expect(radios[3].getAttribute("aria-checked")).toBe("true");
  });

  it("manages roving tabindex appropriately", () => {
    const { getAllByRole } = render(CategoryRadioGroup, {
      value: "faction",
    });

    const radios = getAllByRole("radio");
    expect(radios[0].getAttribute("tabindex")).toBe("-1");
    expect(radios[1].getAttribute("tabindex")).toBe("-1");
    expect(radios[2].getAttribute("tabindex")).toBe("0");
    expect(radios[3].getAttribute("tabindex")).toBe("-1");
  });

  it("falls back to tabindex=0 on the first item if no category is selected", () => {
    const { getAllByRole } = render(CategoryRadioGroup, {
      value: "unknown-cat",
    });

    const radios = getAllByRole("radio");
    expect(radios[0].getAttribute("tabindex")).toBe("0");
    expect(radios[1].getAttribute("tabindex")).toBe("-1");
  });

  it("respects disabled state", async () => {
    const { getByRole, getAllByRole } = render(CategoryRadioGroup, {
      value: "character",
      disabled: true,
    });

    const group = getByRole("radiogroup");
    expect(group.getAttribute("aria-disabled")).toBe("true");

    const radios = getAllByRole("radio");
    expect(radios[0].hasAttribute("disabled")).toBe(true);
    expect(radios[1].hasAttribute("disabled")).toBe(true);

    await fireEvent.click(radios[1]);
    expect(radios[0].getAttribute("aria-checked")).toBe("true");
    expect(radios[1].getAttribute("aria-checked")).toBe("false");
  });

  it("supports custom categories list", () => {
    const customList = [
      { id: "custom1", label: "Custom One", icon: "lucide:star" },
      { id: "custom2", label: "Custom Two", icon: "lucide:heart" },
    ];

    const { getAllByRole } = render(CategoryRadioGroup, {
      value: "custom1",
      categoriesList: customList,
    });

    const radios = getAllByRole("radio");
    expect(radios).toHaveLength(2);
    expect(radios[0].getAttribute("aria-label")).toBe("Custom One");
    expect(radios[1].getAttribute("aria-label")).toBe("Custom Two");
  });
});
