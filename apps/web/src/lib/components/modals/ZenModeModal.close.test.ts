/** @vitest-environment jsdom */

import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$app/paths", () => ({ base: "" }));

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));

// Popout-style URL → ZenModeModal treats itself as a standalone entity view.
vi.mock("$app/state", () => ({
  page: { url: { pathname: "/vault/v1/entity/entity-1" } },
}));

// Stub ZenView so we can trigger its onClose (the real one carries heavy deps).
vi.mock("../zen/ZenView.svelte", async () => ({
  default: (await import("./__tests__/ZenViewStub.svelte")).default,
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    activeVaultId: "v1",
    isGuest: false,
    entities: {
      "entity-1": { id: "entity-1", title: "Faerun", content: "Lore." },
    },
    resolveImageUrl: vi.fn().mockResolvedValue(""),
  },
}));

import ZenModeModal from "./ZenModeModal.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
import { notificationStore } from "$lib/stores/ui/notification.svelte";
import { goto } from "$app/navigation";

describe("ZenModeModal close (standalone entity route)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLElement.prototype.animate = vi.fn().mockReturnValue({
      cancel: vi.fn(),
      finished: Promise.resolve(),
      onfinish: null,
      oncancel: null,
      pause: vi.fn(),
      play: vi.fn(),
      reverse: vi.fn(),
    } as unknown as Animation);
    modalUIStore.showZenMode = true;
    modalUIStore.zenModeEntityId = "entity-1";
    modalUIStore.zenModeActiveTab = "overview";
  });

  it("navigates out instead of stranding the user when the tab cannot be closed", async () => {
    // jsdom's window.close() is a no-op and leaves window.closed === false,
    // mirroring a tab reached by normal navigation (e.g. from the Table view)
    // rather than one opened by window.open().
    const closeSpy = vi.spyOn(window, "close").mockImplementation(() => {});
    const backSpy = vi
      .spyOn(window.history, "back")
      .mockImplementation(() => {});
    const confirmSpy = vi
      .spyOn(notificationStore, "confirm")
      .mockResolvedValue(true);

    render(ZenModeModal);
    await fireEvent.click(screen.getByTestId("zen-close"));

    await waitFor(() => expect(confirmSpy).toHaveBeenCalled());
    expect(closeSpy).toHaveBeenCalled();

    await waitFor(() => {
      const navigatedOut =
        (goto as unknown as ReturnType<typeof vi.fn>).mock.calls.length > 0 ||
        backSpy.mock.calls.length > 0;
      expect(navigatedOut).toBe(true);
    });
  });

  it("does nothing when the close confirmation is dismissed", async () => {
    const closeSpy = vi.spyOn(window, "close").mockImplementation(() => {});
    const backSpy = vi
      .spyOn(window.history, "back")
      .mockImplementation(() => {});
    vi.spyOn(notificationStore, "confirm").mockResolvedValue(false);

    render(ZenModeModal);
    await fireEvent.click(screen.getByTestId("zen-close"));

    await new Promise((r) => setTimeout(r, 80));
    expect(closeSpy).not.toHaveBeenCalled();
    expect(backSpy).not.toHaveBeenCalled();
    expect(goto).not.toHaveBeenCalled();
  });
});
