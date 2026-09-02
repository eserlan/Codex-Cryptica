/** @vitest-environment jsdom */
import { render, fireEvent } from "@testing-library/svelte";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SilhouettePickerModal from "./SilhouettePickerModal.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
import { vault } from "$lib/stores/vault.svelte";

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    updateEntity: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: {
    showNotification: vi.fn(),
    notify: vi.fn(),
  },
}));

describe("SilhouettePickerModal", () => {
  const mockEntity = {
    id: "entity-vampire-1",
    type: "character",
    title: "Lady Carmilla",
    labels: ["vampire"],
    connections: [],
    content: "An ancient vampire",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    modalUIStore.closeSilhouettePicker();
  });

  it("renders when opened and shows entity title", async () => {
    modalUIStore.openSilhouettePicker(mockEntity as any);
    const { findByText, getByPlaceholderText } = render(SilhouettePickerModal);

    expect(await findByText("Choose Entity Silhouette")).toBeTruthy();
    expect(await findByText("Lady Carmilla")).toBeTruthy();
    expect(getByPlaceholderText(/search/i)).toBeTruthy();
  });

  it("filters silhouettes when searching query", async () => {
    modalUIStore.openSilhouettePicker(mockEntity as any);
    const { getByPlaceholderText, queryByText, findByText } = render(
      SilhouettePickerModal,
    );

    const input = getByPlaceholderText(/search/i);
    await fireEvent.input(input, { target: { value: "alien" } });

    expect(await findByText("Alien Scientist")).toBeTruthy();
    expect(queryByText("Vampire Lord (M)")).toBeNull();
  });

  it("calls vault.updateEntity with chosen silhouette when applying", async () => {
    modalUIStore.openSilhouettePicker(mockEntity as any);
    const { getByText, findByText } = render(SilhouettePickerModal);

    // Click Alien Scientist card
    const alienCard = await findByText("Alien Scientist");
    await fireEvent.click(alienCard);

    // Click Apply button
    const applyBtn = getByText("Apply Silhouette");
    await fireEvent.click(applyBtn);

    expect(vault.updateEntity).toHaveBeenCalledWith("entity-vampire-1", {
      silhouette: "scifi-scientist-alien",
    });
    expect(modalUIStore.silhouettePickerState.open).toBe(false);
  });

  it("updates live preview panel on silhouette hover", async () => {
    modalUIStore.openSilhouettePicker(mockEntity as any);
    const { findAllByText, findByText } = render(SilhouettePickerModal);

    expect(await findByText("Active Selection")).toBeTruthy();

    // Hover over a different card (e.g. Fantasy Village)
    const villageTexts = await findAllByText("Fantasy Village");
    const villageBtn = villageTexts[0].closest("button");
    expect(villageBtn).toBeTruthy();
    await fireEvent.mouseEnter(villageBtn!);

    // Preview panel shows "Hover Preview"
    expect(await findByText("Hover Preview")).toBeTruthy();
  });
});
