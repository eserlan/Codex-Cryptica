/** @vitest-environment jsdom */

import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$app/paths", () => ({ base: "" }));

vi.mock("$app/navigation", () => ({ goto: vi.fn(), beforeNavigate: vi.fn() }));

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

  it("closes immediately without a confirmation prompt", async () => {
    // jsdom's window.close() is a no-op and leaves window.closed === false,
    // mirroring a tab reached by normal navigation (e.g. from the Table view)
    // rather than one opened by window.open().
    const closeSpy = vi.spyOn(window, "close").mockImplementation(() => {});

    render(ZenModeModal);
    await fireEvent.click(screen.getByTestId("zen-close"));

    // No "Close tab?" dialog — close is attempted straight away.
    expect(closeSpy).toHaveBeenCalled();

    // Falls back to navigating into the app when the tab cannot be closed, so
    // the user is never stranded on the blank standalone entity backdrop.
    await waitFor(() => {
      expect(goto as unknown as ReturnType<typeof vi.fn>).toHaveBeenCalled();
    });
  });
});
