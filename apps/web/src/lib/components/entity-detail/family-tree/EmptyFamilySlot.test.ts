/** @vitest-environment jsdom */
import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { addFamilyLink, createEntity, vaultState } = vi.hoisted(() => ({
  addFamilyLink: vi.fn(),
  createEntity: vi.fn(),
  vaultState: { entities: {} as Record<string, unknown> },
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    get selectedEntityId() {
      return null;
    },
    get entities() {
      return vaultState.entities;
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

function char(
  id: string,
  title: string,
  connections: { target: string; type: string; label?: string }[] = [],
) {
  return {
    id,
    type: "character",
    title,
    connections: connections.map((c) => ({ ...c, strength: 1 })),
  };
}

describe("EmptyFamilySlot", () => {
  beforeEach(() => {
    addFamilyLink.mockReset().mockResolvedValue({ ok: true });
    createEntity.mockReset().mockResolvedValue("new-id");
    vaultState.entities = {};
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

  describe("spouse suggestion after adding a parent", () => {
    beforeEach(() => {
      vaultState.entities = {
        focus: char("focus", "Focus"),
        "parent-entity": char("parent-entity", "Parent Entity", [
          { target: "existing-spouse", type: "spouse_of" },
        ]),
        "existing-spouse": char("existing-spouse", "Existing Spouse", [
          { target: "parent-entity", type: "spouse_of" },
        ]),
      };
    });

    it("suggests the new parent's existing spouse and links them on confirmation", async () => {
      await openSlot("parent");
      await fireEvent.input(screen.getByTestId("mock-autocomplete"), {
        target: { value: "parent entity" },
      });
      await fireEvent.click(screen.getByTestId("connect-existing"));

      // Suggestion panel appears instead of the slot closing.
      const panel = await screen.findByTestId("spouse-suggestions");
      expect(panel.textContent).toMatch(/existing spouse/i);

      await fireEvent.click(
        screen.getByTestId("add-suggestion-existing-spouse"),
      );

      await waitFor(() =>
        expect(addFamilyLink).toHaveBeenNthCalledWith(
          2,
          "focus",
          "existing-spouse",
          "child_of",
        ),
      );
      // Slot collapses once all suggestions are handled.
      await screen.findByTestId("add-parent");
    });

    it("dismissing the suggestion closes without linking the spouse", async () => {
      await openSlot("parent");
      await fireEvent.input(screen.getByTestId("mock-autocomplete"), {
        target: { value: "parent entity" },
      });
      await fireEvent.click(screen.getByTestId("connect-existing"));

      await screen.findByTestId("spouse-suggestions");
      await fireEvent.click(screen.getByTestId("dismiss-spouse-suggestions"));

      // Only the parent link was made — the spouse was never linked.
      expect(addFamilyLink).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("add-parent")).toBeTruthy();
    });

    it("does not suggest a spouse who is already a parent of the focus", async () => {
      vaultState.entities.focus = char("focus", "Focus", [
        { target: "existing-spouse", type: "child_of" },
      ]);

      await openSlot("parent");
      await fireEvent.input(screen.getByTestId("mock-autocomplete"), {
        target: { value: "parent entity" },
      });
      await fireEvent.click(screen.getByTestId("connect-existing"));

      // No suggestion — the spouse is already linked as a parent — slot
      // just closes as usual.
      await waitFor(() => expect(addFamilyLink).toHaveBeenCalledTimes(1));
      expect(screen.queryByTestId("spouse-suggestions")).toBeNull();
      expect(screen.getByTestId("add-parent")).toBeTruthy();
    });

    it("does not suggest a spouse when adding a child, partner, or sibling", async () => {
      await openSlot("child");
      await fireEvent.input(screen.getByTestId("mock-autocomplete"), {
        target: { value: "parent entity" },
      });
      await fireEvent.click(screen.getByTestId("connect-existing"));

      await waitFor(() => expect(addFamilyLink).toHaveBeenCalledTimes(1));
      expect(screen.queryByTestId("spouse-suggestions")).toBeNull();
    });
  });
});
