/** @vitest-environment jsdom */
import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { addFamilyLink, createEntity } = vi.hoisted(() => ({
  addFamilyLink: vi.fn(),
  createEntity: vi.fn(),
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    get selectedEntityId() {
      return null;
    },
    addFamilyLink,
    createEntity,
  },
}));

// Swap the search-worker-backed Autocomplete for the lightweight mock.
vi.mock("$lib/components/ui/Autocomplete.svelte", async () => {
  const mod = await import("../MockAutocomplete.svelte");
  return { default: mod.default };
});

import EmptyFamilySlot from "./EmptyFamilySlot.svelte";

async function openSlot(relation: "parent" | "child" | "partner" | "sibling") {
  render(EmptyFamilySlot, { focusId: "focus", relation });
  await fireEvent.click(screen.getByTestId(`add-${relation}`));
}

describe("EmptyFamilySlot", () => {
  beforeEach(() => {
    addFamilyLink.mockReset().mockResolvedValue({ ok: true });
    createEntity.mockReset().mockResolvedValue("new-id");
  });

  it("connects an existing character with the correct family type", async () => {
    await openSlot("parent");
    // MockAutocomplete maps "parent entity" -> "parent-entity".
    await fireEvent.input(screen.getByTestId("mock-autocomplete"), {
      target: { value: "parent entity" },
    });
    await fireEvent.click(screen.getByTestId("connect-existing"));

    // "Add parent" => focus is child_of the parent (no sibling term).
    await waitFor(() =>
      expect(addFamilyLink).toHaveBeenCalledWith(
        "focus",
        "parent-entity",
        "child_of",
        undefined,
      ),
    );
  });

  it("creates a new character then links it", async () => {
    await openSlot("child");
    await fireEvent.input(screen.getByTestId("mock-autocomplete"), {
      target: { value: "Brand New Heir" },
    });
    await fireEvent.click(screen.getByTestId("create-new"));

    await waitFor(() =>
      expect(createEntity).toHaveBeenCalledWith("character", "Brand New Heir"),
    );
    // "Add child" => focus is parent_of the new character.
    expect(addFamilyLink).toHaveBeenCalledWith(
      "focus",
      "new-id",
      "parent_of",
      undefined,
    );
  });

  it("adds a sibling with the chosen brother/sister term", async () => {
    await openSlot("sibling");
    await fireEvent.input(screen.getByTestId("mock-autocomplete"), {
      target: { value: "parent entity" },
    });
    await fireEvent.change(screen.getByTestId("sibling-term"), {
      target: { value: "Brother" },
    });
    await fireEvent.click(screen.getByTestId("connect-existing"));

    await waitFor(() =>
      expect(addFamilyLink).toHaveBeenCalledWith(
        "focus",
        "parent-entity",
        "sibling_of",
        "Brother",
      ),
    );
  });

  it("surfaces a blocked-cycle error and does not close", async () => {
    addFamilyLink.mockResolvedValue({
      ok: false,
      error: "That would make a character their own ancestor.",
    });
    await openSlot("parent");
    await fireEvent.input(screen.getByTestId("mock-autocomplete"), {
      target: { value: "parent entity" },
    });
    await fireEvent.click(screen.getByTestId("connect-existing"));

    const err = await screen.findByTestId("family-slot-error");
    expect(err.textContent).toMatch(/ancestor/i);
  });
});
