import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  DeadExternalImagePruner,
  type DeadExternalImagePrunerDependencies,
} from "./dead-external-image-pruner";
import type { LocalEntity } from "./types";

describe("DeadExternalImagePruner", () => {
  let mockEntities: Record<string, LocalEntity>;
  let updateEntities: ReturnType<
    typeof vi.fn<
      (updates: Record<string, Partial<LocalEntity>>) => Promise<boolean>
    >
  >;
  let isWritable: ReturnType<typeof vi.fn<() => boolean>>;
  let pruner: DeadExternalImagePruner;

  beforeEach(() => {
    vi.useFakeTimers();
    mockEntities = {
      e1: {
        id: "e1",
        title: "Entity One",
        type: "concept",
        image: "https://example.com/dead.png",
        thumbnail: "https://example.com/dead_thumb.png",
        imageFocus: "center",
        imageArtDirection: "dark fantasy",
        createdAt: 100,
        updatedAt: 100,
        modifiedAt: 100,
      } as unknown as LocalEntity,
      e2: {
        id: "e2",
        title: "Entity Two",
        type: "character",
        image: "https://example.com/alive.png",
        thumbnail: "https://example.com/dead_thumb2.png",
        createdAt: 100,
        updatedAt: 100,
        modifiedAt: 100,
      } as unknown as LocalEntity,
      e3: {
        id: "e3",
        title: "Entity Three",
        type: "location",
        image: "images/local.webp",
        createdAt: 100,
        updatedAt: 100,
        modifiedAt: 100,
      } as unknown as LocalEntity,
    };

    updateEntities = vi.fn().mockResolvedValue(true);
    isWritable = vi.fn().mockReturnValue(true);

    const deps: DeadExternalImagePrunerDependencies = {
      getEntities: () => mockEntities,
      isWritable: () => isWritable(),
      updateEntities: (updates) => updateEntities(updates),
      debounceMs: 200,
    };

    pruner = new DeadExternalImagePruner(deps);
  });

  afterEach(() => {
    pruner.destroy();
    vi.useRealTimers();
  });

  it("should debounce and prune dead image references across entities", async () => {
    pruner.add("https://example.com/dead.png");
    pruner.add(" https://example.com/dead_thumb2.png ");

    expect(updateEntities).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(200);

    expect(updateEntities).toHaveBeenCalledTimes(1);
    expect(updateEntities).toHaveBeenCalledWith({
      e1: {
        image: undefined,
        thumbnail: undefined,
        imageFocus: undefined,
        imageArtDirection: undefined,
      },
      e2: {
        thumbnail: undefined,
      },
    });
  });

  it("should do nothing when isWritable is false", async () => {
    isWritable.mockReturnValue(false);

    pruner.add("https://example.com/dead.png");
    await vi.advanceTimersByTimeAsync(500);

    expect(updateEntities).not.toHaveBeenCalled();
  });

  it("should not call updateEntities if no entities reference the dead URLs", async () => {
    pruner.add("https://example.com/unknown.png");
    await vi.advanceTimersByTimeAsync(200);

    expect(updateEntities).not.toHaveBeenCalled();
  });

  it("should support manual flush()", async () => {
    pruner.add("https://example.com/dead.png");
    await pruner.flush();

    expect(updateEntities).toHaveBeenCalledTimes(1);
    expect(updateEntities).toHaveBeenCalledWith({
      e1: {
        image: undefined,
        thumbnail: undefined,
        imageFocus: undefined,
        imageArtDirection: undefined,
      },
    });

    // Timer shouldn't fire another flush
    await vi.advanceTimersByTimeAsync(500);
    expect(updateEntities).toHaveBeenCalledTimes(1);
  });

  it("should clear timer and pending URLs on destroy()", async () => {
    pruner.add("https://example.com/dead.png");
    pruner.destroy();

    await vi.advanceTimersByTimeAsync(500);

    expect(updateEntities).not.toHaveBeenCalled();
  });

  it("should gracefully catch updateEntities error without crashing", async () => {
    updateEntities.mockRejectedValueOnce(new Error("Disk error"));
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    pruner.add("https://example.com/dead.png");
    await pruner.flush();

    expect(consoleSpy).toHaveBeenCalledWith(
      "[DeadExternalImagePruner] Failed to prune dead external images:",
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it("should ignore empty or whitespace-only urls", async () => {
    pruner.add("");
    pruner.add("   ");
    await vi.advanceTimersByTimeAsync(500);

    expect(updateEntities).not.toHaveBeenCalled();
  });
});
