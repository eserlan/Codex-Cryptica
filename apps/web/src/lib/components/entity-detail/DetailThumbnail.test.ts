/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import DetailThumbnail from "./DetailThumbnail.svelte";
import { vault } from "#lib/stores/vault.svelte.js";
import { modalUIStore } from "#lib/stores/ui/modal-ui.svelte.js";

vi.mock("#lib/stores/vault.svelte.js", () => ({
  vault: {
    isGuest: false,
    defaultVisibility: "visible",
    resolveImageUrl: vi.fn(async (p: string) => `blob:${p}`),
    saveImageToVault: vi.fn(),
    updateEntity: vi.fn(),
  },
}));
vi.mock("#lib/stores/oracle.svelte.js", () => ({
  oracle: { messages: [] },
}));
vi.mock("#lib/stores/debug.svelte.js", () => ({
  debugStore: { error: vi.fn() },
}));
vi.mock("#lib/stores/map-session.svelte.js", () => ({ mapSession: {} }));
vi.mock("#lib/stores/theme.svelte.js", () => ({
  themeStore: { activeTheme: { id: "fantasy" } },
}));
vi.mock("#lib/stores/ui/modal-ui.svelte.js", () => ({
  modalUIStore: { openLightbox: vi.fn() },
}));
vi.mock("#lib/stores/ui/notification.svelte.js", () => ({
  notificationStore: { notify: vi.fn() },
}));
vi.mock("#lib/components/ui/SilhouetteAvatar.svelte", async () => {
  const mod = await import("./MockSilhouette.svelte");
  return { default: mod.default };
});

const withImage = {
  id: "e1",
  title: "Hero",
  type: "character",
  image: "a.png",
};
const noImage = { id: "e2", title: "Blank", type: "character" };

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  (vault as any).isGuest = false;
});

describe("DetailThumbnail", () => {
  it("opens the lightbox with the resolved image when clicked", async () => {
    const { getByRole } = render(DetailThumbnail, { entity: withImage as any });
    const button = getByRole("button", { name: "Enlarge image of Hero" });
    await waitFor(() =>
      expect((button as HTMLButtonElement).disabled).toBe(false),
    );
    await fireEvent.click(button);
    expect(modalUIStore.openLightbox).toHaveBeenCalledWith(
      "blob:a.png",
      "Hero",
      expect.any(Object),
      "a.png",
    );
  });

  it("shows the silhouette and no enlarge button without an image", () => {
    const { queryByRole, getByTestId } = render(DetailThumbnail, {
      entity: noImage as any,
    });
    expect(queryByRole("button")).toBeNull();
    expect(getByTestId("silhouette")).toBeTruthy();
  });

  it("shows the silhouette to a guest when the entity is hidden", () => {
    (vault as any).isGuest = true;
    const { queryByRole, getByTestId } = render(DetailThumbnail, {
      entity: { ...withImage, labels: ["hidden"] } as any,
    });
    expect(queryByRole("button")).toBeNull();
    expect(getByTestId("silhouette")).toBeTruthy();
  });

  it("ignores a dropped non-image file", async () => {
    const { getByTestId } = render(DetailThumbnail, {
      entity: withImage as any,
    });
    const file = new File(["x"], "n.txt", { type: "text/plain" });
    await fireEvent.drop(getByTestId("detail-thumbnail"), {
      dataTransfer: { files: [file], types: ["Files"], getData: () => "" },
    });
    expect(vault.updateEntity).not.toHaveBeenCalled();
    expect(vault.saveImageToVault).not.toHaveBeenCalled();
  });

  it("ignores a dropped image while editing, so Save cannot overwrite it", async () => {
    const { getByTestId } = render(DetailThumbnail, {
      entity: withImage as any,
      isEditing: true,
    });
    const file = new File(["x"], "a.png", { type: "image/png" });
    await fireEvent.drop(getByTestId("detail-thumbnail"), {
      dataTransfer: { files: [file], types: ["Files"], getData: () => "" },
    });
    expect(vault.saveImageToVault).not.toHaveBeenCalled();
    expect(vault.updateEntity).not.toHaveBeenCalled();
  });
});
