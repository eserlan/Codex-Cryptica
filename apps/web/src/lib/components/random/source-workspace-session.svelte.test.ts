import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CandidateTableEntry } from "generator-engine";
import type { Diagnostic, RandomSource } from "random-source-engine";
import { SourceWorkspaceSession } from "./source-workspace-session.svelte";

vi.mock("#lib/features/random/index.js", () => ({ randomSources: {} }));

const table = (id = "forest", name = "Forest"): RandomSource => ({
  id,
  name,
  kind: "table",
  labels: ["travel"],
  entries: [{ id: "entry", text: "Wolf", weight: 1 }],
});
const error: Diagnostic = {
  severity: "error",
  code: "duplicate-name",
  message: "Name is taken",
};

function setup() {
  const stored = [table()];
  const sources = {
    findById: vi.fn((id: string) => stored.find((source) => source.id === id)),
    findByName: vi.fn((name: string) =>
      stored.find((source) => source.name === name),
    ),
    create: vi.fn((kind: "table" | "deck", name: string) => ({
      ...table("new", name),
      kind,
    })),
    save: vi.fn(async (_source: RandomSource): Promise<Diagnostic[]> => []),
    rename: vi.fn(
      async (_source: RandomSource, _name: string): Promise<Diagnostic[]> => [],
    ),
    remove: vi.fn(async (_source: RandomSource) => {}),
    validate: vi.fn((_source: RandomSource): Diagnostic[] => []),
    impactOf: vi.fn((_source: RandomSource) => ({
      safe: true,
      referencedBy: [] as RandomSource[],
    })),
  };
  let nextId = 0;
  const session = new SourceWorkspaceSession(sources, () => ({
    uuid: () => `new-${++nextId}`,
  }));
  return { session, sources, stored };
}
const settle = () => vi.advanceTimersByTimeAsync(0);
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("source workspace editing session", () => {
  it("validates immediately and saves only the latest edit after the debounce", async () => {
    const { session, sources } = setup();
    session.select(table());
    session.onChange({ ...table(), name: "stale", description: "First" });
    await vi.advanceTimersByTimeAsync(200);
    session.onChange({ ...table(), description: "Latest" });
    expect(sources.validate).toHaveBeenLastCalledWith(
      expect.objectContaining({ description: "Latest" }),
    );
    expect(session.saving).toBe(true);
    await vi.advanceTimersByTimeAsync(399);
    expect(sources.save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(sources.save).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ name: "Forest", description: "Latest" }),
    );
    expect(session.saving).toBe(false);
  });

  it("flushes the previous draft once when selection changes", async () => {
    const { session, sources } = setup();
    session.select(table());
    session.onChange({ ...table(), description: "Pending" });
    session.pendingRename = { name: "Woods", referencedBy: [table()] };
    session.deleteImpact = [table()];
    session.select(table("dungeon", "Dungeon"));
    await settle();
    expect(sources.save).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ id: "forest", description: "Pending" }),
    );
    expect(session.selectedId).toBe("dungeon");
    expect(session.pendingRename).toBeUndefined();
    expect(session.deleteImpact).toBeUndefined();
    await vi.advanceTimersByTimeAsync(500);
    expect(sources.save).toHaveBeenCalledOnce();
  });

  it("serialises creation and edits, and continues after a failed write", async () => {
    const { session, sources } = setup();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    let rejectCreate!: (reason: Error) => void;
    sources.save.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectCreate = reject;
        }),
    );
    session.saveNew(table());
    session.select(table());
    session.onChange({ ...table(), description: "Edited" });
    await vi.advanceTimersByTimeAsync(400);
    expect(sources.save).toHaveBeenCalledOnce();
    expect(session.saving).toBe(true);
    rejectCreate(new Error("Disk unavailable"));
    await settle();
    expect(log).toHaveBeenCalledWith(
      "[RandomSources] Write failed",
      expect.any(Error),
    );
    expect(sources.save).toHaveBeenCalledTimes(2);
    expect(sources.save).toHaveBeenLastCalledWith(
      expect.objectContaining({ description: "Edited" }),
    );
    expect(session.saving).toBe(false);
  });

  it("warns before a rename breaks references and saves edits before the rename", async () => {
    const { session, sources } = setup();
    expect(session.requestRename("Woods")).toBe(false);
    session.select(table());
    expect(session.requestRename("Forest")).toBe(false);
    sources.impactOf.mockReturnValue({
      safe: false,
      referencedBy: [table("travel", "Travel")],
    });
    session.onChange({ ...table(), description: "Edited" });
    expect(session.requestRename("Woods")).toBe(false);
    expect(session.pendingRename?.referencedBy[0].name).toBe("Travel");
    expect(sources.rename).not.toHaveBeenCalled();
    session.commitRename("Woods");
    expect(session.draft?.name).toBe("Woods");
    await settle();
    expect(sources.save.mock.invocationCallOrder[0]).toBeLessThan(
      sources.rename.mock.invocationCallOrder[0],
    );
    expect(sources.rename).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Forest" }),
      "Woods",
    );
    expect(session.pendingRename).toBeUndefined();
  });

  it("rolls back a rejected rename only while its draft is still selected", async () => {
    const { session, sources } = setup();
    sources.rename.mockResolvedValue([error]);
    session.select(table());
    expect(session.requestRename("Woods")).toBe(true);
    await settle();
    expect(session.draft?.name).toBe("Forest");
    expect(session.diagnostics).toEqual([error]);
    session.commitRename("Woods");
    session.select(table("dungeon", "Dungeon"));
    await settle();
    expect(session.draft?.name).toBe("Dungeon");
  });

  it("uses the rename path for an edit whose stored filename differs", async () => {
    const { session, sources } = setup();
    session.onChange({ ...table(), name: "Woods", description: "Edited" });
    await vi.advanceTimersByTimeAsync(400);
    expect(sources.rename).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Forest", description: "Edited" }),
      "Woods",
    );
    expect(sources.save).not.toHaveBeenCalled();
  });

  it("ignores missing stored rename targets", async () => {
    const { session, sources } = setup();
    session.commitRename("No draft");
    session.select(table("missing"));
    session.commitRename("Woods");
    session.renameSource(table("missing"), "Other");
    await settle();
    expect(sources.rename).not.toHaveBeenCalled();
    expect(session.saving).toBe(false);
  });

  it("deletes another source without clearing the editor, and flushes before deleting the selected source", async () => {
    const { session, sources } = setup();
    session.select(table());
    session.onChange({ ...table(), description: "Edited" });
    expect(session.confirmDelete(table("other"))).toBe(false);
    expect(session.draft?.id).toBe("forest");
    expect(session.confirmDelete(table())).toBe(true);
    expect(session.draft).toBeUndefined();
    expect(session.selectedId).toBeUndefined();
    await settle();
    expect(sources.remove).toHaveBeenCalledTimes(2);
    expect(sources.save).toHaveBeenCalledOnce();
    expect(sources.save.mock.invocationCallOrder[0]).toBeLessThan(
      sources.remove.mock.invocationCallOrder[1],
    );
  });

  it("creates unique names and independent ids for copied contents", () => {
    const { session, stored } = setup();
    stored.push(
      table("one", "New table"),
      table("two", "New table 2"),
      table("copy", "Forest (Copy)"),
    );
    expect(session.create("table").name).toBe("New table 3");
    const source = {
      ...table(),
      cards: [{ id: "card", title: "Moon", body: "Silver" }],
      spreads: [{ id: "spread", name: "One", positions: [] }],
    };
    const copy = session.copy(source);
    expect(copy.name).toBe("Forest (Copy) 2");
    expect([
      copy.id,
      copy.entries?.[0].id,
      copy.cards?.[0].id,
      copy.spreads?.[0].id,
    ]).toEqual(["new-1", "new-2", "new-3", "new-4"]);
    expect(source.entries?.[0].id).toBe("entry");
    expect(
      session.copy({ ...table(), entries: undefined }).entries,
    ).toBeUndefined();
  });

  it("normalises generated entries while preserving supplied ids and weights", () => {
    const { session } = setup();
    const generated = session.createGenerated(
      "table",
      [
        { id: "kept", text: "Wolf", weight: 3, selected: true },
        { id: "", text: "Fox", selected: true },
      ] as CandidateTableEntry[],
      "  Forest  ",
      "Animals",
    );
    expect(generated.name).toBe("Forest 2");
    expect(generated.description).toBe("Animals");
    expect(generated.entries).toEqual([
      { id: "kept", text: "Wolf", weight: 3 },
      { id: "new-1", text: "Fox", weight: 1 },
    ]);
    expect(session.createGenerated("table", [], "   ").name).toBe("New table");
  });

  it("renames a source outside the selected draft through the write queue", async () => {
    const { session, sources } = setup();
    session.select(table("dungeon", "Dungeon"));
    session.renameSource(table(), "Woods");
    await settle();
    expect(sources.rename).toHaveBeenCalledWith(table(), "Woods");
    expect(session.draft?.name).toBe("Dungeon");
  });
});
