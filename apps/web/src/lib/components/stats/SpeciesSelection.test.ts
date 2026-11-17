/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { EntitySchema } from "schema";
import { previewSpecies } from "@codex/stat-sheet-engine";
vi.mock("#lib/stores/vault.svelte.js", () => ({ vault: {} }));
import SpeciesSelection from "./SpeciesSelection.svelte";

const source = () =>
  EntitySchema.parse({
    id: "kethari",
    title: "Kethari",
    type: "creature",
    speciesDefinition: {
      kind: "species",
      version: 1,
      traits: [
        {
          id: "power",
          name: "Powerful",
          description: "Strong",
          adjustments: [{ key: "strength", amount: 2 }],
        },
        {
          id: "reserved",
          name: "Reserved",
          description: "Quiet",
          adjustments: [{ key: "presence", amount: -1 }],
        },
        {
          id: "sight",
          name: "Night sight",
          description: "<script>bad()</script>",
          adjustments: [],
        },
      ],
    },
  });
const hero = (type = "character") =>
  EntitySchema.parse({
    id: "hero",
    type,
    title: "Hero",
    content: "Manual abilities",
    statSheet: {
      fields: [
        { id: "a", key: "strength", label: "Might", type: "number", value: 10 },
        { id: "b", key: "presence", label: "Charm", type: "number", value: 8 },
      ],
    },
  });
async function choose(id = "kethari") {
  await fireEvent.click(
    screen.getByRole("button", { name: "Choose Species/Ancestry" }),
  );
  await fireEvent.change(screen.getByRole("combobox"), {
    target: { value: id },
  });
}

describe("SpeciesSelection", () => {
  it.each(["character", "npc"])(
    "previews and cancels without writing a %s; confirms only a snapshot",
    async (type) => {
      const entity = hero(type),
        before = structuredClone(entity),
        save = vi.fn();
      render(SpeciesSelection, {
        entity,
        candidates: [
          source(),
          EntitySchema.parse({
            id: "ordinary",
            type: "creature",
            title: "Ordinary",
          }),
        ],
        save,
        onOpenSource: vi.fn(),
      });
      await choose();
      expect(screen.queryByRole("option", { name: "Ordinary" })).toBeNull();
      expect(screen.getByText(/Base 10; Effective 12/)).toBeTruthy();
      expect(screen.getByText(/Base 8; Effective 7/)).toBeTruthy();
      expect(screen.getByText(/strength \+2/)).toBeTruthy();
      expect(screen.getByText("<script>bad()</script>")).toBeTruthy();
      expect(save).not.toHaveBeenCalled();
      await fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Choose Species/Ancestry" }),
      );
      expect(entity).toEqual(before);
      await choose();
      await fireEvent.click(
        screen.getByRole("button", { name: "Confirm species selection" }),
      );
      expect(save).toHaveBeenCalledWith({
        appliedSpecies: previewSpecies(entity, source()),
      });
      expect(entity).toEqual(before);
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Choose Species/Ancestry" }),
      );
    },
  );

  it("retains the last saved selection on rejected/failed saves and retries", async () => {
    const entity = {
      ...hero(),
      appliedSpecies: previewSpecies(hero(), source()),
    };
    const save = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockRejectedValueOnce(new Error("Disk full"))
      .mockResolvedValueOnce(true);
    render(SpeciesSelection, {
      entity,
      candidates: [source()],
      save,
      onOpenSource: vi.fn(),
    });
    await choose("");
    const confirm = screen.getByRole("button", {
      name: "Confirm species selection",
    });
    await fireEvent.click(confirm);
    expect(screen.getByRole("alert").textContent).toContain(
      "could not be saved",
    );
    expect(entity.appliedSpecies.source.title).toBe("Kethari");
    await fireEvent.click(confirm);
    expect(screen.getByRole("alert").textContent).toContain("Disk full");
    await fireEvent.click(confirm);
    expect(save).toHaveBeenLastCalledWith({ appliedSpecies: undefined });
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(entity.statSheet!.fields[0].value).toBe(10);
  });

  it("requires another review when base data changes, and reselects idempotently", async () => {
    const entity = hero(),
      save = vi.fn();
    const props = {
      entity,
      candidates: [source()],
      save,
      onOpenSource: vi.fn(),
    };
    const view = render(SpeciesSelection, props);
    await choose();
    const edited = {
      ...entity,
      statSheet: { fields: [{ ...entity.statSheet!.fields[0], value: 13 }] },
    };
    await view.rerender({ ...props, entity: edited });
    await fireEvent.click(
      screen.getByRole("button", { name: "Confirm species selection" }),
    );
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain(
      "Review the updated preview",
    );
    expect(screen.getByText(/Base 13; Effective 15/)).toBeTruthy();
    await fireEvent.click(
      screen.getByRole("button", { name: "Confirm species selection" }),
    );
    const appliedSpecies = save.mock.calls[0][0].appliedSpecies;
    await view.rerender({ ...props, entity: { ...edited, appliedSpecies } });
    save.mockClear();
    await choose();
    await fireEvent.click(
      screen.getByRole("button", { name: "Confirm species selection" }),
    );
    expect(save).not.toHaveBeenCalled();
  });

  it("retains immutable traits when source changes, loses designation or disappears", async () => {
    const entity = {
      ...hero(),
      appliedSpecies: previewSpecies(hero(), source()),
    };
    const save = vi.fn(),
      onOpenSource = vi.fn();
    const props = { entity, candidates: [source()], save, onOpenSource };
    const view = render(SpeciesSelection, props);
    await fireEvent.click(
      screen.getByRole("button", { name: "Open source Creature" }),
    );
    expect(onOpenSource).toHaveBeenCalledWith("kethari");
    const changed = source();
    changed.speciesDefinition!.traits[0].name = "Edited";
    await view.rerender({ ...props, candidates: [changed] });
    expect(screen.getByText("Powerful")).toBeTruthy();
    expect(screen.queryByText("Edited")).toBeNull();
    await view.rerender({
      ...props,
      candidates: [{ ...changed, speciesDefinition: undefined }],
    });
    expect(
      screen.queryByRole("button", { name: "Open source Creature" }),
    ).toBeNull();
    expect(screen.getByText(/Source Creature unavailable/)).toBeTruthy();
    await view.rerender({ ...props, candidates: [] });
    expect(screen.getByText(/Base 10; Effective 12/)).toBeTruthy();
    expect(save).not.toHaveBeenCalled();
    expect(screen.queryByText(/refresh|drift/i)).toBeNull();
    await choose("");
    await fireEvent.click(
      screen.getByRole("button", { name: "Confirm species selection" }),
    );
    expect(save).toHaveBeenCalledWith({ appliedSpecies: undefined });
  });

  it("shows unavailable targets and permits partial or ability-only selection", async () => {
    const entity = { ...hero(), statSheet: undefined },
      save = vi.fn();
    render(SpeciesSelection, {
      entity,
      candidates: [source()],
      save,
      onOpenSource: vi.fn(),
    });
    await choose();
    expect(screen.getAllByText(/Unavailable: Missing key/)).toHaveLength(2);
    expect(screen.getByText("Night sight")).toBeTruthy();
    await fireEvent.click(
      screen.getByRole("button", { name: "Confirm species selection" }),
    );
    expect(
      save.mock.calls[0][0].appliedSpecies.traits[0].adjustments[0].resolution
        .status,
    ).toBe("skipped");
    expect(entity.statSheet).toBeUndefined();
  });

  it("explains an empty current vault and hides all guest mutation controls", async () => {
    const save = vi.fn();
    const props = {
      entity: hero(),
      candidates: [],
      save,
      onOpenSource: vi.fn(),
    };
    const view = render(SpeciesSelection, props);
    await choose("");
    expect(
      screen.getByText(/No designated Creatures in this vault/),
    ).toBeTruthy();
    await view.rerender({ ...props, readOnly: true });
    expect(screen.queryByRole("button")).toBeNull();
    expect(save).not.toHaveBeenCalled();
  });
});

describe("replacement from current bases", () => {
  it("previews the candidate without the old contribution and persists only its snapshot", async () => {
    const original = hero();
    const entity = {
      ...original,
      statSheet: {
        fields: [
          { ...original.statSheet!.fields[0], value: 13 },
          original.statSheet!.fields[1],
        ],
      },
      appliedSpecies: previewSpecies(original, source()),
    };
    const other = source();
    other.id = "other";
    other.title = "Other species";
    other.speciesDefinition!.traits = [
      {
        id: "slight",
        name: "Slight",
        description: "Light frame",
        adjustments: [{ key: "strength", amount: -1 }],
      },
    ];
    const before = structuredClone(entity),
      save = vi.fn();
    render(SpeciesSelection, {
      entity,
      candidates: [source(), other],
      save,
      onOpenSource: vi.fn(),
    });
    await choose("other");
    const review = screen.getByRole("dialog", {
      name: "Review Species/Ancestry",
    });
    expect(review.textContent).toContain("Base 13; Effective 12");
    expect(review.textContent).not.toContain("Powerful");
    await fireEvent.click(
      screen.getByRole("button", { name: "Confirm species selection" }),
    );
    expect(save).toHaveBeenCalledWith({
      appliedSpecies: previewSpecies(entity, other),
    });
    expect(entity).toEqual(before);
  });
});
