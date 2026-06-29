/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VaultSwitcherModal from "./VaultSwitcherModal.svelte";
import { vaultRegistry } from "$lib/stores/vault-registry.svelte";

const {
  createVaultMock,
  hasSavedThemeForVaultMock,
  setThemeMock,
  vaultRegistryMock,
} = vi.hoisted(() => ({
  createVaultMock: vi.fn(async () => "vault-1"),
  hasSavedThemeForVaultMock: vi.fn(async () => true),
  setThemeMock: vi.fn(async () => undefined),
  vaultRegistryMock: {
    availableVaults: [] as Array<{
      id: string;
      name: string;
      lastOpenedAt: number;
      entityCount: number;
    }>,
    activeVaultId: null as string | null,
    renameVault: vi.fn(async () => undefined),
    deleteVault: vi.fn(async () => undefined),
  },
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    createVault: createVaultMock,
    importFromFolder: vi.fn(async () => true),
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

vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: {
    currentThemeId: "workspace",
    hasSavedThemeForVault: hasSavedThemeForVaultMock,
    setTheme: setThemeMock,
    previewTheme: vi.fn(),
  },
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
    hasSavedThemeForVaultMock.mockResolvedValue(true);
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
    delete (window as Window & { showDirectoryPicker?: unknown })
      .showDirectoryPicker;
  });

  const renderModal = () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    return render(VaultSwitcherModal, {
      target,
      props: {
        onClose: vi.fn(),
      },
    });
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

  it("opens separate theme selection after creating a vault", async () => {
    renderModal();

    await fireEvent.click(screen.getByRole("button", { name: /new vault/i }));
    await fireEvent.input(screen.getByLabelText("New Vault Name"), {
      target: { value: "My Vault" },
    });
    await fireEvent.click(screen.getByRole("button", { name: /^create$/i }));

    expect(createVaultMock).toHaveBeenCalledWith("My Vault");
    expect(setThemeMock).not.toHaveBeenCalled();

    expect(screen.getByTestId("vault-theme-modal")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: /workspace/i })
        .getAttribute("aria-pressed"),
    ).toBe("true");

    await fireEvent.click(
      screen.getByRole("button", { name: /ancient parchment/i }),
    );
    await fireEvent.click(screen.getByRole("button", { name: /use theme/i }));

    expect(setThemeMock).toHaveBeenCalledWith("fantasy");
  });

  it("applies the default Workspace theme from the separate selector", async () => {
    renderModal();

    await fireEvent.click(screen.getByRole("button", { name: /new vault/i }));
    await fireEvent.input(screen.getByLabelText("New Vault Name"), {
      target: { value: "Default Vault" },
    });
    await fireEvent.click(screen.getByRole("button", { name: /^create$/i }));

    expect(createVaultMock).toHaveBeenCalledWith("Default Vault");
    await fireEvent.click(screen.getByRole("button", { name: /use theme/i }));

    expect(setThemeMock).toHaveBeenCalledWith("workspace");
  });

  it("opens separate theme selection after importing a new vault without a saved theme", async () => {
    (window as Window & { showDirectoryPicker?: () => Promise<unknown> })
      .showDirectoryPicker = vi.fn(async () => ({}));
    hasSavedThemeForVaultMock.mockResolvedValue(false);
    renderModal();

    await fireEvent.click(screen.getByRole("button", { name: /new vault/i }));
    await fireEvent.input(screen.getByLabelText("New Vault Name"), {
      target: { value: "Imported Vault" },
    });
    await fireEvent.click(screen.getByRole("button", { name: /import/i }));

    await waitFor(() =>
      expect(screen.getByTestId("vault-theme-modal")).toBeTruthy(),
    );

    expect(createVaultMock).toHaveBeenCalledWith("Imported Vault");
    expect(hasSavedThemeForVaultMock).toHaveBeenCalledWith("vault-1");
    expect(setThemeMock).not.toHaveBeenCalled();
  });

  it("prompts for theme selection when the active vault has no saved theme", async () => {
    vaultRegistry.availableVaults = [
      {
        id: "old-vault",
        name: "Old Vault",
        lastOpenedAt: Date.now(),
        entityCount: 0,
      },
    ];
    vaultRegistry.activeVaultId = "old-vault";
    hasSavedThemeForVaultMock.mockResolvedValue(false);

    renderModal();

    await waitFor(() =>
      expect(screen.getByTestId("vault-theme-modal")).toBeTruthy(),
    );

    await fireEvent.click(screen.getByRole("button", { name: /use theme/i }));

    expect(hasSavedThemeForVaultMock).toHaveBeenCalledWith("old-vault");
    expect(setThemeMock).toHaveBeenCalledWith("workspace");
  });
});
