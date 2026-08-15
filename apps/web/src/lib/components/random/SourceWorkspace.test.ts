/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { RandomSource } from "random-source-engine";
import SourceWorkspace from "./SourceWorkspace.svelte";

const { mockTables, mockRandomSources } = vi.hoisted(() => {
  const initialTables: RandomSource[] = [
    {
      id: "table-1",
      name: "Wilderness Encounters",
      kind: "table",
      labels: ["travel"],
      selection: { mode: "weighted" },
      entries: [{ id: "e-1", text: "Goblin ambush", weight: 1 }],
    },
    {
      id: "table-2",
      name: "Dungeon Hazards",
      kind: "table",
      labels: ["dungeon"],
      selection: { mode: "weighted" },
      entries: [{ id: "e-2", text: "Pit trap", weight: 1 }],
    },
  ];

  const store = {
    tables: [...initialTables],
    decks: [],
    names: ["Wilderness Encounters", "Dungeon Hazards"],
    findById: vi.fn((id: string) => store.tables.find((t) => t.id === id)),
    findByName: vi.fn((name: string) =>
      store.tables.find((t) => t.name === name),
    ),
    create: vi.fn((kind: "table" | "deck", name: string) => ({
      id: "new-table-id",
      name,
      kind,
      labels: [],
      entries: [],
      selection: { mode: "weighted" },
    })),
    save: vi.fn(async () => []),
    rename: vi.fn(async () => []),
    remove: vi.fn(async () => {}),
    validate: vi.fn(() => []),
    impactOf: vi.fn((_source: RandomSource) => ({
      safe: true,
      referencedBy: [],
    })),
  };

  return { mockTables: initialTables, mockRandomSources: store };
});

vi.mock("$app/state", () => ({
  page: {
    url: new URL("http://localhost/tables"),
  },
}));

vi.mock("$app/paths", () => ({
  base: "",
}));

vi.mock("$lib/features/random", () => ({
  randomSources: mockRandomSources,
  ensureRandomSourcesLoaded: vi.fn(async () => {}),
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    activeVaultId: "vault-1",
  },
}));

describe("SourceWorkspace Organization and Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRandomSources.tables = [...mockTables];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders table items with visible action trigger buttons", () => {
    render(SourceWorkspace, {
      props: {
        kind: "table",
        heading: "Random Tables",
        icon: "icon-[lucide--list-tree]",
        emptyBody: "No table open",
        editor: vi.fn(),
        player: vi.fn(),
      } as never,
    });

    expect(screen.getByText("Wilderness Encounters")).toBeDefined();
    expect(screen.getByTestId("item-actions-table-1")).toBeDefined();
    expect(screen.getByTestId("item-actions-table-2")).toBeDefined();
  });

  it("opens context menu when clicking the action trigger button", async () => {
    render(SourceWorkspace, {
      props: {
        kind: "table",
        heading: "Random Tables",
        icon: "icon-[lucide--list-tree]",
        emptyBody: "No table open",
        editor: vi.fn(),
        player: vi.fn(),
      } as never,
    });

    const actionBtn = screen.getByTestId("item-actions-table-1");
    await fireEvent.click(actionBtn);

    expect(screen.getByTestId("ctx-open")).toBeDefined();
    expect(screen.getByTestId("ctx-rename")).toBeDefined();
    expect(screen.getByTestId("ctx-duplicate")).toBeDefined();
    expect(screen.getByTestId("ctx-export")).toBeDefined();
    expect(screen.getByTestId("ctx-delete")).toBeDefined();
  });

  it("opens context menu on mobile long-press", async () => {
    vi.useFakeTimers();
    render(SourceWorkspace, {
      props: {
        kind: "table",
        heading: "Random Tables",
        icon: "icon-[lucide--list-tree]",
        emptyBody: "No table open",
        editor: vi.fn(),
        player: vi.fn(),
      } as never,
    });

    const item = screen.getByText("Wilderness Encounters").closest("li")!;
    await fireEvent.touchStart(item, {
      touches: [{ clientX: 100, clientY: 150 }],
    });

    await vi.advanceTimersByTimeAsync(500);

    expect(screen.getByTestId("ctx-open")).toBeDefined();
    expect(screen.getByTestId("ctx-delete")).toBeDefined();
  });

  it("opens delete modal verification and confirms deletion", async () => {
    render(SourceWorkspace, {
      props: {
        kind: "table",
        heading: "Random Tables",
        icon: "icon-[lucide--list-tree]",
        emptyBody: "No table open",
        editor: vi.fn(),
        player: vi.fn(),
      } as never,
    });

    const actionBtn = screen.getByTestId("item-actions-table-1");
    await fireEvent.click(actionBtn);

    const deleteBtn = screen.getByTestId("ctx-delete");
    await fireEvent.click(deleteBtn);

    expect(screen.getByTestId("modal-delete-confirm")).toBeDefined();

    await fireEvent.click(screen.getByTestId("modal-delete-confirm"));
    expect(mockRandomSources.remove).toHaveBeenCalledWith(
      expect.objectContaining({ id: "table-1" }),
    );
  });

  it("keeps the selected source open when deleting another source", async () => {
    render(SourceWorkspace, {
      props: {
        kind: "table",
        heading: "Random Tables",
        icon: "icon-[lucide--list-tree]",
        emptyBody: "No table open",
        editor: vi.fn(),
        player: vi.fn(),
      } as never,
    });

    await fireEvent.click(screen.getByTestId("item-actions-table-2"));
    await fireEvent.click(screen.getByTestId("ctx-open"));

    await fireEvent.click(screen.getByTestId("item-actions-table-1"));
    await fireEvent.click(screen.getByTestId("ctx-delete"));
    await fireEvent.click(screen.getByTestId("modal-delete-confirm"));

    await fireEvent.click(screen.getByTestId("open-export"));
    expect(screen.getByTestId("export-dialog").textContent).toContain(
      "Dungeon Hazards",
    );
  });

  it("selects a context-menu export target before opening the export dialog", async () => {
    render(SourceWorkspace, {
      props: {
        kind: "table",
        heading: "Random Tables",
        icon: "icon-[lucide--list-tree]",
        emptyBody: "No table open",
        editor: vi.fn(),
        player: vi.fn(),
      } as never,
    });

    await fireEvent.click(screen.getByTestId("item-actions-table-1"));
    await fireEvent.click(screen.getByTestId("ctx-export"));

    expect(screen.getByTestId("export-dialog").textContent).toContain(
      "Wilderness Encounters",
    );
  });

  it("dismisses the rename and delete modals with Escape", async () => {
    render(SourceWorkspace, {
      props: {
        kind: "table",
        heading: "Random Tables",
        icon: "icon-[lucide--list-tree]",
        emptyBody: "No table open",
        editor: vi.fn(),
        player: vi.fn(),
      } as never,
    });

    await fireEvent.click(screen.getByTestId("item-actions-table-1"));
    await fireEvent.click(screen.getByTestId("ctx-delete"));
    await fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("modal-delete-confirm")).toBeNull();

    await fireEvent.click(screen.getByTestId("item-actions-table-1"));
    await fireEvent.click(screen.getByTestId("ctx-rename"));
    await fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("modal-rename-confirm")).toBeNull();
  });

  it("opens rename modal and executes rename with unique name", async () => {
    render(SourceWorkspace, {
      props: {
        kind: "table",
        heading: "Random Tables",
        icon: "icon-[lucide--list-tree]",
        emptyBody: "No table open",
        editor: vi.fn(),
        player: vi.fn(),
      } as never,
    });

    const actionBtn = screen.getByTestId("item-actions-table-1");
    await fireEvent.click(actionBtn);

    const renameBtn = screen.getByTestId("ctx-rename");
    await fireEvent.click(renameBtn);

    expect(screen.getByTestId("modal-rename-confirm")).toBeDefined();
    const input = screen.getByTestId("modal-rename-input");
    await fireEvent.input(input, {
      target: { value: "Wilderness Encounters v2" },
    });

    await fireEvent.click(screen.getByTestId("modal-rename-confirm"));
    await waitFor(() =>
      expect(mockRandomSources.rename).toHaveBeenCalledWith(
        expect.objectContaining({ id: "table-1" }),
        "Wilderness Encounters v2",
      ),
    );
  });

  it("duplicates a table with a unique copy name", async () => {
    render(SourceWorkspace, {
      props: {
        kind: "table",
        heading: "Random Tables",
        icon: "icon-[lucide--list-tree]",
        emptyBody: "No table open",
        editor: vi.fn(),
        player: vi.fn(),
      } as never,
    });

    const actionBtn = screen.getByTestId("item-actions-table-1");
    await fireEvent.click(actionBtn);

    const duplicateBtn = screen.getByTestId("ctx-duplicate");
    await fireEvent.click(duplicateBtn);

    await waitFor(() =>
      expect(mockRandomSources.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Wilderness Encounters (Copy)",
        }),
      ),
    );
  });
});
