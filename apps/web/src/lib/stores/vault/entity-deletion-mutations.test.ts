import {
  mutationTestContext,
  makeMutationEntity,
} from "./entity-mutation-test-helpers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EntityDeletionMutations } from "./entity-deletion-mutations";
import * as vaultEntities from "./entities";
import { vaultEventBus } from "./events.svelte";
import { cacheService } from "../../services/cache.svelte";
import { updateLastInternalChange } from "./registry";
import { sessionModeStore } from "../ui/session-mode.svelte";

vi.mock("./entities", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./entities")>()),
  deleteEntity: vi.fn(),
  deleteEntityFiles: vi.fn(),
}));
beforeEach(() => {
  vi.clearAllMocks();
  sessionModeStore.isDemoMode = false;
  vi.mocked(vaultEntities.deleteEntityFiles)
    .mockReset()
    .mockResolvedValue(undefined);
});

describe("EntityDeletionMutations", () => {
  it("rejects guest deletions before touching state or disk", async () => {
    const { context, deps, recorder } = mutationTestContext();
    deps.isGuest.mockReturnValue(true);
    const service = new EntityDeletionMutations(context, recorder);
    await expect(service.deleteEntity("hero")).rejects.toThrow(
      "Cannot delete entities in Guest Mode",
    );
    await expect(service.bulkDelete(["hero"])).rejects.toThrow(
      "Cannot delete entities in Guest Mode",
    );
    expect(deps.repository.enqueueSave).not.toHaveBeenCalled();
    expect(context.entities.hero).toBeDefined();
  });

  it("deletes demo entities locally, deduplicating bulk requests and skipping missing ids", async () => {
    const { context, deps, recorder, span } = mutationTestContext();
    sessionModeStore.isDemoMode = true;
    const service = new EntityDeletionMutations(context, recorder);
    await service.deleteEntity("hero");
    expect(context.entities.hero).toBeUndefined();
    const result = await service.bulkDelete(["place", "place", "missing"]);
    expect(result.requested).toBe(2);
    expect(result.succeededIds).toEqual(["place"]);
    expect(result.skippedIds).toEqual(["missing"]);
    expect(deps.onEntityDelete.mock.calls).toEqual([["hero"], ["place"]]);
    expect(deps.getActiveVaultHandle).not.toHaveBeenCalled();
    expect(span.complete).toHaveBeenCalled();
  });

  it("serializes single deletion, schedules modified survivors and removes the local file and cache", async () => {
    const { context, deps, recorder, persistence } = mutationTestContext();
    const hero = context.entities.hero;
    hero._path = ["notes", "hero.md"];
    const removeEntry = vi.fn().mockResolvedValue(undefined);
    const local = {
      queryPermission: vi.fn().mockResolvedValue("granted"),
      getDirectoryHandle: vi.fn().mockResolvedValue({ removeEntry }),
    };
    deps.getActiveFolderHandle.mockResolvedValue(local);
    context.deps.getInboundConnections = () => ({});
    context.deps.getParentToChildren = () => ({});
    vi.mocked(vaultEntities.deleteEntity).mockResolvedValueOnce({
      entities: { place: context.entities.place },
      deletedEntity: hero,
      modifiedIds: ["place", "missing"],
    });
    await new EntityDeletionMutations(context, recorder).deleteEntity("hero");
    expect(vaultEntities.deleteEntity).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "hero",
      {},
      [],
    );
    expect(deps.repository.enqueueSave).toHaveBeenCalledWith(
      "hero",
      expect.any(Function),
    );
    expect(persistence.scheduleSave).toHaveBeenCalledWith(
      context.entities.place,
    );
    expect(deps.onEntityDelete).toHaveBeenCalledWith("hero");
    expect(updateLastInternalChange).toHaveBeenCalledWith("vault", {
      kind: "entity",
      ids: ["hero"],
      deleted: true,
    });
    expect(deps.updateEntityCount).toHaveBeenCalledWith("vault", 1);
    expect(removeEntry).toHaveBeenCalledWith("hero.md", { recursive: true });
    expect(cacheService.remove).toHaveBeenCalledWith("vault:notes/hero.md");
    expect(vaultEventBus.emit).toHaveBeenCalledWith({
      type: "ENTITY_DELETED",
      vaultId: "vault",
      entityId: "hero",
    });
  });

  it("does not publish single deletions without a handle or a deleted entity, and propagates disk failure", async () => {
    const { context, deps, recorder } = mutationTestContext();
    const service = new EntityDeletionMutations(context, recorder);
    deps.getActiveVaultHandle.mockResolvedValueOnce(undefined);
    await service.deleteEntity("hero");
    expect(vaultEntities.deleteEntity).not.toHaveBeenCalled();
    vi.mocked(vaultEntities.deleteEntity).mockResolvedValueOnce({
      entities: context.entities,
      deletedEntity: null,
      modifiedIds: [],
    });
    await service.deleteEntity("missing");
    vi.mocked(vaultEntities.deleteEntity).mockRejectedValueOnce(
      new Error("disk"),
    );
    await expect(service.deleteEntity("hero")).rejects.toThrow("disk");
    expect(deps.onEntityDelete).not.toHaveBeenCalled();
    expect(cacheService.remove).not.toHaveBeenCalled();
  });

  it.each(["handle", "id"])(
    "reports all bulk requests failed without a vault %s",
    async (missing) => {
      const { context, deps, recorder, span } = mutationTestContext();
      if (missing === "handle")
        deps.getActiveVaultHandle.mockResolvedValue(undefined);
      else deps.activeVaultId.mockReturnValue(null);
      const result = await new EntityDeletionMutations(
        context,
        recorder,
      ).bulkDelete(["hero", "missing"]);
      expect(result.failedIds).toEqual(["hero", "missing"]);
      expect(span.fail).toHaveBeenCalled();
      expect(context.entities.hero).toBeDefined();
    },
  );

  it("commits successful file deletions, retries failed survivor saves and retains failed deletions", async () => {
    const { context, deps, recorder, persistence, span } =
      mutationTestContext();
    const hero = context.entities.hero;
    hero._path = ["hero.md"];
    context.entities.child = makeMutationEntity("child", {
      parent: "hero",
      connections: [{ target: "hero", type: "knows", strength: 1 }],
    });
    context.deps.getInboundConnections = () => ({
      hero: [
        {
          sourceId: "child",
          connection: context.entities.child.connections[0],
        },
      ],
    });
    context.deps.getParentToChildren = () => ({ hero: ["child"] });
    const error = new Error("disk");
    vi.mocked(vaultEntities.deleteEntityFiles).mockImplementation(
      async (_handle, entity) => {
        if (entity.id === "place") throw error;
      },
    );
    persistence.persistImmediately.mockResolvedValueOnce([
      { id: "child", ok: false },
    ] as never);
    const result = await new EntityDeletionMutations(
      context,
      recorder,
    ).bulkDelete(["hero", "hero", "place", "missing"]);
    expect(result.succeededIds).toEqual(["hero"]);
    expect(result.failedIds).toEqual(["place"]);
    expect(result.skippedIds).toEqual(["missing"]);
    expect(context.entities.hero).toBeUndefined();
    expect(context.entities.place).toBeDefined();
    expect(context.entities.child.parent).toBeUndefined();
    expect(context.entities.child.connections).toEqual([]);
    expect(persistence.scheduleSave).toHaveBeenCalledWith(
      context.entities.child,
    );
    expect(deps.onEntityDelete).toHaveBeenCalledOnce();
    expect(deps.updateEntityCount).toHaveBeenCalledWith("vault", 2);
    expect(cacheService.remove).toHaveBeenCalledWith("vault:hero.md");
    expect(span.fail).toHaveBeenCalled();
  });

  it("keeps successful survivor saves without scheduling a retry", async () => {
    const { context, deps, recorder, persistence, span } =
      mutationTestContext();
    context.entities.place.parent = "hero";
    context.deps.getParentToChildren = () => ({ hero: ["place"] });
    const result = await new EntityDeletionMutations(
      context,
      recorder,
    ).bulkDelete(["hero"]);
    expect(result.succeededIds).toEqual(["hero"]);
    expect(persistence.scheduleSave).not.toHaveBeenCalled();
    expect(deps.updateEntityCount).toHaveBeenCalledWith("vault", 1);
    expect(span.complete).toHaveBeenCalled();
  });

  it("cancels published results on a vault switch after filesystem work", async () => {
    const { context, deps, recorder, span } = mutationTestContext();
    const before = context.entities;
    vi.mocked(vaultEntities.deleteEntityFiles).mockImplementationOnce(
      async () => {
        deps.activeVaultId.mockReturnValue("other");
      },
    );
    const result = await new EntityDeletionMutations(
      context,
      recorder,
    ).bulkDelete(["hero", "missing"]);
    expect(result.cancelledIds).toEqual(["hero"]);
    expect(result.skippedIds).toEqual(["missing"]);
    expect(context.entities).toBe(before);
    expect(deps.onEntityDelete).not.toHaveBeenCalled();
    expect(span.cancel).toHaveBeenCalled();
  });

  it("does not commit or announce failed file deletions", async () => {
    const { context, deps, recorder, persistence } = mutationTestContext();
    const error = new Error("disk");
    vi.mocked(vaultEntities.deleteEntityFiles).mockRejectedValueOnce(error);
    const result = await new EntityDeletionMutations(
      context,
      recorder,
    ).bulkDelete(["hero"]);
    expect(result.failedIds).toEqual(["hero"]);
    expect(result.items[0].error).toBe(error);
    expect(context.entities.hero).toBeDefined();
    expect(persistence.persistImmediately).not.toHaveBeenCalled();
    expect(deps.onEntityDelete).not.toHaveBeenCalled();
    expect(vaultEventBus.emit).not.toHaveBeenCalled();
  });
});
