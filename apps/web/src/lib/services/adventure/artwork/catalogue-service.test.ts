import { describe, expect, it, vi } from "vitest";
import { ArtworkCatalogueService } from "./catalogue-service";
describe("artwork catalogue service", () => {
  it("shares concurrent metadata loading and caches validated data", async () => {
    const load = vi.fn(async () => []);
    const service = new ArtworkCatalogueService(load);
    expect(service.peek()).toBeNull();
    expect(await Promise.all([service.get(), service.get()])).toEqual([[], []]);
    expect(await service.get()).toEqual([]);
    expect(load).toHaveBeenCalledOnce();
    expect(service.peek()).toEqual([]);
  });
  it("returns no catalogue for invalid metadata and permits a later retry", async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce([{ id: "invalid" }])
      .mockResolvedValueOnce([]);
    const service = new ArtworkCatalogueService(load);
    expect(await service.get()).toBeNull();
    expect(service.peek()).toBeNull();
    expect(await service.get()).toEqual([]);
    expect(load).toHaveBeenCalledTimes(2);
  });
});

it("treats synchronous loader errors as retryable failures", async () => {
  const service = new ArtworkCatalogueService(() => {
    throw new Error("unavailable");
  });
  await expect(service.get()).resolves.toBeNull();
});
