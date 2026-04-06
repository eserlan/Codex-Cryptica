import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssetStore } from "./asset-store.svelte";
import { uiStore } from "../ui.svelte";
import { p2pGuestService } from "../../cloud-bridge/p2p/guest-service";

vi.mock("$app/paths", () => ({ base: "" }));

vi.mock("../ui.svelte", () => ({
  uiStore: {
    activeDemoTheme: null,
  },
}));

vi.mock("../../cloud-bridge/p2p/guest-service", () => ({
  p2pGuestService: {
    getFile: vi.fn().mockResolvedValue(new Blob(["guest"])),
  },
}));

describe("AssetStore", () => {
  const vaultHandle = { kind: "directory", name: "vault" } as any;
  const syncHandle = { kind: "directory", name: "sync" } as any;
  let assetManager: {
    resolveImageUrl: ReturnType<typeof vi.fn>;
    releaseImageUrl: ReturnType<typeof vi.fn>;
    saveImageToVault: ReturnType<typeof vi.fn>;
    ensureAssetPersisted: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
  };
  let store: AssetStore;

  beforeEach(() => {
    vi.clearAllMocks();
    (uiStore as any).activeDemoTheme = null;
    assetManager = {
      resolveImageUrl: vi.fn().mockResolvedValue("blob:url"),
      releaseImageUrl: vi.fn(),
      saveImageToVault: vi.fn().mockResolvedValue("images/test.png"),
      ensureAssetPersisted: vi.fn().mockResolvedValue("images/test.png"),
      clear: vi.fn(),
    };

    store = new AssetStore({
      assetManager: assetManager as any,
      getActiveVaultHandle: vi.fn().mockResolvedValue(vaultHandle),
      getActiveSyncHandle: vi.fn().mockResolvedValue(syncHandle),
      isGuest: vi.fn().mockReturnValue(false),
    });
  });

  it("resolves image URLs with the active vault and sync handles", async () => {
    const url = await store.resolveImageUrl("images/test.png");

    expect(url).toBe("blob:url");
    expect(assetManager.resolveImageUrl).toHaveBeenCalledWith(
      vaultHandle,
      "images/test.png",
      undefined,
      syncHandle,
    );
  });

  it("uses the guest file fetcher when guest mode is enabled", async () => {
    store = new AssetStore({
      assetManager: {
        ...assetManager,
        resolveImageUrl: vi
          .fn()
          .mockImplementation(async (_vault, _path, fetcher) => {
            await fetcher?.("sample.png");
            return "guest:url";
          }),
      } as any,
      getActiveVaultHandle: vi.fn().mockResolvedValue(vaultHandle),
      getActiveSyncHandle: vi.fn().mockResolvedValue(syncHandle),
      isGuest: vi.fn().mockReturnValue(true),
    });

    const url = await store.resolveImageUrl("images/test.png");

    expect(url).toBe("guest:url");
    expect(p2pGuestService.getFile).toHaveBeenCalledWith("sample.png");
  });

  it("passes the demo asset fetcher to persistence when a demo theme is active", async () => {
    (uiStore as any).activeDemoTheme = "fantasy";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(["demo"])),
    });
    vi.stubGlobal("fetch", fetchMock);

    assetManager.ensureAssetPersisted = vi
      .fn()
      .mockImplementation(async (_path, _vaultHandle, fetcher) => {
        const blob = await fetcher?.("sample.png");
        return blob ? "images/demo.png" : "images/test.png";
      });

    store = new AssetStore({
      assetManager: assetManager as any,
      getActiveVaultHandle: vi.fn().mockResolvedValue(vaultHandle),
      getActiveSyncHandle: vi.fn().mockResolvedValue(syncHandle),
      isGuest: vi.fn().mockReturnValue(false),
    });

    const result = await store.ensureAssetPersisted("sample.png", vaultHandle);

    expect(result).toBe("images/demo.png");
    expect(fetchMock).toHaveBeenCalledWith("/vault-samples/sample.png");
  });

  it("delegates release and clear operations to the asset manager", () => {
    store.releaseImageUrl("images/test.png");
    store.clear();

    expect(assetManager.releaseImageUrl).toHaveBeenCalledWith(
      "images/test.png",
    );
    expect(assetManager.clear).toHaveBeenCalled();
  });
});
