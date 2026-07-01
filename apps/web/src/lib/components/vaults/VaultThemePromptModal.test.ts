/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VaultThemePromptModal from "./VaultThemePromptModal.svelte";

const { closeVaultThemePromptMock, setThemeMock } = vi.hoisted(() => ({
  closeVaultThemePromptMock: vi.fn(),
  setThemeMock: vi.fn(async () => undefined),
}));

vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: {
    setTheme: setThemeMock,
  },
}));

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: {
    closeVaultThemePrompt: closeVaultThemePromptMock,
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

    expect(setThemeMock).toHaveBeenCalledWith("fantasy");
    expect(closeVaultThemePromptMock).toHaveBeenCalled();
  });

  it("can be deferred without applying a theme", async () => {
    render(VaultThemePromptModal);

    await fireEvent.click(screen.getByRole("button", { name: /later/i }));

    expect(setThemeMock).not.toHaveBeenCalled();
    expect(closeVaultThemePromptMock).toHaveBeenCalled();
  });
});
