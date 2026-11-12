import {
  mutationTestContext,
  makeMutationEntity,
} from "./entity-mutation-test-helpers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EntityMutationService,
  type MutationDependencies,
} from "./entity-mutations";
import { sessionModeStore } from "../ui/session-mode.svelte";

beforeEach(() => {
  vi.clearAllMocks();
  sessionModeStore.isDemoMode = false;
});
describe("EntityMutationService facade", () => {
  it("shares repository replacements and live callbacks across all composed services", async () => {
    const { context, persistence, deps } = mutationTestContext();
    const publicDeps: MutationDependencies = context.deps;
    const service = new EntityMutationService(publicDeps);
    const onEntitiesUpdated = vi.fn();
    const onBatchUpdate = vi.fn();
    const onConnectionAdded = vi.fn();
    const onEntityDelete = vi.fn();
    service.registerStoreCallbacks({
      onEntitiesUpdated,
      onBatchUpdate,
      onConnectionAdded,
      onEntityDelete,
    });
    const previous = service.entities;
    service.entities = {
      hero: makeMutationEntity(),
      place: makeMutationEntity("place"),
    };
    expect(onEntitiesUpdated).toHaveBeenCalledWith(previous, service.entities);
    expect(await service.updateEntity("hero", { title: "Hero" })).toBe(true);
    expect(await service.addLabel("hero", "brave")).toBe(true);
    expect(await service.addConnection("hero", "place", "knows")).toBe(true);
    expect(onConnectionAdded).toHaveBeenCalledWith(
      "hero",
      "place",
      expect.anything(),
    );
    expect(await service.batchUpdate({ hero: { title: "Changed" } })).toBe(
      true,
    );
    expect(onBatchUpdate).toHaveBeenCalledWith({ hero: { title: "Changed" } });
    sessionModeStore.isDemoMode = true;
    await service.deleteEntity("place");
    expect(onEntityDelete).toHaveBeenCalledWith("place");
    expect(service.entities.place).toBeUndefined();
    expect(deps.onConnectionAdded).not.toHaveBeenCalled();
    expect(persistence.scheduleSave).toHaveBeenCalledTimes(3);
  });

  it("keeps the boolean batch API and propagates persistence failures", async () => {
    const { context, persistence } = mutationTestContext();
    const service = new EntityMutationService(context.deps);
    expect(await service.batchUpdate({ missing: {} })).toBe(false);
    persistence.persistImmediately.mockResolvedValueOnce([]);
    expect(await service.batchUpdate({ hero: { title: "Changed" } })).toBe(
      false,
    );
    persistence.scheduleSave.mockRejectedValueOnce(new Error("disk"));
    await expect(
      service.updateEntity("hero", { title: "Changed" }),
    ).rejects.toThrow("disk");
  });
});
