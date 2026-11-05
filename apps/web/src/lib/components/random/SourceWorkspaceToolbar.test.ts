import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import SourceWorkspaceToolbar from "./SourceWorkspaceToolbar.svelte";

describe("workspace toolbar", () => {
  it.each(["use", "build"] as const)(
    "dispatches actions in %s mode",
    async (mode) => {
      const onRename = vi.fn(),
        onDuplicate = vi.fn(),
        onDelete = vi.fn(),
        onMode = vi.fn();
      render(SourceWorkspaceToolbar, {
        noun: "table",
        mode,
        onRename,
        onDuplicate,
        onDelete,
        onMode,
      });
      await fireEvent.click(screen.getByTestId("header-rename-table"));
      await fireEvent.click(screen.getByTestId("header-duplicate-table"));
      await fireEvent.click(
        screen.getByTestId(
          mode === "use" ? "header-delete-table" : "delete-table",
        ),
      );
      await fireEvent.click(
        screen.getByTestId(
          mode === "use" ? "header-edit-table" : "header-use-table",
        ),
      );
      expect(onRename).toHaveBeenCalledOnce();
      expect(onDuplicate).toHaveBeenCalledOnce();
      expect(onDelete).toHaveBeenCalledOnce();
      expect(onMode).toHaveBeenCalledWith(mode === "use" ? "build" : "use");
      expect(
        screen.queryByTestId(
          mode === "use" ? "header-use-table" : "header-edit-table",
        ),
      ).toBeNull();
    },
  );
});
