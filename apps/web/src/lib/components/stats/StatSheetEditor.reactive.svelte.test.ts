/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";

const { updateEntity } = vi.hoisted(() => ({ updateEntity: vi.fn() }));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: { updateEntity },
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
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
