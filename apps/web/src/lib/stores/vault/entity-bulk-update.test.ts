import { mutationTestContext } from "./entity-mutation-test-helpers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EntityBulkUpdate } from "./entity-bulk-update";
import { vaultEventBus } from "./events.svelte";
import { sessionModeStore } from "../ui/session-mode.svelte";

beforeEach(() => {
  vi.clearAllMocks();
  sessionModeStore.isDemoMode = false;
});
describe("EntityBulkUpdate", () => {
  it("publishes only persisted patches and preserves cached content for metadata edits", async () => {
    const { context, deps, persistence, loader, recorder, span } =
      mutationTestContext();
    context.entities.hero.metadata = { width: 100 };
    context.entities.hero.image = "old.webp";
    const failure = new Error("disk");
    persistence.persistImmediately.mockResolvedValueOnce([
      { id: "hero", ok: true },
      { id: "place", ok: false, error: failure },
    ] as never);
    const service = new EntityBulkUpdate(context, recorder);
    const patches = {
      hero: { metadata: { height: 200 }, image: undefined },
      place: { content: "changed" },
      missing: {},
    };
    const result = await service.bulkUpdate(patches);
    expect(result.succeededIds).toEqual(["hero"]);
    expect(result.failedIds).toEqual(["place"]);
    expect(result.skippedIds).toEqual(["missing"]);
    expect(context.entities.hero.metadata).toEqual({
      width: 100,
      height: 200,
    });
    expect(context.entities.hero).not.toHaveProperty("image");
    expect(context.entities.place.content).toBe("Content");
    expect(persistence.persistImmediately).toHaveBeenCalledWith([
      {
        entity: context.entities.hero,
        options: { preserveCachedContent: true },
      },
      {
        entity: expect.objectContaining({ id: "place", content: "changed" }),
        options: { preserveCachedContent: false },
      },
    ]);
    expect(deps.invalidateUrlCache).toHaveBeenCalledWith("old.webp");
    expect(loader.markContentLoaded).not.toHaveBeenCalled();
    expect(deps.onBatchUpdate).toHaveBeenCalledWith({ hero: patches.hero });
    expect(vaultEventBus.emit).toHaveBeenCalledOnce();
    expect(span.fail).toHaveBeenCalled();
  });

  it("marks persisted content loaded and permits explicit clearing of fields", async () => {
    const { context, persistence, loader, recorder, span } =
      mutationTestContext();
    const service = new EntityBulkUpdate(context, recorder);
    const result = await service.bulkUpdate({
      hero: { content: "", lore: undefined, image: "new.webp" },
    });
    expect(result.succeededIds).toEqual(["hero"]);
    expect(context.entities.hero.content).toBe("");
    expect(context.entities.hero).not.toHaveProperty("lore");
    expect(context.entities.hero.contentLoaded).toBe(true);
    expect(loader.markContentLoaded).toHaveBeenCalledWith("hero");
    expect(persistence.persistImmediately).toHaveBeenCalledOnce();
    expect(span.complete).toHaveBeenCalled();
  });

  it.each(["demo", "guest"])(
    "commits %s changes without disk persistence",
    async (mode) => {
      const { context, deps, persistence, loader, recorder } =
        mutationTestContext();
      sessionModeStore.isDemoMode = mode === "demo";
      deps.isGuest.mockReturnValue(mode === "guest");
      const service = new EntityBulkUpdate(context, recorder);
      const result = await service.bulkUpdate({
        hero: { content: "", lore: "local" },
      });
      expect(result.succeededIds).toEqual(["hero"]);
      expect(context.entities.hero.content).toBe(
        mode === "guest" ? "Content" : "",
      );
      expect(persistence.persistImmediately).not.toHaveBeenCalled();
      expect(loader.markContentLoaded).not.toHaveBeenCalled();
      expect(deps.onBatchUpdate).toHaveBeenCalledOnce();
    },
  );

  it("cancels on a vault switch and leaves the repository unchanged", async () => {
    const { context, deps, persistence, recorder, span } =
      mutationTestContext();
    const before = context.entities;
    persistence.persistImmediately.mockImplementationOnce(async () => {
      deps.activeVaultId.mockReturnValue("other");
      return [{ id: "hero", ok: true }];
    });
    const result = await new EntityBulkUpdate(context, recorder).bulkUpdate({
      hero: { title: "changed" },
      missing: {},
    });
    expect(result.cancelledIds).toEqual(["hero"]);
    expect(result.skippedIds).toEqual(["missing"]);
    expect(context.entities).toBe(before);
    expect(deps.onBatchUpdate).not.toHaveBeenCalled();
    expect(vaultEventBus.emit).not.toHaveBeenCalled();
    expect(span.cancel).toHaveBeenCalled();
  });

  it("skips empty work and does not publish failed or absent persistence results", async () => {
    const { context, persistence, recorder } = mutationTestContext();
    const service = new EntityBulkUpdate(context, recorder);
    expect((await service.bulkUpdate({ missing: {} })).skippedIds).toEqual([
      "missing",
    ]);
    expect(persistence.persistImmediately).not.toHaveBeenCalled();
    const before = context.entities;
    persistence.persistImmediately.mockResolvedValueOnce([]);
    expect(
      (await service.bulkUpdate({ hero: { title: "changed" } })).failedIds,
    ).toEqual(["hero"]);
    expect(context.entities).toBe(before);
    expect(vaultEventBus.emit).not.toHaveBeenCalled();
  });
});
