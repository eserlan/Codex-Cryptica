import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { RandomSource } from "random-source-engine";
import SourceWorkspaceNotices from "./SourceWorkspaceNotices.svelte";

const source: RandomSource = {
  id: "table",
  kind: "table",
  name: "Forest",
  labels: [],
  entries: [],
};
const callbacks = () => ({
  onDelete: vi.fn(),
  onRename: vi.fn(),
  onCancelDelete: vi.fn(),
  onCancelRename: vi.fn(),
});

describe("workspace reference notices", () => {
  it("renders nothing without a pending action", () => {
    render(SourceWorkspaceNotices, { source, ...callbacks() });
    expect(screen.queryByTestId("delete-impact")).toBeNull();
    expect(screen.queryByTestId("rename-impact")).toBeNull();
  });

  it("supports deleting an unreferenced source and cancelling the warning", async () => {
    const actions = callbacks();
    render(SourceWorkspaceNotices, { source, deleteImpact: [], ...actions });
    expect(screen.getByTestId("delete-impact").textContent).toContain(
      'Delete "Forest"?',
    );
    await fireEvent.click(screen.getByTestId("confirm-delete"));
    await fireEvent.click(screen.getByText("Keep it"));
    expect(actions.onDelete).toHaveBeenCalledWith(source);
    expect(actions.onCancelDelete).toHaveBeenCalledOnce();
  });

  it("names broken references before confirming or cancelling a rename", async () => {
    const actions = callbacks();
    render(SourceWorkspaceNotices, {
      source,
      pendingRename: {
        name: "Woods",
        referencedBy: [{ ...source, name: "Travel" }],
      },
      ...actions,
    });
    expect(screen.getByTestId("rename-impact").textContent).toMatch(
      /Travel\s+refers/,
    );
    await fireEvent.click(screen.getByTestId("confirm-rename"));
    await fireEvent.click(screen.getByText("Keep the name"));
    expect(actions.onRename).toHaveBeenCalledWith("Woods");
    expect(actions.onCancelRename).toHaveBeenCalledOnce();
  });
});
