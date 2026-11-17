import { describe, expect, it, vi } from "vitest";
vi.mock("#lib/stores/vault.svelte.js", () => ({ vault: {} }));
import { SpeciesPersistence } from "./species-persistence";

describe("SpeciesPersistence", () => {
  it("uses staged entity persistence and retries rejected writes", async () => {
    const bulkUpdate = vi
      .fn()
      .mockResolvedValueOnce({ succeededIds: [] })
      .mockResolvedValueOnce({ succeededIds: ["hero"] });
    const service = new SpeciesPersistence({ isGuest: false, bulkUpdate });
    const patch = { appliedSpecies: undefined };
    await expect(service.save("hero", patch)).rejects.toThrow(
      "could not be saved",
    );
    await expect(service.save("hero", patch)).resolves.toBeUndefined();
    expect(bulkUpdate).toHaveBeenLastCalledWith({ hero: patch });
  });
  it("refuses read-only writes", async () => {
    const bulkUpdate = vi.fn();
    await expect(
      new SpeciesPersistence({ isGuest: true, bulkUpdate }).save("hero", {}),
    ).rejects.toThrow("read-only");
    expect(bulkUpdate).not.toHaveBeenCalled();
  });
});
