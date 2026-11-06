import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublishRegistryLoader } from "./publish-registry-loader";
import { loadPublishRegistryFromDisk } from "./io";
import { getPublishRegistry, savePublishRegistry } from "./registry";

vi.mock("./io", () => ({ loadPublishRegistryFromDisk: vi.fn() }));
vi.mock("./registry", () => ({
  getPublishRegistry: vi.fn(),
  savePublishRegistry: vi.fn(),
}));
const handle = {} as FileSystemDirectoryHandle;
const disk = { publishedAt: "2026-11-01" } as NonNullable<
  Awaited<ReturnType<typeof loadPublishRegistryFromDisk>>
>;

beforeEach(() => vi.resetAllMocks());
describe("PublishRegistryLoader", () => {
  it("imports disk metadata when absent or newer locally", async () => {
    const loader = new PublishRegistryLoader();
    vi.mocked(loadPublishRegistryFromDisk).mockResolvedValue(disk);
    await loader.load("vault", handle);
    expect(savePublishRegistry).toHaveBeenCalledWith(disk);
    vi.mocked(getPublishRegistry).mockResolvedValue({
      ...disk,
      publishedAt: "2026-10-01",
    });
    await loader.load("vault", handle);
    expect(savePublishRegistry).toHaveBeenCalledTimes(2);
  });

  it("keeps newer local metadata and ignores absent disk metadata", async () => {
    const loader = new PublishRegistryLoader();
    vi.mocked(loadPublishRegistryFromDisk).mockResolvedValue(disk);
    vi.mocked(getPublishRegistry).mockResolvedValue({
      ...disk,
      publishedAt: "2026-11-02",
    });
    await loader.load("vault", handle);
    vi.mocked(loadPublishRegistryFromDisk).mockResolvedValue(null);
    await loader.load("vault", handle);
    expect(savePublishRegistry).not.toHaveBeenCalled();
  });

  it("isolates disk and extension failures and supports unregistering", async () => {
    const loader = new PublishRegistryLoader();
    const first = vi.fn().mockRejectedValue(new Error("extension"));
    const next = vi.fn();
    const unregister = loader.register(first);
    loader.register(next);
    vi.mocked(loadPublishRegistryFromDisk).mockRejectedValue(new Error("disk"));
    await loader.load("vault", handle);
    expect(next).toHaveBeenCalledWith("vault", handle);
    unregister();
    await loader.load("vault", handle);
    expect(first).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(2);
  });
});
