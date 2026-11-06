import { describe, expect, it, vi } from "vitest";
import { VaultAssetAccess } from "./asset-access";

function setup() {
  const assets = {
    resolveImageUrl: vi.fn().mockResolvedValue("host-image"),
    resolveThumbnailUrl: vi.fn().mockResolvedValue("host-thumb"),
    releaseImageUrl: vi.fn(),
    releaseThumbnailUrl: vi.fn(),
  };
  const deps = {
    isGuest: () => false,
    resolveGuestImage: vi.fn().mockReturnValue("guest-image"),
    assets: () => assets,
  };
  return { access: new VaultAssetAccess(deps), assets, deps };
}
describe("VaultAssetAccess", () => {
  it("delegates host URLs and cache releases, including the optional fetcher", async () => {
    const { access, assets } = setup();
    const fetcher = vi.fn();
    expect(await access.resolveImageUrl("image", fetcher)).toBe("host-image");
    expect(assets.resolveImageUrl).toHaveBeenCalledWith("image", fetcher);
    expect(await access.resolveThumbnailUrl("image")).toBe("host-thumb");
    expect(assets.resolveThumbnailUrl).toHaveBeenCalledWith("image");
    access.releaseImageUrl("image");
    access.releaseThumbnailUrl("image");
    expect(assets.releaseImageUrl).toHaveBeenCalledWith("image");
    expect(assets.releaseThumbnailUrl).toHaveBeenCalledWith("image");
  });
  it("uses guest images for both sizes and leaves host thumbnail caches alone", async () => {
    const { access, assets, deps } = setup();
    deps.isGuest = () => true;
    expect(await access.resolveImageUrl("image")).toBe("guest-image");
    expect(await access.resolveThumbnailUrl("image")).toBe("guest-image");
    expect(deps.resolveGuestImage).toHaveBeenCalledWith("image");
    deps.resolveGuestImage.mockReturnValue(undefined);
    expect(await access.resolveImageUrl("missing")).toBe("");
    expect(await access.resolveThumbnailUrl("missing")).toBe("");
    access.releaseThumbnailUrl("image");
    access.releaseImageUrl("image");
    expect(assets.resolveImageUrl).not.toHaveBeenCalled();
    expect(assets.resolveThumbnailUrl).not.toHaveBeenCalled();
    expect(assets.releaseThumbnailUrl).not.toHaveBeenCalled();
    // Preserve the original full-image release behavior even for guests.
    expect(assets.releaseImageUrl).toHaveBeenCalledWith("image");
  });
});
