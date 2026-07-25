/** @vitest-environment jsdom */
import { render, fireEvent, waitFor } from "@testing-library/svelte";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ImagePromptReviewModal from "./ImagePromptReviewModal.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
import { oracle } from "$lib/stores/oracle.svelte";
import { vault } from "$lib/stores/vault.svelte";

vi.mock("$lib/stores/oracle.svelte", () => ({
  oracle: {
    regenerateEntityPrompt: vi.fn(),
    regenerateMessagePrompt: vi.fn(),
    isVisualizingEntity: () => false,
    isVisualizingMessage: () => false,
  },
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    isGuest: false,
    addLabel: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: { notify: vi.fn() },
}));

const openDialog = () =>
  modalUIStore.openImagePromptReview(
    { kind: "entity", id: "entity-1", title: "Entity One" },
    "a tall figure in flowing garments",
    ["watermark"],
  );

const openAndRevise = async () => {
  // Opened before render: the dialog body only exists while it is open.
  openDialog();
  const utils = render(ImagePromptReviewModal);
  await fireEvent.click(await utils.findByText(/advanced art direction/i));
  await fireEvent.click(await utils.findByText(/revise prompt/i));
  return utils;
};

describe("ImagePromptReviewModal stature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom has no Web Animations API; Svelte transitions need one.
    HTMLElement.prototype.animate = vi.fn().mockReturnValue({
      cancel: vi.fn(),
      finished: Promise.resolve(),
      onfinish: null,
      oncancel: null,
      pause: vi.fn(),
      play: vi.fn(),
      reverse: vi.fn(),
    } as unknown as Animation);
    (vault as any).isGuest = false;
    modalUIStore.closeImagePromptReview();
  });

  it("offers to keep a stature the Oracle read from the lore", async () => {
    (oracle.regenerateEntityPrompt as any).mockResolvedValue({
      prompt: "revised",
      negativeTerms: [],
      statureId: "divine",
      statureSource: "inferred",
    });

    const { getByTestId } = await openAndRevise();

    await waitFor(() => {
      expect(
        getByTestId("image-prompt-resolved-stature").textContent,
      ).toContain("Divine");
      expect(getByTestId("image-prompt-pin-stature")).toBeTruthy();
    });

    await fireEvent.click(getByTestId("image-prompt-pin-stature"));

    await waitFor(() => {
      expect(vault.addLabel).toHaveBeenCalledWith("entity-1", "divine");
    });
  });

  it("does not offer to pin a stature that is already a label", async () => {
    // Nothing to fix: it is already the user's, stable, and on the entity.
    (oracle.regenerateEntityPrompt as any).mockResolvedValue({
      prompt: "revised",
      negativeTerms: [],
      statureId: "divine",
      statureSource: "labels",
    });

    const { getByTestId, queryByTestId } = await openAndRevise();

    await waitFor(() => {
      expect(getByTestId("image-prompt-resolved-stature")).toBeTruthy();
    });
    expect(queryByTestId("image-prompt-pin-stature")).toBeNull();
  });

  it("never writes to a vault the viewer does not own", async () => {
    (vault as any).isGuest = true;
    (oracle.regenerateEntityPrompt as any).mockResolvedValue({
      prompt: "revised",
      negativeTerms: [],
      statureId: "divine",
      statureSource: "inferred",
    });

    const { getByTestId, queryByTestId } = await openAndRevise();

    await waitFor(() => {
      expect(getByTestId("image-prompt-resolved-stature")).toBeTruthy();
    });
    expect(queryByTestId("image-prompt-pin-stature")).toBeNull();
  });
});
