/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";

const { updateEntity, vaultState } = vi.hoisted(() => ({
  updateEntity: vi.fn(),
  vaultState: { isGuest: false },
}));

vi.mock("#lib/stores/vault.svelte.js", () => ({
  vault: {
    get isGuest() {
      return vaultState.isGuest;
    },
    updateEntity,
  },
}));

import SpeciesDefinitionEditor from "./SpeciesDefinitionEditor.svelte";

const creature = (o: Partial<Entity> = {}): Entity =>
  ({
    id: "k",
    type: "creature",
    title: "Kethari",
    tags: [],
    labels: [],
    aliases: [],
    connections: [],
    content: "",
    ...o,
  }) as Entity;

const idGenerator = { uuid: () => "trait-1" } as never;

describe("SpeciesDefinitionEditor", () => {
  beforeEach(() => {
    updateEntity.mockReset();
    vaultState.isGuest = false;
  });

  it("turns the definition on", async () => {
    render(SpeciesDefinitionEditor, { entity: creature(), idGenerator });
    await fireEvent.click(screen.getByTestId("species-definition-toggle"));
    expect(updateEntity).toHaveBeenCalledWith("k", {
      traitPackage: { kind: "species", traits: [] },
    });
  });

  it("adds a trait, then an adjustment of strength -1", async () => {
    const { rerender } = render(SpeciesDefinitionEditor, {
      entity: creature({ traitPackage: { kind: "species", traits: [] } }),
      idGenerator,
    });
    await fireEvent.click(screen.getByTestId("species-add-trait"));
    const withTrait = updateEntity.mock.calls[0][1].traitPackage;
    expect(withTrait.traits[0].id).toBe("trait-1");

    await rerender({
      entity: creature({ traitPackage: withTrait }),
      idGenerator,
    });
    await fireEvent.input(screen.getByLabelText("New adjustment target"), {
      target: { value: "strength" },
    });
    await fireEvent.input(screen.getByLabelText("New adjustment amount"), {
      target: { value: "-1" },
    });
    await fireEvent.click(screen.getByTestId("species-add-adjustment"));
    const pkg = updateEntity.mock.calls[1][1].traitPackage;
    expect(pkg.kind).toBe("species");
    expect(pkg.traits[0].adjustments).toEqual([
      { target: "strength", amount: -1 },
    ]);
  });

  it("rejects a zero adjustment", async () => {
    render(SpeciesDefinitionEditor, {
      entity: creature({
        traitPackage: {
          kind: "species",
          traits: [{ id: "t", name: "T", description: "", adjustments: [] }],
        },
      }),
      idGenerator,
    });
    await fireEvent.input(screen.getByLabelText("New adjustment target"), {
      target: { value: "strength" },
    });
    await fireEvent.input(screen.getByLabelText("New adjustment amount"), {
      target: { value: "0" },
    });
    await fireEvent.click(screen.getByTestId("species-add-adjustment"));
    expect(updateEntity).not.toHaveBeenCalled();
  });

  it("turns the definition off by removing traitPackage", async () => {
    render(SpeciesDefinitionEditor, {
      entity: creature({ traitPackage: { kind: "species", traits: [] } }),
      idGenerator,
    });
    await fireEvent.click(screen.getByTestId("species-definition-toggle"));
    expect(updateEntity).toHaveBeenCalledWith("k", { traitPackage: undefined });
  });

  it("is read-only for guests", () => {
    vaultState.isGuest = true;
    render(SpeciesDefinitionEditor, {
      entity: creature({ traitPackage: { kind: "species", traits: [] } }),
      idGenerator,
    });
    expect(
      (screen.getByTestId("species-definition-toggle") as HTMLInputElement)
        .disabled,
    ).toBe(true);
    expect(screen.queryByTestId("species-add-trait")).toBeNull();
  });
});
