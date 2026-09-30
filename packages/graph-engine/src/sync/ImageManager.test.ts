import { describe, it, expect, vi, beforeEach } from "vitest";
import { GraphImageManager } from "./ImageManager";

describe("GraphImageManager", () => {
  let mockCy: any;
  let mockNode: any;
  let mockStyle: any;

  beforeEach(() => {
    mockStyle = {
      update: vi.fn(),
    };
    mockNode = {
      id: vi.fn().mockReturnValue("node1"),
      data: vi.fn(),
      removeData: vi.fn(),
    };
    mockCy = {
      destroyed: vi.fn().mockReturnValue(false),
      nodes: vi.fn().mockReturnValue({
        filter: vi.fn().mockReturnValue([mockNode]),
      }),
      batch: vi.fn((fn) => fn()),
      style: vi.fn().mockReturnValue(mockStyle),
    };
  });

  it("should update style after applying images", async () => {
    const manager = new GraphImageManager(mockCy);
    const resolveImageUrl = vi.fn().mockResolvedValue("blob:url");
    const releaseImageUrl = vi.fn();
    let notifyBatchApplied: () => void;
    const batchApplied = new Promise<void>((resolve) => {
      notifyBatchApplied = resolve;
    });

    // Setup node data
    mockNode.data.mockImplementation((key: string) => {
      if (key === "image") return "path/to/image.png";
      if (key === "resolvedImage") return null;
      return null;
    });

    manager.sync({
      showImages: true,
      resolveImageUrl,
      releaseImageUrl,
      onBatchApplied: notifyBatchApplied,
    });

    await batchApplied;

    expect(mockStyle.update).toHaveBeenCalled();
    expect(mockNode.data).toHaveBeenCalledWith("resolvedImage", "blob:url");
  });

  it("should clear the local urlCache when clearImages is called", async () => {
    const manager = new GraphImageManager(mockCy);
    const resolveImageUrl = vi.fn().mockResolvedValue("blob:url1");
    const releaseImageUrl = vi.fn();
    let notifyFirstBatch: () => void;
    const firstBatchApplied = new Promise<void>((resolve) => {
      notifyFirstBatch = resolve;
    });

    // 1st Sync
    mockNode.data.mockImplementation((key: string) => {
      if (key === "image") return "path/to/image.png";
      if (key === "resolvedImage") return null;
      return null;
    });

    manager.sync({
      showImages: true,
      resolveImageUrl,
      releaseImageUrl,
      onBatchApplied: notifyFirstBatch,
    });

    await firstBatchApplied;

    // Setup node for being "resolved" for the clear step
    mockNode.data.mockImplementation((key: string) => {
      if (key === "image") return "path/to/image.png";
      if (key === "resolvedImage") return "blob:url1";
      return null;
    });

    // Clear Images
    manager.sync({ showImages: false, resolveImageUrl, releaseImageUrl });
    expect(releaseImageUrl).toHaveBeenCalledWith("path/to/image.png");

    // 2nd Sync - should call resolveImageUrl again because cache was cleared
    resolveImageUrl.mockResolvedValue("blob:url2");
    let notifySecondBatch: () => void;
    const secondBatchApplied = new Promise<void>((resolve) => {
      notifySecondBatch = resolve;
    });
    mockNode.data.mockImplementation((key: string) => {
      if (key === "image") return "path/to/image.png";
      if (key === "resolvedImage") return null;
      return null;
    });

    manager.sync({
      showImages: true,
      resolveImageUrl,
      releaseImageUrl,
      onBatchApplied: notifySecondBatch,
    });

    await secondBatchApplied;

    expect(resolveImageUrl).toHaveBeenCalledTimes(2);
    expect(mockNode.data).toHaveBeenCalledWith("resolvedImage", "blob:url2");
  });

  it("should resolve silhouette when node has no custom image", async () => {
    const manager = new GraphImageManager(mockCy);
    const resolveImageUrl = vi.fn();
    const releaseImageUrl = vi.fn();
    const resolveSilhouetteUrl = vi
      .fn()
      .mockReturnValue("data:image/svg+xml;utf8,test-svg");
    let notifyBatch: () => void;
    const batchApplied = new Promise<void>((resolve) => {
      notifyBatch = resolve;
    });

    // Setup node data without image
    mockNode.data.mockImplementation((key: string) => {
      if (key === "image") return null;
      if (key === "thumbnail") return null;
      if (key === "resolvedImage") return null;
      return null;
    });

    manager.sync({
      showImages: true,
      resolveImageUrl,
      releaseImageUrl,
      resolveSilhouetteUrl,
      onBatchApplied: notifyBatch,
    });

    await batchApplied;

    expect(resolveSilhouetteUrl).toHaveBeenCalledWith(mockNode);
    expect(mockNode.data).toHaveBeenCalledWith(
      "resolvedImage",
      "data:image/svg+xml;utf8,test-svg",
    );
    expect(mockNode.data).toHaveBeenCalledWith("isSilhouette", true);
    expect(mockStyle.update).toHaveBeenCalled();
  });

  it("should re-resolve visual when silhouette override changes", async () => {
    const manager = new GraphImageManager(mockCy);
    const resolveImageUrl = vi.fn();
    const releaseImageUrl = vi.fn();
    const resolveSilhouetteUrl = vi
      .fn()
      .mockReturnValue("data:image/svg+xml;utf8,updated-svg");
    let notifyBatch: () => void;
    const batchApplied = new Promise<void>((resolve) => {
      notifyBatch = resolve;
    });

    // Setup node that was previously resolved with "fantasy-warrior-male", now updated to "location-inn-tavern"
    mockNode.data.mockImplementation((key: string) => {
      if (key === "resolvedImage") return "data:image/svg+xml;utf8,old-svg";
      if (key === "isSilhouette") return true;
      if (key === "appliedSilhouetteKey") return "fantasy-warrior-male";
      if (key === "silhouette") return "location-inn-tavern";
      return null;
    });

    manager.sync({
      showImages: true,
      resolveImageUrl,
      releaseImageUrl,
      resolveSilhouetteUrl,
      onBatchApplied: notifyBatch,
    });

    await batchApplied;

    expect(resolveSilhouetteUrl).toHaveBeenCalledWith(mockNode);
    expect(mockNode.data).toHaveBeenCalledWith(
      "resolvedImage",
      "data:image/svg+xml;utf8,updated-svg",
    );
    expect(mockNode.data).toHaveBeenCalledWith(
      "appliedSilhouetteKey",
      expect.stringContaining("location-inn-tavern"),
    );
  });

  describe("theme-derived silhouette tint (issue #2680)", () => {
    /** A node backed by a real data map, so the staleness filter can run. */
    const makeNode = (data: Record<string, unknown>) => {
      const store = { ...data };
      return {
        id: () => "node1",
        data: vi.fn((key?: string, value?: unknown) => {
          if (key === undefined) return store;
          if (value === undefined) return store[key] ?? null;
          store[key] = value;
          return undefined;
        }),
        removeData: vi.fn((key: string) => {
          delete store[key];
        }),
      };
    };

    const cyFor = (node: any) => ({
      destroyed: () => false,
      nodes: () => ({ filter: (fn: (n: any) => boolean) => [node].filter(fn) }),
      batch: (fn: () => void) => fn(),
      style: () => ({ update: vi.fn() }),
    });

    it("re-resolves painted silhouettes when the theme changes", async () => {
      const node = makeNode({
        resolvedImage: "data:image/svg+xml;utf8,gold-svg",
        isSilhouette: true,
        appliedSilhouetteKey: "|character||Aldric|fantasy",
        type: "character",
        label: "Aldric",
      });
      const manager = new GraphImageManager(cyFor(node) as any);
      const resolveSilhouetteUrl = vi
        .fn()
        .mockReturnValue("data:image/svg+xml;utf8,moss-svg");
      let notifyBatch: () => void;
      const batchApplied = new Promise<void>((resolve) => {
        notifyBatch = resolve;
      });

      manager.sync({
        showImages: true,
        resolveImageUrl: vi.fn(),
        releaseImageUrl: vi.fn(),
        resolveSilhouetteUrl,
        silhouetteVariant: "fantasy_dark",
        onBatchApplied: notifyBatch!,
      });

      await batchApplied;

      expect(resolveSilhouetteUrl).toHaveBeenCalledWith(node);
      expect(node.data).toHaveBeenCalledWith(
        "resolvedImage",
        "data:image/svg+xml;utf8,moss-svg",
      );
      expect(node.data).toHaveBeenCalledWith(
        "appliedSilhouetteKey",
        expect.stringContaining("fantasy_dark"),
      );
    });

    it("stamps the variant that produced the tint, not one that overtook it", async () => {
      const node = makeNode({ type: "location", label: "The Ashen Reach" });
      const manager = new GraphImageManager(cyFor(node) as any);
      let notifyBatch: () => void;
      const batchApplied = new Promise<void>((resolve) => {
        notifyBatch = resolve;
      });
      const base = {
        showImages: true,
        resolveImageUrl: vi.fn(),
        releaseImageUrl: vi.fn(),
        resolveSilhouetteUrl: () => "data:image/svg+xml;utf8,moss-svg",
      };

      manager.sync({
        ...base,
        silhouetteVariant: "fantasy_dark",
        onBatchApplied: notifyBatch!,
      });
      // A theme switch lands while the first pass is still resolving.
      manager.sync({ ...base, silhouetteVariant: "pirate_dark" });

      await batchApplied;

      expect(node.data).toHaveBeenCalledWith(
        "appliedSilhouetteKey",
        expect.stringContaining("fantasy_dark"),
      );
      expect(node.data).not.toHaveBeenCalledWith(
        "appliedSilhouetteKey",
        expect.stringContaining("pirate_dark"),
      );
    });

    it("leaves silhouettes alone when the theme is unchanged", () => {
      const node = makeNode({
        resolvedImage: "data:image/svg+xml;utf8,moss-svg",
        isSilhouette: true,
        appliedSilhouetteKey: "|character||Aldric|fantasy_dark",
        type: "character",
        label: "Aldric",
      });
      const manager = new GraphImageManager(cyFor(node) as any);
      const resolveSilhouetteUrl = vi.fn();

      manager.sync({
        showImages: true,
        resolveImageUrl: vi.fn(),
        releaseImageUrl: vi.fn(),
        resolveSilhouetteUrl,
        silhouetteVariant: "fantasy_dark",
      });

      expect(resolveSilhouetteUrl).not.toHaveBeenCalled();
    });
  });

  describe("progressive resolution", () => {
    const makeNode = (id: string, x = 0, y = 0) => {
      const store: Record<string, any> = { image: `img/${id}.png` };
      return {
        id: () => id,
        position: () => ({ x, y }),
        data: vi.fn((key: string, value?: any) => {
          if (value !== undefined) store[key] = value;
          return store[key];
        }),
        removeData: vi.fn((key: string) => {
          delete store[key];
        }),
      };
    };
    const graphOf = (nodes: any[], extra: Record<string, any> = {}) => ({
      destroyed: vi.fn().mockReturnValue(false),
      nodes: vi.fn().mockReturnValue({ filter: () => nodes }),
      batch: vi.fn((fn: () => void) => fn()),
      style: vi.fn().mockReturnValue({ update: vi.fn() }),
      ...extra,
    });
    const deferred = () => {
      let resolve!: (v: string) => void;
      const promise = new Promise<string>((r) => (resolve = r));
      return { promise, resolve };
    };
    const until = async (check: () => boolean) => {
      for (let i = 0; i < 200 && !check(); i++) {
        await new Promise((r) => setTimeout(r, 5));
      }
    };

    it("paints the images that arrive without waiting for a slow one", async () => {
      const nodes = [makeNode("fast"), makeNode("slow")];
      const slow = deferred();
      const resolveImageUrl = vi.fn((path: string) =>
        path.includes("slow") ? slow.promise : Promise.resolve("blob:fast"),
      );
      new GraphImageManager(graphOf(nodes) as any).sync({
        showImages: true,
        resolveImageUrl,
        releaseImageUrl: vi.fn(),
      });

      await until(() => nodes[0].data("resolvedImage") === "blob:fast");

      expect(nodes[0].data("resolvedImage")).toBe("blob:fast");
      expect(nodes[1].data("resolvedImage")).toBeUndefined();
      slow.resolve("blob:slow");
      await until(() => nodes[1].data("resolvedImage") === "blob:slow");
      expect(nodes[1].data("resolvedImage")).toBe("blob:slow");
    });

    it("does not resolve an image again while its result waits in the paint queue", async () => {
      const queued = makeNode("queued");
      const slow = makeNode("slow");
      const pendingSlow = deferred();
      const resolveImageUrl = vi.fn((path: string) =>
        path.includes("slow")
          ? pendingSlow.promise
          : Promise.resolve("blob:queued"),
      );
      const manager = new GraphImageManager(graphOf([queued, slow]) as any);
      const options = {
        showImages: true,
        resolveImageUrl,
        releaseImageUrl: vi.fn(),
      };

      manager.sync(options);
      // Let the fast result enter the paint queue while the slow result keeps
      // the pass open and inside the 40 ms paint window.
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(queued.data("resolvedImage")).toBeUndefined();

      manager.sync(options);

      expect(
        resolveImageUrl.mock.calls.filter(([p]) => p.includes("queued")),
      ).toHaveLength(1);
      pendingSlow.resolve("blob:slow");
      await until(() => queued.data("resolvedImage") === "blob:queued");
    });

    it("keeps the number of images resolving at once bounded", async () => {
      const nodes = Array.from({ length: 60 }, (_, i) => makeNode(`n${i}`));
      let active = 0;
      let peak = 0;
      const resolveImageUrl = vi.fn(async () => {
        peak = Math.max(peak, ++active);
        await new Promise((r) => setTimeout(r, 2));
        active--;
        return "blob:x";
      });
      new GraphImageManager(graphOf(nodes) as any).sync({
        showImages: true,
        resolveImageUrl,
        releaseImageUrl: vi.fn(),
      });

      await until(
        () => resolveImageUrl.mock.calls.length === 60 && active === 0,
      );

      expect(resolveImageUrl).toHaveBeenCalledTimes(60);
      expect(peak).toBeLessThanOrEqual(24);
      expect(peak).toBeGreaterThan(6);
    });

    it("resolves nodes in the viewport before the ones off-screen", async () => {
      const offscreen = makeNode("off", 5000, 5000);
      const onscreen = makeNode("on", 10, 10);
      const order: string[] = [];
      const resolveImageUrl = vi.fn(async (path: string) => {
        order.push(path);
        return "blob:x";
      });
      new GraphImageManager(
        graphOf([offscreen, onscreen], {
          extent: () => ({ x1: 0, y1: 0, x2: 100, y2: 100 }),
        }) as any,
      ).sync({
        showImages: true,
        resolveImageUrl,
        releaseImageUrl: vi.fn(),
      });

      await until(() => order.length === 2);

      expect(order).toEqual(["img/on.png", "img/off.png"]);
    });

    it("keeps painting the rest when one image fails, and retries the failure next sync", async () => {
      const nodes = [makeNode("bad"), makeNode("good")];
      const onError = vi.fn();
      const resolveImageUrl = vi.fn(async (path: string) => {
        if (path.includes("bad")) throw new Error("boom");
        return "blob:good";
      });
      const manager = new GraphImageManager(graphOf(nodes) as any);
      const options = {
        showImages: true,
        resolveImageUrl,
        releaseImageUrl: vi.fn(),
        onError,
      };
      manager.sync(options);

      await until(() => nodes[1].data("resolvedImage") === "blob:good");

      expect(onError).toHaveBeenCalledTimes(1);
      expect(nodes[0].data("resolvedImage")).toBeUndefined();
      // The failed node is no longer marked as resolving, so a later sync
      // picks it up again instead of skipping it forever.
      await until(() => resolveImageUrl.mock.calls.length >= 2);
      manager.sync(options);
      await until(() => resolveImageUrl.mock.calls.length >= 3);
      expect(
        resolveImageUrl.mock.calls.filter(([p]) => p.includes("bad")),
      ).toHaveLength(2);
    });

    it("paints nothing once the graph has been destroyed (negative)", async () => {
      const nodes = [makeNode("a")];
      const late = deferred();
      const cy = graphOf(nodes);
      new GraphImageManager(cy as any).sync({
        showImages: true,
        resolveImageUrl: () => late.promise,
        releaseImageUrl: vi.fn(),
      });

      cy.destroyed.mockReturnValue(true);
      late.resolve("blob:late");
      await new Promise((r) => setTimeout(r, 80));

      expect(cy.batch).not.toHaveBeenCalled();
      expect(nodes[0].data("resolvedImage")).toBeUndefined();
    });
  });
});
