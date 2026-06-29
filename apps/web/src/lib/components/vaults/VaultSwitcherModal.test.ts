/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VaultSwitcherModal from "./VaultSwitcherModal.svelte";

const { createVaultMock, setThemeMock } = vi.hoisted(() => ({
  createVaultMock: vi.fn(async () => "vault-1"),
  setThemeMock: vi.fn(async () => undefined),
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
  vaultRegistry: {
    availableVaults: [],
    activeVaultId: null,
    renameVault: vi.fn(async () => undefined),
    deleteVault: vi.fn(async () => undefined),
  },
}));

vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: {
    currentThemeId: "workspace",
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

  it("preselects Workspace when opening the create flow", async () => {
    renderModal();

    await fireEvent.click(screen.getByRole("button", { name: /new vault/i }));

    expect(
      screen
        .getByRole("button", { name: /workspace/i })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("persists the selected theme after creating a vault", async () => {
    renderModal();

    await fireEvent.click(screen.getByRole("button", { name: /new vault/i }));
    await fireEvent.click(
      screen.getByRole("button", { name: /ancient parchment/i }),
    );
    await fireEvent.input(screen.getByLabelText("New Vault Name"), {
      target: { value: "My Vault" },
    });
    await fireEvent.click(screen.getByRole("button", { name: /^create$/i }));

    expect(createVaultMock).toHaveBeenCalledWith("My Vault");
    expect(setThemeMock).toHaveBeenCalledWith("fantasy");
  });

  it("creates safely with the default Workspace theme untouched", async () => {
    renderModal();

    await fireEvent.click(screen.getByRole("button", { name: /new vault/i }));
    await fireEvent.input(screen.getByLabelText("New Vault Name"), {
      target: { value: "Default Vault" },
    });
    await fireEvent.click(screen.getByRole("button", { name: /^create$/i }));

    expect(createVaultMock).toHaveBeenCalledWith("Default Vault");
    expect(setThemeMock).toHaveBeenCalledWith("workspace");
  });
});
