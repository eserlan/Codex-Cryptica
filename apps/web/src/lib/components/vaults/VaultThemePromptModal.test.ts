/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VaultThemePromptModal from "./VaultThemePromptModal.svelte";

const vaultThemePromptModalMocks = vi.hoisted(() => ({
  closeVaultThemePromptMock: vi.fn(),
  setThemeMock: vi.fn(async () => undefined),
  markDismissedMock: vi.fn(),
  markAppliedMock: vi.fn(),
}));

vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: {
    setTheme: vaultThemePromptModalMocks.setThemeMock,
  },
}));

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: {
    vaultThemePrompt: { open: true, vaultId: "v1" },
    closeVaultThemePrompt: vaultThemePromptModalMocks.closeVaultThemePromptMock,
  },
}));

vi.mock("$lib/stores/ui/vault-theme-prompt.svelte", () => ({
  vaultThemePromptStore: {
    markDismissed: vaultThemePromptModalMocks.markDismissedMock,
    markApplied: vaultThemePromptModalMocks.markAppliedMock,
  },
}));

describe("VaultThemePromptModal", () => {
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

  it("preselects Workspace and applies the selected theme", async () => {
    render(VaultThemePromptModal);

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

    expect(vaultThemePromptModalMocks.setThemeMock).toHaveBeenCalledWith(
      "fantasy",
    );
    expect(vaultThemePromptModalMocks.markAppliedMock).toHaveBeenCalledWith(
      "v1",
    );
    expect(
      vaultThemePromptModalMocks.closeVaultThemePromptMock,
    ).toHaveBeenCalled();
  });

  it("can be deferred without applying a theme", async () => {
    render(VaultThemePromptModal);

    await fireEvent.click(screen.getByRole("button", { name: /later/i }));

    expect(vaultThemePromptModalMocks.setThemeMock).not.toHaveBeenCalled();
    expect(vaultThemePromptModalMocks.markDismissedMock).toHaveBeenCalledWith(
      "v1",
    );
    expect(
      vaultThemePromptModalMocks.closeVaultThemePromptMock,
    ).toHaveBeenCalled();
  });
});
