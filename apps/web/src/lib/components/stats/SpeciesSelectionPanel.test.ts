/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";

const { updateEntity, vaultState } = vi.hoisted(() => ({
  updateEntity: vi.fn(),
  vaultState: {
    isGuest: false,
    selectedEntityId: null as string | null,
    allEntities: [] as unknown[],
  },
}));

vi.mock("#lib/stores/vault.svelte.js", () => ({
  vault: {
    get isGuest() {
      return vaultState.isGuest;
    },
    get allEntities() {
      return vaultState.allEntities;
    },
    set selectedEntityId(id: string | null) {
      vaultState.selectedEntityId = id;
    },
    updateEntity,
  },
}));

import SpeciesSelectionPanel from "./SpeciesSelectionPanel.svelte";

const make = (o: Partial<Entity>): Entity =>
  ({
    title: "X",
    tags: [],
    labels: [],
    aliases: [],
    connections: [],
    content: "",
    ...o,
  }) as Entity;

const kethari = make({
  id: "kethari",
  type: "creature",
  title: "Kethari",
  traitPackage: {
    kind: "species",
    traits: [
      {
        id: "t1",
        name: "Brute",
        description: "Strong",
        adjustments: [
          { target: "str_score", amount: 2 },
          { target: "luck", amount: 1 },
        ],
      },
    ],
  },
});
const aelf = make({
  id: "aelf",
  type: "creature",
  title: "Aelf",
  traitPackage: { kind: "species", traits: [] },
});
const plain = make({ id: "plain", type: "creature", title: "Plain Wolf" });
const other = make({
  id: "other",
  type: "character",
  title: "Impostor",
  traitPackage: { kind: "species", traits: [] },
});

const hero = (o: Partial<Entity> = {}) =>
  make({
    id: "hero",
    type: "character",
    title: "Hero",
    statSheet: {
      fields: [{ id: "str_score", label: "STR", type: "number", value: 10 }],
    },
    ...o,
  });

const selectionFor = (title: string, id: string) => ({
  kind: "species" as const,
  sourceId: id,
  sourceTitle: title,
  appliedAt: 1,
  traits: [{ id: "t1", name: "Brute", description: "Strong", adjustments: [] }],
});

describe("SpeciesSelectionPanel", () => {
  beforeEach(() => {
    updateEntity.mockReset();
    vaultState.isGuest = false;
    vaultState.selectedEntityId = null;
    vaultState.allEntities = [kethari, plain, aelf, other, hero()];
  });

  async function openPicker() {
    await fireEvent.click(screen.getByTestId("species-choose"));
  }

  it("lists only marked creatures, sorted by title", async () => {
    render(SpeciesSelectionPanel, { entity: hero() });
    await openPicker();
    const labels = Array.from(
      screen.getByTestId("species-picker").querySelectorAll("option"),
    ).map((o) => o.textContent);
    expect(labels).toEqual(["Select a species…", "Aelf", "Kethari"]);
  });

  it("explains an empty picker and keeps Cancel", async () => {
    vaultState.allEntities = [plain, hero()];
    render(SpeciesSelectionPanel, { entity: hero() });
    await openPicker();
    expect(screen.getByTestId("species-empty")).toBeTruthy();
    expect(screen.queryByTestId("species-picker")).toBeNull();
    await fireEvent.click(screen.getByTestId("species-cancel"));
    expect(updateEntity).not.toHaveBeenCalled();
  });

  it("previews applied and not-applied rows without writing", async () => {
    render(SpeciesSelectionPanel, { entity: hero() });
    await openPicker();
    await fireEvent.change(screen.getByTestId("species-picker"), {
      target: { value: "kethari" },
    });
    const rows = screen.getAllByTestId("species-preview-row");
    expect(rows[0].textContent).toContain("10 → 12");
    expect(rows[1].textContent).toContain("Not applied");
    expect(rows[1].textContent).toContain("no field with this key");
    expect(updateEntity).not.toHaveBeenCalled();
  });

  it("explains a non-number target", async () => {
    render(SpeciesSelectionPanel, {
      entity: hero({
        statSheet: {
          fields: [{ id: "str_score", label: "STR", type: "text" }],
        },
      }),
    });
    await openPicker();
    await fireEvent.change(screen.getByTestId("species-picker"), {
      target: { value: "kethari" },
    });
    expect(
      screen.getAllByTestId("species-preview-row")[0].textContent,
    ).toContain("field is not a number field");
  });

  it("Cancel never writes", async () => {
    render(SpeciesSelectionPanel, { entity: hero() });
    await openPicker();
    await fireEvent.change(screen.getByTestId("species-picker"), {
      target: { value: "kethari" },
    });
    await fireEvent.click(screen.getByTestId("species-cancel"));
    expect(updateEntity).not.toHaveBeenCalled();
    expect(screen.queryByTestId("species-picker")).toBeNull();
  });

  it("Apply writes one species selection snapshot and no statSheet", async () => {
    render(SpeciesSelectionPanel, {
      props: { entity: hero(), now: () => 99 },
    });
    await openPicker();
    await fireEvent.change(screen.getByTestId("species-picker"), {
      target: { value: "kethari" },
    });
    await fireEvent.click(screen.getByTestId("species-apply"));
    expect(updateEntity).toHaveBeenCalledTimes(1);
    const [id, patch] = updateEntity.mock.calls[0];
    expect(id).toBe("hero");
    expect(Object.keys(patch)).toEqual(["traitSelections"]);
    expect(patch.traitSelections).toHaveLength(1);
    expect(patch.traitSelections[0]).toMatchObject({
      kind: "species",
      sourceId: "kethari",
      sourceTitle: "Kethari",
      appliedAt: 99,
      traits: kethari.traitPackage!.traits,
    });
  });

  it("Change replaces the selection with the new species", async () => {
    render(SpeciesSelectionPanel, {
      entity: hero({ traitSelections: [selectionFor("Kethari", "kethari")] }),
    });
    await fireEvent.click(screen.getByTestId("species-change"));
    await fireEvent.change(screen.getByTestId("species-picker"), {
      target: { value: "aelf" },
    });
    await fireEvent.click(screen.getByTestId("species-apply"));
    const patch = updateEntity.mock.calls[0][1];
    expect(patch.traitSelections).toHaveLength(1);
    expect(patch.traitSelections[0].sourceId).toBe("aelf");
  });

  it("Remove clears the selection", async () => {
    render(SpeciesSelectionPanel, {
      entity: hero({ traitSelections: [selectionFor("Kethari", "kethari")] }),
    });
    await fireEvent.click(screen.getByTestId("species-remove"));
    expect(updateEntity).toHaveBeenCalledWith("hero", { traitSelections: [] });
  });

  it("links an available source to the creature", async () => {
    render(SpeciesSelectionPanel, {
      entity: hero({ traitSelections: [selectionFor("Kethari", "kethari")] }),
    });
    await fireEvent.click(screen.getByTestId("species-source-link"));
    expect(vaultState.selectedEntityId).toBe("kethari");
  });

  it("keeps the snapshot and marks a missing source unavailable", () => {
    render(SpeciesSelectionPanel, {
      entity: hero({ traitSelections: [selectionFor("Ghost", "gone")] }),
    });
    expect(screen.getByTestId("species-traits").textContent).toContain("Brute");
    expect(screen.getByTestId("species-unavailable")).toBeTruthy();
    expect(screen.queryByTestId("species-source-link")).toBeNull();
  });

  it("rejects an oversized imported snapshot in the panel", () => {
    const oversized = Array.from({ length: 51 }, (_, index) => ({
      id: `trait-${index}`,
      name: `Trait ${index}`,
      description: "",
      adjustments: [],
    }));
    render(SpeciesSelectionPanel, {
      entity: hero({
        traitSelections: [
          { ...selectionFor("Kethari", "kethari"), traits: oversized },
        ],
      }),
    });
    expect(screen.getByTestId("species-traits-invalid").textContent).toContain(
      "50-trait limit",
    );
    expect(screen.queryByTestId("species-traits")).toBeNull();
  });

  it("is read-only for guests", () => {
    vaultState.isGuest = true;
    render(SpeciesSelectionPanel, {
      entity: hero({ traitSelections: [selectionFor("Kethari", "kethari")] }),
    });
    expect(screen.queryByTestId("species-picker")).toBeNull();
    expect(screen.queryByTestId("species-choose")).toBeNull();
    expect(screen.queryByTestId("species-change")).toBeNull();
    expect(screen.queryByTestId("species-remove")).toBeNull();
    expect(screen.getByTestId("species-traits").textContent).toContain("Brute");
  });
});
