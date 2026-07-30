/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VaultSwitcherModal from "./VaultSwitcherModal.svelte";
import { vaultRegistry } from "$lib/stores/vault-registry.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

const { createVaultMock, importFromFolderMock, vaultRegistryMock } = vi.hoisted(
  () => ({
    createVaultMock: vi.fn(async () => "vault-1"),
    importFromFolderMock: vi.fn(async () => true),
    vaultRegistryMock: {
      availableVaults: [] as Array<{
        id: string;
        name: string;
        createdAt?: number;
        lastOpenedAt: number;
        entityCount: number;
      }>,
      activeVaultId: null as string | null,
      renameVault: vi.fn(async () => undefined),
      deleteVault: vi.fn(async () => undefined),
    },
  }),
);

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    createVault: createVaultMock,
    importFromFolder: importFromFolderMock,
    switchVault: vi.fn(async () => undefined),
    loadFromFolder: vi.fn(async () => undefined),
    saveToFolder: vi.fn(async () => undefined),
    hasFolderHandle: false,
    isDirty: false,
    status: "idle",
    errorMessage: "",
  },
}));

vi.mock("$lib/stores/vault-registry.svelte", () => ({
  vaultRegistry: vaultRegistryMock,
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: {
    confirm: vi.fn(async () => false),
    notify: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/modal-ui.svelte", async () => {
  const actual = await vi.importActual<
    typeof import("$lib/stores/ui/modal-ui.svelte")
  >("$lib/stores/ui/modal-ui.svelte");
  return { modalUIStore: actual.modalUIStore };
});

describe("VaultSwitcherModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vaultRegistry.availableVaults = [];
    vaultRegistry.activeVaultId = null;
    modalUIStore.vaultSwitcherIntent = null;
    modalUIStore.closeQuickStartModal();
    if (!Element.prototype.animate) {
      Element.prototype.animate = vi.fn(
        () =>
          ({
            finished: Promise.resolve(),
            cancel: vi.fn(),
            play: vi.fn(),
          }) as unknown as Animation,
      );
    }
    document.body.innerHTML = "";
    delete (window as any).showDirectoryPicker;
  });

  const renderModal = () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const onClose = vi.fn();

    render(VaultSwitcherModal, {
      target,
      props: {
        onClose,
      },
    });
    return { onClose };
  };

  it("keeps the new vault flow in the original selector form and prevents footer overflow", async () => {
    renderModal();

    await fireEvent.click(screen.getByRole("button", { name: /new vault/i }));

    const input = screen.getByLabelText("New Vault Name");
    expect(input).toBeTruthy();
    expect(input.className).toContain("min-w-0");
    expect(screen.getByRole("button", { name: /^cancel$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^create$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /import/i })).toBeTruthy();
    expect(screen.queryByTestId("vault-theme-modal")).toBeNull();
    expect(screen.queryByText("World Theme")).toBeNull();

    const createForm = input.closest("form");
    expect(createForm?.className).toContain("flex-col");
    expect(createForm?.className).toContain("sm:flex-row");
  });

  it("prevents the default footer actions from overflowing on narrow screens", () => {
    renderModal();

    const doneButton = screen.getByRole("button", { name: /^done$/i });
    expect(doneButton.className).toContain("shrink-0");
    expect(doneButton.className).toContain("ml-auto");

    const footer = doneButton.parentElement;
    expect(footer?.className).toContain("flex-wrap");

    const actionGroup = screen.getByTestId(
      "empty-workspace-button",
    ).parentElement;
    expect(actionGroup?.className).toContain("flex-wrap");
    expect(actionGroup?.className).toContain("min-w-0");
  });

  it("closes after creating a vault without prompting for theme", async () => {
    const { onClose } = renderModal();

    await fireEvent.click(screen.getByRole("button", { name: /new vault/i }));
    await fireEvent.input(screen.getByLabelText("New Vault Name"), {
      target: { value: "My Vault" },
    });
    await fireEvent.click(screen.getByRole("button", { name: /^create$/i }));

    expect(createVaultMock).toHaveBeenCalledWith("My Vault");
    expect(screen.queryByTestId("vault-theme-modal")).toBeNull();
    expect(onClose).toHaveBeenCalled();
  });

  it("surfaces an error toast instead of silently doing nothing when vault creation fails", async () => {
    const { notificationStore } =
      await import("$lib/stores/ui/notification.svelte");
    createVaultMock.mockRejectedValueOnce(
      new Error("Storage access restricted by browser sandbox"),
    );
    const { onClose } = renderModal();

    await fireEvent.click(screen.getByRole("button", { name: /new vault/i }));
    await fireEvent.input(screen.getByLabelText("New Vault Name"), {
      target: { value: "My Vault" },
    });
    await fireEvent.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() =>
      expect(notificationStore.notify).toHaveBeenCalledWith(
        "Storage access restricted by browser sandbox",
        "error",
        true,
      ),
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes after importing a new vault without prompting for theme", async () => {
    (window as any).showDirectoryPicker = vi.fn(async () => ({}));
    const { onClose } = renderModal();

    await fireEvent.click(screen.getByRole("button", { name: /new vault/i }));
    await fireEvent.input(screen.getByLabelText("New Vault Name"), {
      target: { value: "Imported Vault" },
    });
    await fireEvent.click(screen.getByRole("button", { name: /import/i }));

    await waitFor(() => expect(importFromFolderMock).toHaveBeenCalled());
    expect(createVaultMock).toHaveBeenCalledWith("Imported Vault");
    expect(screen.queryByTestId("vault-theme-modal")).toBeNull();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("does not prompt for theme selection when opened for an old vault", async () => {
    vaultRegistry.availableVaults = [
      {
        id: "old-vault",
        name: "Old Vault",
        lastOpenedAt: Date.now(),
        createdAt: Date.now(),
        entityCount: 0,
      },
    ];
    vaultRegistry.activeVaultId = "old-vault";

    renderModal();

    expect(screen.queryByTestId("vault-theme-modal")).toBeNull();
  });

  it("triggers Quick Start (mounted once, globally) via the shared modalUIStore flag instead of a local duplicate", async () => {
    const { onClose } = renderModal();

    await fireEvent.click(screen.getByTestId("quick-start-world-button"));
    expect(modalUIStore.showQuickStartModal).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes the switcher once Quick Start finishes/cancels", async () => {
    const { onClose } = renderModal();

    modalUIStore.openQuickStartModal();
    await tick();
    expect(onClose).not.toHaveBeenCalled();

    modalUIStore.closeQuickStartModal();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
