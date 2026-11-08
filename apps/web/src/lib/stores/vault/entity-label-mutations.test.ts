import { mutationTestContext } from "./entity-mutation-test-helpers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EntityLabelMutations } from "./entity-label-mutations";
import { vaultEventBus } from "./events.svelte";

beforeEach(() => vi.clearAllMocks());
describe("EntityLabelMutations", () => {
  it("saves single label changes and emits the resulting labels", async () => {
    const { context, persistence } = mutationTestContext();
    const labels = new EntityLabelMutations(context);
    expect(await labels.addLabel("hero", "brave")).toBe(true);
    expect(vaultEventBus.emit).toHaveBeenLastCalledWith(
      expect.objectContaining({ patch: { labels: ["brave"] } }),
    );
    expect(await labels.removeLabel("hero", "brave")).toBe(true);
    expect(context.entities.hero.labels).toEqual([]);
    expect(persistence.scheduleSave).toHaveBeenCalledTimes(2);
  });

  it("commits bulk additions, removals, renames and deletion once per operation", async () => {
    const { context, persistence } = mutationTestContext();
    const labels = new EntityLabelMutations(context);
    expect(await labels.bulkAddLabel(["hero", "place"], "old")).toBe(2);
    expect(await labels.renameLabel("old", "new")).toBe(2);
    expect(await labels.bulkRemoveLabel(["hero"], "new")).toBe(1);
    expect(await labels.deleteLabel("new")).toBe(1);
    expect(context.entities.place.labels).toEqual([]);
    expect(persistence.scheduleSave).toHaveBeenCalledTimes(6);
    expect(vaultEventBus.emit).toHaveBeenCalledTimes(4);
  });

  it("skips missing entities and unchanged bulk labels and propagates failures", async () => {
    const { context, persistence } = mutationTestContext();
    const labels = new EntityLabelMutations(context);
    expect(await labels.addLabel("missing", "brave")).toBe(false);
    expect(await labels.removeLabel("missing", "brave")).toBe(false);
    expect(await labels.deleteLabel("missing")).toBe(0);
    expect(persistence.scheduleSave).not.toHaveBeenCalled();
    persistence.scheduleSave.mockRejectedValueOnce(new Error("disk"));
    await expect(labels.bulkAddLabel(["hero"], "brave")).rejects.toThrow(
      "disk",
    );
    expect(vaultEventBus.emit).not.toHaveBeenCalled();
  });
});
