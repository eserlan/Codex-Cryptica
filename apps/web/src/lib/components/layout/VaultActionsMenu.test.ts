/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VaultActionsMenu from "./VaultActionsMenu.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
import { openImportWindow } from "$lib/stores/ui/navigation";

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: { openSettings: vi.fn(), openShare: vi.fn() },
}));
vi.mock("$lib/stores/ui/navigation", () => ({ openImportWindow: vi.fn() }));

describe("VaultActionsMenu", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps import, export backup, and sharing discoverable by label", async () => {
    render(VaultActionsMenu);
    await fireEvent.click(screen.getByTestId("vault-actions-menu-button"));
    await fireEvent.click(
      screen.getByRole("menuitem", { name: /import data/i }),
    );
    expect(openImportWindow).toHaveBeenCalledOnce();

    await fireEvent.click(screen.getByTestId("vault-actions-menu-button"));
    await fireEvent.click(
      screen.getByRole("menuitem", { name: /export backup/i }),
    );
    expect(modalUIStore.openSettings).toHaveBeenCalledWith("vault");

    await fireEvent.click(screen.getByTestId("vault-actions-menu-button"));
    await fireEvent.click(
      screen.getByRole("menuitem", { name: /share campaign/i }),
    );
    expect(modalUIStore.openShare).toHaveBeenCalledOnce();
  });

  it("opens with ArrowDown and returns focus to the trigger on Escape", async () => {
    render(VaultActionsMenu);
    const trigger = screen.getByTestId("vault-actions-menu-button");
    trigger.focus();
    await fireEvent.keyDown(trigger, { key: "ArrowDown" });
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("menuitem", { name: /import data/i }),
      ),
    );
    await fireEvent.keyDown(screen.getByTestId("vault-actions-menu"), {
      key: "Escape",
    });
    await waitFor(() => {
      expect(screen.queryByTestId("vault-actions-menu")).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });

  it("uses full-width touch targets in a vertical drawer", async () => {
    render(VaultActionsMenu, { orientation: "vertical" });
    const trigger = screen.getByTestId("vault-actions-menu-button");

    expect(trigger.className).toContain("w-full");
    await fireEvent.click(trigger);

    expect(screen.getByTestId("vault-actions-menu").className).toContain(
      "left-0",
    );
    expect(screen.getByTestId("vault-actions-menu").className).toContain(
      "w-full",
    );
  });
});
