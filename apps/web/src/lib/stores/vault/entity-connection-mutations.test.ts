import { mutationTestContext } from "./entity-mutation-test-helpers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EntityConnectionMutations } from "./entity-connection-mutations";
import { vaultEventBus } from "./events.svelte";

beforeEach(() => vi.clearAllMocks());
describe("EntityConnectionMutations", () => {
  it("loads the source before saving and uses callbacks replaced after construction", async () => {
    const { context, deps, loader, persistence } = mutationTestContext();
    const service = new EntityConnectionMutations(context);
    loader.isContentLoaded.mockReturnValue(false);
    context.deps = { ...context.deps, onConnectionAdded: vi.fn() };
    expect(
      await service.addConnection("hero", "place", "knows", "Friend", 0.5),
    ).toBe(true);
    expect(loader.loadEntityContent).toHaveBeenCalledWith("hero");
    expect(persistence.scheduleSave).toHaveBeenCalledWith(
      context.entities.hero,
    );
    expect(context.deps.onConnectionAdded).toHaveBeenCalledWith(
      "hero",
      "place",
      expect.objectContaining({ type: "knows", strength: 0.5 }),
    );
    expect(deps.onConnectionAdded).not.toHaveBeenCalled();
    expect(
      await service.updateConnection(
        "hero",
        "place",
        "knows",
        "trusts",
        "Ally",
      ),
    ).toBe(true);
    expect(
      await service.setConnectionHidden("hero", "place", "trusts", true),
    ).toBe(true);
    expect(context.entities.hero.connections[0].hidden).toBe(true);
    expect(await service.removeConnection("hero", "place", "trusts")).toBe(
      true,
    );
    expect(context.entities.hero.connections).toEqual([]);
    expect(vaultEventBus.emit).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "CONNECTION_REMOVED" }),
    );
  });

  it("does not save or announce absent connections and propagates save failures", async () => {
    const { context, persistence, deps } = mutationTestContext();
    const service = new EntityConnectionMutations(context);
    expect(await service.addConnection("missing", "place", "knows")).toBe(
      false,
    );
    expect(
      await service.updateConnection("missing", "place", "missing", "knows"),
    ).toBe(false);
    expect(
      await service.setConnectionHidden("hero", "place", "knows", true),
    ).toBe(false);
    expect(await service.removeConnection("missing", "place", "knows")).toBe(
      false,
    );
    expect(persistence.scheduleSave).not.toHaveBeenCalled();
    persistence.scheduleSave.mockRejectedValueOnce(new Error("disk"));
    await expect(
      service.addConnection("hero", "place", "knows"),
    ).rejects.toThrow("disk");
    expect(deps.onConnectionAdded).not.toHaveBeenCalled();
    expect(vaultEventBus.emit).not.toHaveBeenCalled();
  });
});
