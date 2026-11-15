/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";
import { tick } from "svelte";

const { updateEntity } = vi.hoisted(() => ({ updateEntity: vi.fn() }));

vi.mock("#lib/stores/vault.svelte.js", () => ({
  vault: { updateEntity },
}));

vi.mock("#lib/stores/ui/notification.svelte.js", () => ({
  notificationStore: { confirm: vi.fn() },
}));

import StatSheetEditor from "./StatSheetEditor.svelte";

// The real vault store holds entities in Svelte $state, so `entity.statSheet`
// (and its `fields` array) is a reactive proxy, not a plain object. Cloning
// that with the raw `structuredClone` DOM API throws
// `DataCloneError: could not be cloned` because of the proxy's internal
// machinery — reproduced here by wrapping the fixture in real `$state`
// instead of a plain object literal.
function buildReactiveEntity(): Entity {
  const state = $state({
    id: "goblin-1",
    type: "npc",
    title: "Goblin",
    tags: [],
    labels: [],
    aliases: [],
    connections: [],
    content: "",
    statSheet: {
      fields: [{ id: "hp", label: "Hit Points", type: "counter", value: 10 }],
    },
  });
  return state as unknown as Entity;
}

describe("StatSheetEditor with a reactive ($state) entity prop", () => {
  it("does not throw DataCloneError when the entity's statSheet.fields is a Svelte $state proxy", () => {
    const entity = buildReactiveEntity();
    expect(() => render(StatSheetEditor, { entity })).not.toThrow();
    expect(screen.getByTestId("stat-sheet-editor")).toBeTruthy();
  });
});

describe("StatSheetEditor entity changes", () => {
  it("refreshes the scratchpad when reactive fields are replaced externally", async () => {
    const entity = buildReactiveEntity();
    render(StatSheetEditor, { entity });
    await tick();
    entity.statSheet!.fields = [
      { id: "ac", label: "Armour", type: "number", value: 12 },
    ];
    await tick();
    expect(screen.queryByDisplayValue("Hit Points")).toBeNull();
    await fireEvent.input(screen.getByLabelText("Field label"), {
      target: { value: "AC" },
    });
    expect(updateEntity).toHaveBeenLastCalledWith(
      "goblin-1",
      expect.objectContaining({
        statSheet: expect.objectContaining({
          fields: [expect.objectContaining({ id: "ac", label: "AC" })],
        }),
      }),
    );
    expect(entity.statSheet!.fields[0].label).toBe("Armour");
  });

  it("persists to the replacement entity and uses an updated ID generator prop", async () => {
    const { rerender } = render(StatSheetEditor, {
      entity: buildReactiveEntity(),
      idGenerator: { uuid: () => "old" },
    });
    const entity = buildReactiveEntity();
    entity.id = "new-hero";
    entity.statSheet!.fields = [];
    await rerender({ entity, idGenerator: { uuid: () => "new" } });
    await fireEvent.click(screen.getByTestId("stat-sheet-editor-add"));
    expect(updateEntity).toHaveBeenLastCalledWith(
      "new-hero",
      expect.objectContaining({
        statSheet: expect.objectContaining({
          fields: [expect.objectContaining({ id: "field-new" })],
        }),
      }),
    );
  });
});
