import { mutationTestContext } from "./entity-mutation-test-helpers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EntityWriteMutations } from "./entity-write-mutations";
import { vaultEventBus } from "./events.svelte";
import type { IVaultServices } from "./service-registry";

beforeEach(() => vi.clearAllMocks());
describe("EntityWriteMutations", () => {
  it("creates and batches entities, marks content loaded and updates counts after saving", async () => {
    const { context, recorder, loader, persistence, deps, span } =
      mutationTestContext();
    const writes = new EntityWriteMutations(context, recorder);
    const id = await writes.createEntity("note", "New Note");
    expect(context.entities[id].title).toBe("New Note");
    expect(loader.markContentLoaded).toHaveBeenCalledWith(id);
    expect(persistence.scheduleSave).toHaveBeenCalledWith(
      context.entities[id],
      { immediate: true },
    );
    expect(deps.updateEntityCount).toHaveBeenCalledWith("vault", 3);
    await writes.batchCreateEntities([
      { type: "note", title: "Another", initialData: {} },
    ]);
    expect(deps.updateEntityCount).toHaveBeenLastCalledWith("vault", 4);
    expect(vaultEventBus.emit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: "BATCH_CREATED",
        entities: [expect.objectContaining({ title: "Another" })],
      }),
    );
    expect(span.complete).toHaveBeenCalled();
  });

  it("preserves long form text for metadata edits and invalidates image and style caches", async () => {
    const { context, recorder, persistence, loader, deps } =
      mutationTestContext();
    const clearStyleCache = vi.fn();
    context.deps.getServices = () =>
      ({ ai: { clearStyleCache } }) as unknown as IVaultServices;
    const writes = new EntityWriteMutations(context, recorder);
    expect(
      await writes.updateEntity("hero", {
        title: "Art Style",
        image: "new.webp",
      }),
    ).toBe(true);
    expect(context.entities.hero.content).toBe("Content");
    expect(context.entities.hero.lore).toBe("Lore");
    expect(persistence.scheduleSave).toHaveBeenLastCalledWith(
      context.entities.hero,
      { immediate: false },
    );
    expect(deps.invalidateUrlCache).toHaveBeenCalledWith("new.webp");
    expect(clearStyleCache).toHaveBeenCalledOnce();
    expect(loader.markContentLoaded).not.toHaveBeenCalled();
    await writes.updateEntity("hero", { content: "", lore: "Changed" });
    expect(context.entities.hero.content).toBe("");
    expect(context.entities.hero.contentLoaded).toBe(true);
    expect(loader.markContentLoaded).toHaveBeenCalledWith("hero");
    expect(persistence.scheduleSave).toHaveBeenLastCalledWith(
      context.entities.hero,
      { immediate: true },
    );
  });

  it("skips absent updates and reports save failure without announcing success", async () => {
    const { context, recorder, persistence, span } = mutationTestContext();
    const writes = new EntityWriteMutations(context, recorder);
    expect(await writes.updateEntity("missing", {})).toBe(false);
    expect(recorder.start).not.toHaveBeenCalled();
    persistence.scheduleSave.mockRejectedValueOnce(new Error("disk"));
    await expect(
      writes.updateEntity("hero", { lore: "Changed" }),
    ).rejects.toThrow("disk");
    expect(context.entities.hero.lore).toBe("Changed");
    expect(span.fail).toHaveBeenCalledWith("unexpected", expect.any(Function));
    expect(vaultEventBus.emit).not.toHaveBeenCalled();
    expect(span.complete).not.toHaveBeenCalled();
  });
});
