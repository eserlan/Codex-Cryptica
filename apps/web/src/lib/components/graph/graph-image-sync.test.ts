import { describe, expect, it, vi } from "vitest";
import { categories } from "#lib/stores/categories.svelte.js";
import { PIRATE_DARK } from "schema";
import type { GraphImageManager } from "graph-engine";
import { syncGraphImages, releaseGraphImages } from "./graph-image-sync";

describe("syncGraphImages", () => {
  it("configures image sync from graph, theme, and vault state", () => {
    const sync = vi.fn();
    const resolveThumbnailUrl = vi.fn((path: string) => `thumb:${path}`);
    const releaseThumbnailUrl = vi.fn();
    const debugStore = { log: vi.fn(), error: vi.fn() };

    syncGraphImages({
      imageManager: { sync } as unknown as GraphImageManager,
      graph: { showImages: true, perfStylingActive: true } as never,
      vault: { resolveThumbnailUrl, releaseThumbnailUrl } as never,
      debugStore,
      activeTheme: PIRATE_DARK,
      categoryList: categories.list,
    });

    const options = sync.mock.calls[0][0];
    expect(options.showImages).toBe(false);
    expect(options.silhouetteVariant).toBe(
      JSON.stringify([
        PIRATE_DARK.id,
        categories.list.map(({ id, color }) => [id, color]),
      ]),
    );
    expect(options.resolveImageUrl("portrait.png")).toBe("thumb:portrait.png");
    options.releaseImageUrl("portrait.png");
    expect(resolveThumbnailUrl).toHaveBeenCalledWith("portrait.png");
    expect(releaseThumbnailUrl).toHaveBeenCalledWith("portrait.png");
  });

  it("forwards incremental image failures to the debug store", () => {
    const sync = vi.fn();
    const debugStore = { log: vi.fn(), error: vi.fn() };
    const error = new Error("image resolution failed");

    syncGraphImages({
      imageManager: { sync } as unknown as GraphImageManager,
      graph: { showImages: true, perfStylingActive: false } as never,
      vault: {
        resolveThumbnailUrl: vi.fn(),
        releaseThumbnailUrl: vi.fn(),
      } as never,
      debugStore,
      activeTheme: PIRATE_DARK,
      categoryList: categories.list,
    });

    sync.mock.calls[0][0].onError(error);
    expect(debugStore.error).toHaveBeenCalledWith(
      "Incremental image resolution failed",
      error,
    );
  });
});

describe("releaseGraphImages", () => {
  it("releases thumbnail references through the vault", () => {
    const destroy = vi.fn();
    const releaseThumbnailUrl = vi.fn();
    releaseGraphImages({ destroy } as unknown as GraphImageManager, {
      releaseThumbnailUrl,
    });
    destroy.mock.calls[0][0].releaseImageUrl("portrait.png");
    expect(releaseThumbnailUrl).toHaveBeenCalledWith("portrait.png");
  });

  it("does nothing before an image manager exists", () => {
    const releaseThumbnailUrl = vi.fn();
    releaseGraphImages(undefined, { releaseThumbnailUrl });
    expect(releaseThumbnailUrl).not.toHaveBeenCalled();
  });
});
