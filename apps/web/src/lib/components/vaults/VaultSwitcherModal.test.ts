/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VaultSwitcherModal from "./VaultSwitcherModal.svelte";
import { vaultRegistry } from "$lib/stores/vault-registry.svelte";

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
  },
}));

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: {
    vaultSwitcherIntent: null,
    openVaultSwitcher: vi.fn(),
  },
}));

describe("VaultSwitcherModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vaultRegistry.availableVaults = [];
    vaultRegistry.activeVaultId = null;
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

  it("keeps the new vault flow in the original selector form", async () => {
    renderModal();

    await fireEvent.click(screen.getByRole("button", { name: /new vault/i }));

    expect(screen.getByLabelText("New Vault Name")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^cancel$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^create$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /import/i })).toBeTruthy();
    expect(screen.queryByTestId("vault-theme-modal")).toBeNull();
    expect(screen.queryByText("World Theme")).toBeNull();
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

  it("closes after importing a new vault without prompting for theme", async () => {
    (window as any).showDirectoryPicker = vi.fn(async () => ({}));
    const { onClose } = renderModal();

    await fireEvent.click(screen.getByRole("button", { name: /new vault/i }));
    await fireEvent.input(screen.getByLabelText("New Vault Name"), {
      target: { value: "Imported Vault" },
    });
    await fireEvent.click(screen.getByRole("button", { name: /import/i }));

    expect(createVaultMock).toHaveBeenCalledWith("Imported Vault");
    expect(importFromFolderMock).toHaveBeenCalled();
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
});
