import { describe, expect, it, vi } from "vitest";
import { saveEntityImageFile } from "./entity-image-file.js";

vi.mock("#lib/stores/vault.svelte.js", () => ({ vault: {} }));
vi.mock("#lib/stores/ui/notification.svelte.js", () => ({
  notificationStore: { notify: vi.fn() },
}));
vi.mock("#lib/stores/map-session.svelte.js", () => ({ mapSession: {} }));
vi.mock("#lib/stores/debug.svelte.js", () => ({
  debugStore: { error: vi.fn() },
}));

const makeDeps = () => ({
  saveImageToVault: vi.fn(async () => ({ image: "img/a.png", thumbnail: "t" })),
  updateEntity: vi.fn(async () => undefined),
  notify: vi.fn(),
});

describe("saveEntityImageFile", () => {
  it("saves an image and sets it on the entity", async () => {
    const deps = makeDeps();
    const file = new File(["x"], "a.png", { type: "image/png" });
    const result = await saveEntityImageFile("e1", file, deps);
    expect(result).toEqual({ ok: true, image: "img/a.png" });
    expect(deps.saveImageToVault).toHaveBeenCalledWith(file, "e1");
    expect(deps.updateEntity).toHaveBeenCalledWith("e1", {
      image: "img/a.png",
      thumbnail: "t",
    });
  });

  it("rejects a non-image without touching the entity", async () => {
    const deps = makeDeps();
    const file = new File(["x"], "a.txt", { type: "text/plain" });
    const result = await saveEntityImageFile("e1", file, deps);
    expect(result).toEqual({
      ok: false,
      error: "Choose an image file to upload.",
    });
    expect(deps.notify).toHaveBeenCalledWith(
      "Choose an image file to upload.",
      "error",
    );
    expect(deps.updateEntity).not.toHaveBeenCalled();
  });

  it("reports a failed save", async () => {
    const deps = makeDeps();
    deps.saveImageToVault.mockRejectedValue(new Error("disk full"));
    const file = new File(["x"], "a.png", { type: "image/png" });
    const result = await saveEntityImageFile("e1", file, deps);
    expect(result).toEqual({
      ok: false,
      error: "Failed to save image. Please try again.",
    });
    expect(deps.updateEntity).not.toHaveBeenCalled();
  });
});
