import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { RandomSource } from "random-source-engine";
import SourceWorkspaceContent from "./SourceWorkspaceContent.svelte";

const draft: RandomSource = {
  id: "table",
  kind: "table",
  name: "Forest",
  labels: [],
  entries: [],
};
function props() {
  return {
    noun: "table" as const,
    mode: "build" as const,
    importing: false,
    exporting: false,
    exportFormat: "codex" as const,
    diagnostics: [],
    icon: "icon-[lucide--dices]",
    emptyBody: "Choose a table",
    editor: vi.fn(),
    player: vi.fn(),
    completeImport: vi.fn(),
    cancelImport: vi.fn(),
    closeExport: vi.fn(),
    openRenameModal: vi.fn(),
    duplicate: vi.fn(),
    openDeleteModal: vi.fn(),
    setMode: vi.fn(),
    confirmDelete: vi.fn(),
    cancelDelete: vi.fn(),
    commitRename: vi.fn(),
    cancelRename: vi.fn(),
    onChange: vi.fn(),
    requestRename: vi.fn(),
    create: vi.fn(),
  };
}

describe("workspace content pane", () => {
  it("offers creation when empty and renders the selected mode's snippet", async () => {
    const callbacks = props();
    const { rerender } = render(SourceWorkspaceContent, callbacks);
    await fireEvent.click(screen.getByTestId("empty-new-table"));
    expect(callbacks.create).toHaveBeenCalledOnce();
    expect(callbacks.editor).not.toHaveBeenCalled();
    await rerender({ ...callbacks, draft });
    expect(callbacks.editor).toHaveBeenCalled();
    expect(callbacks.player).not.toHaveBeenCalled();
    await rerender({ ...callbacks, draft, mode: "use" });
    expect(callbacks.player).toHaveBeenCalled();
  });

  it("routes impact confirmations and cancellations to the workspace", async () => {
    const callbacks = props();
    render(SourceWorkspaceContent, {
      ...callbacks,
      draft,
      deleteImpact: [draft],
      pendingRename: { name: "Woods", referencedBy: [draft] },
    });
    expect(screen.getByTestId("delete-impact").textContent).toContain(
      "leaves those references unresolved",
    );
    await fireEvent.click(screen.getByRole("button", { name: "Keep it" }));
    await fireEvent.click(
      screen.getByRole("button", { name: "Keep the name" }),
    );
    expect(callbacks.cancelDelete).toHaveBeenCalledOnce();
    expect(callbacks.cancelRename).toHaveBeenCalledOnce();
    await fireEvent.click(screen.getByTestId("confirm-delete"));
    await fireEvent.click(screen.getByTestId("confirm-rename"));
    expect(callbacks.confirmDelete).toHaveBeenCalledWith(draft);
    expect(callbacks.commitRename).toHaveBeenCalledWith("Woods");
  });

  it("prioritises export over import when a source is open", () => {
    render(SourceWorkspaceContent, {
      ...props(),
      draft,
      importing: true,
      exporting: true,
    });
    expect(screen.getByTestId("export-dialog")).toBeDefined();
    expect(screen.queryByTestId("header-rename-table")).toBeNull();
  });
});
