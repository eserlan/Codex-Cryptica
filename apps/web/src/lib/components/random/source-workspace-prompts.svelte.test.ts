import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RandomSource } from "random-source-engine";
import { SourceWorkspaceSession } from "./source-workspace-session.svelte";
import { SourceWorkspacePrompts } from "./source-workspace-prompts.svelte";

vi.mock("#lib/features/random/index.js", () => ({ randomSources: {} }));
const source: RandomSource = {
  id: "forest",
  name: "Forest",
  kind: "table",
  labels: [],
  entries: [],
};
function setup() {
  const sources = {
    findById: vi.fn((id: string) => (id === source.id ? source : undefined)),
    findByName: vi.fn((name: string) =>
      name === source.name ? source : undefined,
    ),
    create: vi.fn(),
    save: vi.fn(async () => []),
    rename: vi.fn(async () => []),
    remove: vi.fn(async () => {}),
    validate: vi.fn(() => []),
    impactOf: vi.fn(() => ({ safe: false, referencedBy: [source] })),
  };
  const session = new SourceWorkspaceSession(sources);
  const onDelete = vi.fn();
  const prompts = new SourceWorkspacePrompts(
    session,
    () => "table",
    onDelete,
    () => ({ width: 300, height: 400 }),
  );
  return { session, prompts, sources, onDelete };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("source workspace prompts", () => {
  it("keeps context menus within the supplied viewport and closes them for prompts", () => {
    const { prompts } = setup();
    prompts.showContextMenu(source, 300, 400);
    expect(prompts.contextMenu).toEqual({ source, x: 124, y: 128 });
    prompts.openRenameModal(source);
    expect(prompts.contextMenu).toBeNull();
    expect(prompts.renameModalDraft).toBe("Forest");
    expect(prompts.renameModalImpact).toEqual([source]);
    prompts.closeRenameModal();
    expect(prompts.renameModalImpact).toEqual([]);
    expect(prompts.renameModalDraft).toBe("");
  });

  it("handles a missing viewport and clamps an undersized viewport", () => {
    const { session } = setup();
    const server = new SourceWorkspacePrompts(
      session,
      () => "table",
      vi.fn(),
      () => undefined,
    );
    server.showContextMenu(source, 12, 34);
    expect(server.contextMenu).toEqual({ source, x: 12, y: 34 });
    const small = new SourceWorkspacePrompts(
      session,
      () => "table",
      vi.fn(),
      () => ({ width: 10, height: 10 }),
    );
    small.showContextMenu(source, 12, 34);
    expect(small.contextMenu).toEqual({ source, x: 0, y: 0 });
  });

  it("does nothing on an empty rename or missing target, and closes an unchanged name", () => {
    const { prompts, sources } = setup();
    prompts.executeRename();
    prompts.executeDelete();
    prompts.openRenameModal(source);
    prompts.renameModalDraft = "  ";
    prompts.executeRename();
    expect(prompts.renameModalTarget?.id).toBe(source.id);
    prompts.renameModalDraft = " Forest ";
    prompts.executeRename();
    expect(prompts.renameModalTarget).toBeNull();
    expect(sources.rename).not.toHaveBeenCalled();
  });

  it("keeps a colliding name open with an error, then clears it on cancellation", () => {
    const { prompts, sources } = setup();
    sources.findByName.mockReturnValue({ ...source, id: "other" });
    prompts.openRenameModal(source);
    prompts.renameModalDraft = " Other ";
    prompts.executeRename();
    expect(prompts.renameModalError).toBe(
      'A table named "Other" already exists.',
    );
    expect(prompts.renameModalTarget?.id).toBe(source.id);
    prompts.handleWindowKeydown(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(prompts.renameModalTarget?.id).toBe(source.id);
    prompts.handleWindowKeydown(
      new KeyboardEvent("keydown", { key: "Escape" }),
    );
    expect(prompts.renameModalTarget).toBeNull();
    expect(prompts.renameModalError).toBe("");
  });

  it("renames the selected draft immediately and queues other sources without selecting them", async () => {
    const { session, prompts, sources } = setup();
    session.select(source);
    prompts.openRenameModal(source);
    prompts.renameModalDraft = " Woods ";
    prompts.executeRename();
    expect(session.draft?.name).toBe("Woods");
    expect(prompts.renameModalTarget).toBeNull();
    await vi.advanceTimersByTimeAsync(0);
    expect(sources.rename).toHaveBeenCalledWith(source, "Woods");
    session.select({ ...source, id: "dungeon", name: "Dungeon" });
    prompts.openRenameModal(source);
    prompts.renameModalDraft = "Trees";
    prompts.executeRename();
    await vi.advanceTimersByTimeAsync(0);
    expect(sources.rename).toHaveBeenLastCalledWith(source, "Trees");
    expect(session.draft?.name).toBe("Dungeon");
  });

  it("cancels deletion on Escape and dispatches it only after confirmation", () => {
    const { prompts, onDelete } = setup();
    prompts.showContextMenu(source, 10, 20);
    prompts.openDeleteModal(source);
    expect(prompts.contextMenu).toBeNull();
    expect(prompts.deleteModalImpact).toEqual([source]);
    prompts.handleWindowKeydown(
      new KeyboardEvent("keydown", { key: "Escape" }),
    );
    expect(prompts.deleteModalTarget).toBeNull();
    expect(prompts.deleteModalImpact).toEqual([]);
    expect(onDelete).not.toHaveBeenCalled();
    prompts.openDeleteModal(source);
    prompts.executeDelete();
    expect(onDelete).toHaveBeenCalledExactlyOnceWith(source);
    expect(prompts.deleteModalTarget).toBeNull();
  });
});
