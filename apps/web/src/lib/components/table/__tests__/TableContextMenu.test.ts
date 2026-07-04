/** @vitest-environment jsdom */

import { render, fireEvent, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import TableContextMenu from "../TableContextMenu.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

describe("TableContextMenu", () => {
  afterEach(() => {
    sessionModeStore.isGuestMode = false;
    vi.restoreAllMocks();
  });

  const defaultProps = {
    x: 100,
    y: 200,
    selectedIds: ["e1"],
    onManageLabels: vi.fn(),
    onChangeType: vi.fn(),
    onDelete: vi.fn(),
    onClose: vi.fn(),
  };

  it("renders basic context menu options", () => {
    render(TableContextMenu, { props: defaultProps });

    expect(screen.getByTestId("entity-table-context-menu")).toBeTruthy();
    expect(screen.getByText("Manage Labels")).toBeTruthy();
    expect(screen.getByText("Change Type")).toBeTruthy();
    expect(screen.getByText("Delete Entity")).toBeTruthy();
  });

  it("renders plural target counts on delete button", () => {
    render(TableContextMenu, {
      props: {
        ...defaultProps,
        selectedIds: ["e1", "e2", "e3"],
      },
    });

    expect(screen.getByText("Delete 3 Selected")).toBeTruthy();
  });

  it("triggers callbacks on action clicks", async () => {
    const onManageLabels = vi.fn();
    const onDelete = vi.fn();
    render(TableContextMenu, {
      props: {
        ...defaultProps,
        onManageLabels,
        onDelete,
      },
    });

    await fireEvent.click(screen.getByText("Manage Labels"));
    expect(onManageLabels).toHaveBeenCalledTimes(1);

    await fireEvent.click(screen.getByText("Delete Entity"));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("disables actions in guest mode", () => {
    sessionModeStore.isGuestMode = true;
    render(TableContextMenu, { props: defaultProps });

    expect(screen.getByText("Read-Only Guest Session")).toBeTruthy();

    const manageBtn = screen.getByTestId(
      "context-menu-add-label",
    ) as HTMLButtonElement;
    const typeBtn = screen.getByTestId(
      "context-menu-change-type",
    ) as HTMLButtonElement;
    const deleteBtn = screen.getByTestId(
      "context-menu-delete",
    ) as HTMLButtonElement;

    expect(manageBtn.disabled).toBe(true);
    expect(typeBtn.disabled).toBe(true);
    expect(deleteBtn.disabled).toBe(true);
  });
});
