import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RandomSource } from "random-source-engine";
import SourceWorkspaceList from "./SourceWorkspaceList.svelte";

const all: RandomSource[] = [
  {
    id: "forest",
    kind: "table",
    name: "Forest",
    labels: ["travel"],
    entries: [{ id: "entry", text: "Wolf", weight: 1 }],
  },
  {
    id: "dungeon",
    kind: "table",
    name: "Dungeon",
    labels: ["underground"],
    entries: [],
  },
];
function props() {
  return {
    kind: "table" as const,
    all,
    listOpen: true,
    allowImport: true,
    onCreate: vi.fn(),
    onGenerate: vi.fn(),
    onImport: vi.fn(),
    onExport: vi.fn(),
    onSelect: vi.fn(),
    onContextMenu: vi.fn(),
  };
}
afterEach(() => vi.useRealTimers());

describe("workspace source browser", () => {
  it("combines search and label filters and restores the list when cleared", async () => {
    const callbacks = props();
    render(SourceWorkspaceList, callbacks);
    await fireEvent.click(screen.getByRole("button", { name: "travel" }));
    expect(screen.getAllByTestId("table-list-item")).toHaveLength(1);
    await fireEvent.input(screen.getByTestId("table-search"), {
      target: { value: "Dungeon" },
    });
    expect(screen.queryByTestId("table-list-item")).toBeNull();
    await fireEvent.click(screen.getByRole("button", { name: "travel" }));
    await fireEvent.click(screen.getByTestId("table-list-item"));
    expect(callbacks.onSelect).toHaveBeenCalledWith(all[1]);
    await fireEvent.input(screen.getByTestId("table-search"), {
      target: { value: "" },
    });
    expect(screen.getAllByTestId("table-list-item")).toHaveLength(2);
  });

  it("disables export without a draft and forwards available actions", async () => {
    const callbacks = props();
    const { rerender } = render(SourceWorkspaceList, callbacks);
    expect(
      (screen.getByTestId("open-export") as HTMLButtonElement).disabled,
    ).toBe(true);
    await fireEvent.click(screen.getByTestId("new-table"));
    await fireEvent.click(screen.getByTestId("generate-table-btn"));
    await fireEvent.click(screen.getByTestId("open-import"));
    expect(callbacks.onCreate).toHaveBeenCalledOnce();
    expect(callbacks.onGenerate).toHaveBeenCalledOnce();
    expect(callbacks.onImport).toHaveBeenCalledOnce();
    await rerender({ ...callbacks, draft: all[0] });
    await fireEvent.click(screen.getByTestId("open-export"));
    expect(callbacks.onExport).toHaveBeenCalledOnce();
  });

  it("opens the menu on long press and consumes its synthetic selection click", async () => {
    vi.useFakeTimers();
    const callbacks = props();
    render(SourceWorkspaceList, callbacks);
    const button = screen.getByText("Forest").closest("button")!;
    await fireEvent.touchStart(button.closest("li")!, {
      touches: [{ clientX: 40, clientY: 60 }],
    });
    await vi.advanceTimersByTimeAsync(500);
    expect(callbacks.onContextMenu).toHaveBeenCalledWith(all[0], 40, 60);
    await fireEvent.touchEnd(button.closest("li")!);
    await fireEvent.click(button);
    expect(callbacks.onSelect).not.toHaveBeenCalled();
  });

  it("cancels a moving touch and hides unavailable deck actions", async () => {
    vi.useFakeTimers();
    const callbacks = props();
    render(SourceWorkspaceList, {
      ...callbacks,
      kind: "deck",
      allowImport: false,
    });
    const item = screen.getAllByTestId("deck-list-item")[0].closest("li")!;
    await fireEvent.touchStart(item, {
      touches: [{ clientX: 40, clientY: 60 }],
    });
    await fireEvent.touchMove(item, {
      touches: [{ clientX: 100, clientY: 60 }],
    });
    await vi.advanceTimersByTimeAsync(500);
    expect(callbacks.onContextMenu).not.toHaveBeenCalled();
    expect(screen.queryByTestId("generate-table-btn")).toBeNull();
    expect(screen.queryByTestId("open-import")).toBeNull();
  });
});
