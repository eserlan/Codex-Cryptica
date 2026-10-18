import { describe, it, expect, vi, beforeEach } from "vitest";
import cytoscape from "cytoscape";
import { GraphImageManager, RESOLVE_CONCURRENCY } from "./ImageManager";

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

  it("applies image data without refreshing the whole graph stylesheet", async () => {
    const manager = new GraphImageManager(mockCy);
    const resolveImageUrl = vi.fn().mockResolvedValue("blob:url");
    const releaseImageUrl = vi.fn();
    let notifyBatchApplied!: () => void;
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

    expect(mockStyle.update).not.toHaveBeenCalled();
    expect(mockNode.data).toHaveBeenCalledWith("resolvedImage", "blob:url");
  });

  it("should clear the local urlCache when clearImages is called", async () => {
    const manager = new GraphImageManager(mockCy);
    const resolveImageUrl = vi.fn().mockResolvedValue("blob:url1");
    const releaseImageUrl = vi.fn();
    let notifyFirstBatch!: () => void;
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
    let notifySecondBatch!: () => void;
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

  it("keeps an image node unchanged until the image is ready", async () => {
    mockNode.data.mockImplementation((key: string) =>
      key === "image" ? "images/a.png" : null,
    );
    const manager = new GraphImageManager(mockCy);
    let resolveImage!: (url: string) => void;
    const image = new Promise<string>((resolve) => {
      resolveImage = resolve;
    });
    let finish!: () => void;
    const applied = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const silhouette = vi
      .fn()
      .mockResolvedValue("data:image/svg+xml;utf8,pending");
    manager.sync({
      showImages: true,
      resolveImageUrl: () => image,
      releaseImageUrl: vi.fn(),
      resolveSilhouetteUrl: silhouette,
      onBatchApplied: finish,
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(silhouette).not.toHaveBeenCalled();
    expect(mockCy.batch).not.toHaveBeenCalled();
    resolveImage("blob:ready");
    await applied;
    expect(mockCy.batch).toHaveBeenCalledTimes(1);
    expect(mockNode.data).toHaveBeenCalledWith("resolvedImage", "blob:ready");
  });

  it("falls back to a silhouette when an image cannot be resolved", async () => {
    mockNode.data.mockImplementation((key: string) =>
      key === "image" ? "images/a.png" : null,
    );
    const manager = new GraphImageManager(mockCy);
    const resolveSilhouetteUrl = vi
      .fn()
      .mockResolvedValue("data:image/svg+xml;utf8,fallback");
    let finish!: () => void;
    const applied = new Promise<void>((resolve) => {
      finish = resolve;
    });
    manager.sync({
      showImages: true,
      resolveImageUrl: vi.fn().mockResolvedValue(""),
      releaseImageUrl: vi.fn(),
      resolveSilhouetteUrl,
      onBatchApplied: finish,
    });
    await applied;
    expect(resolveSilhouetteUrl).toHaveBeenCalledWith(mockNode);
    expect(mockNode.data).toHaveBeenCalledWith(
      "resolvedImage",
      "data:image/svg+xml;utf8,fallback",
    );
  });

  it("should resolve silhouette when node has no custom image", async () => {
    const manager = new GraphImageManager(mockCy);
    const resolveImageUrl = vi.fn();
    const releaseImageUrl = vi.fn();
    const resolveSilhouetteUrl = vi
      .fn()
      .mockReturnValue("data:image/svg+xml;utf8,test-svg");
    let notifyBatch!: () => void;
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
    expect(mockStyle.update).not.toHaveBeenCalled();
  });

  it("should re-resolve visual when silhouette override changes", async () => {
    const manager = new GraphImageManager(mockCy);
    const resolveImageUrl = vi.fn();
    const releaseImageUrl = vi.fn();
    const resolveSilhouetteUrl = vi
      .fn()
      .mockReturnValue("data:image/svg+xml;utf8,updated-svg");
    let notifyBatch!: () => void;
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
      let notifyBatch!: () => void;
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
      let notifyBatch!: () => void;
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
      nodes: vi.fn().mockReturnValue({
        filter: (fn: (node: any) => boolean) => nodes.filter(fn),
      }),
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

    it("paints 1,000 ready images in one batch without temporary silhouettes", async () => {
      const nodes = Array.from({ length: 1000 }, (_, i) => makeNode(`n${i}`));
      const cy = graphOf(nodes);
      const batch = vi.spyOn(cy, "batch");
      const silhouette = vi
        .fn()
        .mockResolvedValue("data:image/svg+xml;utf8,fallback");
      const manager = new GraphImageManager(cy as any);
      manager.sync({
        showImages: true,
        resolveImageUrl: vi.fn().mockResolvedValue("blob:ready"),
        releaseImageUrl: vi.fn(),
        resolveSilhouetteUrl: silhouette,
      });
      await until(() =>
        nodes.every((node) => node.data("resolvedImage") === "blob:ready"),
      );
      expect(batch).toHaveBeenCalledTimes(1);
      expect(silhouette).not.toHaveBeenCalled();
    });

    it("holds a failure fallback stable until retry time, then retries", async () => {
      const node = makeNode("failed");
      const cy = graphOf([node]);
      let now = 0;
      const manager = new GraphImageManager(cy as any, () => now);
      const resolveImageUrl = vi.fn().mockResolvedValue("");
      const options = {
        showImages: true,
        resolveImageUrl,
        releaseImageUrl: vi.fn(),
        resolveSilhouetteUrl: vi
          .fn()
          .mockResolvedValue("data:image/svg+xml;utf8,fallback"),
      };
      manager.sync(options);
      await until(() => node.data("isSilhouette") === true);
      manager.sync(options);
      manager.sync(options);
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(resolveImageUrl).toHaveBeenCalledTimes(1);
      now = 5 * 60_000;
      resolveImageUrl.mockResolvedValue("blob:recovered");
      manager.sync(options);
      await until(() => node.data("resolvedImage") === "blob:recovered");
      expect(resolveImageUrl).toHaveBeenCalledTimes(2);
    });

    it("replaces changed image paths without releasing a shared image still in use", async () => {
      const nodes = [makeNode("a"), makeNode("b")];
      nodes.forEach((node) => node.data("image", "shared.png"));
      const manager = new GraphImageManager(graphOf(nodes) as any);
      const releaseImageUrl = vi.fn();
      const options = {
        showImages: true,
        resolveImageUrl: vi.fn(async (path) => `blob:${path}`),
        releaseImageUrl,
      };
      manager.sync(options);
      await until(() =>
        nodes.every((node) => node.data("resolvedImage") === "blob:shared.png"),
      );
      nodes[0].data("image", "replacement.png");
      manager.sync(options);
      await until(
        () => nodes[0].data("resolvedImage") === "blob:replacement.png",
      );
      expect(releaseImageUrl).not.toHaveBeenCalledWith("shared.png");
      nodes[1].data("image", "replacement.png");
      manager.sync(options);
      await until(
        () => nodes[1].data("resolvedImage") === "blob:replacement.png",
      );
      expect(releaseImageUrl).toHaveBeenCalledWith("shared.png");
    });

    it("spaces later paints so each costs one redraw, but never drops a late image", async () => {
      const nodes = [makeNode("a"), makeNode("b"), makeNode("c")];
      const late = [deferred(), deferred()];
      const resolveImageUrl = vi.fn((path: string) =>
        path.includes("/a.")
          ? Promise.resolve("blob:a")
          : path.includes("/b.")
            ? late[0].promise
            : late[1].promise,
      );
      const cy = graphOf(nodes);
      const batch = vi.spyOn(cy, "batch");
      new GraphImageManager(cy as any).sync({
        showImages: true,
        resolveImageUrl,
        releaseImageUrl: vi.fn(),
        holdMaxMs: 20,
      });

      // Once the hold has timed out, the first image paints quickly.
      await until(() => nodes[0].data("resolvedImage") === "blob:a");
      expect(batch).toHaveBeenCalledTimes(1);

      // Images finishing just after are held for the next spaced paint
      // instead of each triggering its own redraw.
      late[0].resolve("blob:b");
      await new Promise((r) => setTimeout(r, 200));
      expect(nodes[1].data("resolvedImage")).toBeUndefined();
      late[1].resolve("blob:c");

      await until(() => nodes[2].data("resolvedImage") === "blob:c");
      expect(nodes[1].data("resolvedImage")).toBe("blob:b");
      expect(nodes[2].data("resolvedImage")).toBe("blob:c");
      expect(batch).toHaveBeenCalledTimes(2);
    });

    it("holds finished images until the slow one is done, then shows all in one batch", async () => {
      const nodes = [makeNode("fast"), makeNode("slow")];
      const slow = deferred();
      const resolveImageUrl = vi.fn((path: string) =>
        path.includes("slow") ? slow.promise : Promise.resolve("blob:fast"),
      );
      const cy = graphOf(nodes);
      const batch = vi.spyOn(cy, "batch");
      new GraphImageManager(cy as any).sync({
        showImages: true,
        resolveImageUrl,
        releaseImageUrl: vi.fn(),
      });

      await until(() => resolveImageUrl.mock.calls.length === 2);
      await new Promise((r) => setTimeout(r, 300));
      expect(nodes[0].data("resolvedImage")).toBeUndefined();
      expect(batch).not.toHaveBeenCalled();

      slow.resolve("blob:slow");
      await until(() => nodes[1].data("resolvedImage") === "blob:slow");
      expect(nodes[0].data("resolvedImage")).toBe("blob:fast");
      expect(batch).toHaveBeenCalledTimes(1);
    });

    it("shows what is ready once the hold times out, without waiting for a slow image (negative)", async () => {
      const nodes = [makeNode("fast"), makeNode("slow")];
      const slow = deferred();
      const resolveImageUrl = vi.fn((path: string) =>
        path.includes("slow") ? slow.promise : Promise.resolve("blob:fast"),
      );
      new GraphImageManager(graphOf(nodes) as any).sync({
        showImages: true,
        resolveImageUrl,
        releaseImageUrl: vi.fn(),
        holdMaxMs: 20,
      });

      await until(() => nodes[0].data("resolvedImage") === "blob:fast");
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
      const total = RESOLVE_CONCURRENCY * 2;
      const nodes = Array.from({ length: total }, (_, i) => makeNode(`n${i}`));
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
        () => resolveImageUrl.mock.calls.length === total && active === 0,
      );

      expect(resolveImageUrl).toHaveBeenCalledTimes(total);
      expect(peak).toBeLessThanOrEqual(RESOLVE_CONCURRENCY);
      // The bound is actually reached, not just never exceeded.
      expect(peak).toBeGreaterThan(RESOLVE_CONCURRENCY / 2);
      expect(peak).toBeGreaterThan(6);
    });

    it("defers offscreen images until a viewport sync brings them nearby", async () => {
      const offscreen = makeNode("off", 5000, 5000);
      const onscreen = makeNode("on", 10, 10);
      const order: string[] = [];
      const resolveImageUrl = vi.fn(async (path: string) => {
        order.push(path);
        return "blob:x";
      });
      let extent = { x1: 0, y1: 0, x2: 100, y2: 100 };
      const manager = new GraphImageManager(
        graphOf([offscreen, onscreen], { extent: () => extent }) as any,
      );
      const options = {
        showImages: true,
        resolveImageUrl,
        releaseImageUrl: vi.fn(),
      };
      manager.sync(options);
      await until(() => onscreen.data("resolvedImage") === "blob:x");
      expect(order).toEqual(["img/on.png"]);

      extent = { x1: 4900, y1: 4900, x2: 5100, y2: 5100 };
      manager.sync(options);
      await until(() => offscreen.data("resolvedImage") === "blob:x");
      expect(order).toEqual(["img/on.png", "img/off.png"]);
    });

    it("loads only nearby images in a 1200-node vault and reacts to panning", async () => {
      const nodes = Array.from({ length: 1200 }, (_, i) =>
        makeNode(`n${i}`, i * 100, 50),
      );
      let extent = { x1: 0, y1: 0, x2: 200, y2: 100 };
      const on = vi.fn();
      const off = vi.fn();
      const cy = graphOf(nodes, { extent: () => extent, on, off });
      const manager = new GraphImageManager(cy as any);
      const resolveImageUrl = vi.fn().mockResolvedValue("blob:x");
      const options = {
        showImages: true,
        resolveImageUrl,
        releaseImageUrl: vi.fn(),
      };
      manager.sync(options);
      await until(() => nodes[2].data("resolvedImage") === "blob:x");
      expect(resolveImageUrl).toHaveBeenCalledTimes(3);
      expect(nodes[1199].data("resolvedImage")).toBeUndefined();

      extent = { x1: 119700, y1: 0, x2: 119900, y2: 100 };
      const viewportChanged = on.mock.calls[0][1];
      viewportChanged();
      viewportChanged();
      await until(() => nodes[1199].data("resolvedImage") === "blob:x");
      expect(resolveImageUrl).toHaveBeenCalledTimes(6);
      expect(on).toHaveBeenCalledTimes(1);
      manager.destroy(options);
      expect(off).toHaveBeenCalledWith(
        "viewport layoutstop position",
        viewportChanged,
      );
    });

    it("does not load hidden nodes or watch the viewport while images are disabled", async () => {
      const visible = makeNode("visible", 10, 10);
      const hidden = { ...makeNode("hidden", 20, 20), hidden: () => true };
      const on = vi.fn();
      const off = vi.fn();
      const manager = new GraphImageManager(
        graphOf([visible, hidden], { on, off }) as any,
      );
      const options = {
        showImages: true,
        resolveImageUrl: vi.fn().mockResolvedValue("blob:x"),
        releaseImageUrl: vi.fn(),
      };
      manager.sync(options);
      await until(() => visible.data("resolvedImage") === "blob:x");
      expect(options.resolveImageUrl).toHaveBeenCalledTimes(1);
      manager.sync({ ...options, showImages: false });
      expect(off).toHaveBeenCalledTimes(1);
      manager.sync({ ...options, showImages: false });
      expect(on).toHaveBeenCalledTimes(1);
      manager.destroy(options);
    });

    it("abandons queued offscreen images after a pan and keeps overlapping pools bounded", async () => {
      const total = RESOLVE_CONCURRENCY * 3;
      const nodes = Array.from({ length: total }, (_, i) =>
        makeNode(`n${i}`, i * 10, 50),
      );
      const last = total - 1;
      const queuedFar = RESOLVE_CONCURRENCY + 10;
      let extent = { x1: 0, y1: 0, x2: last * 10, y2: 100 };
      const pending = deferred();
      const resolveImageUrl = vi.fn((_path: string) => pending.promise);
      const manager = new GraphImageManager(
        graphOf(nodes, { extent: () => extent }) as any,
      );
      const options = {
        showImages: true,
        resolveImageUrl,
        releaseImageUrl: vi.fn(),
      };
      manager.sync(options);
      expect(resolveImageUrl).toHaveBeenCalledTimes(RESOLVE_CONCURRENCY);
      extent = { x1: last * 10 - 200, y1: 0, x2: last * 10, y2: 100 };
      manager.sync(options);
      expect(resolveImageUrl).toHaveBeenCalledTimes(RESOLVE_CONCURRENCY);
      pending.resolve("blob:x");
      await until(() => nodes[last].data("resolvedImage") === "blob:x");
      expect(
        resolveImageUrl.mock.calls.some(
          ([path]) => path === `img/n${queuedFar}.png`,
        ),
      ).toBe(false);
      expect(nodes[last].data("resolvedImage")).toBe("blob:x");
      manager.destroy(options);
    });

    it("does not paint a late result after images are switched off", async () => {
      const node = makeNode("late");
      const pending = deferred();
      const manager = new GraphImageManager(graphOf([node]) as any);
      const releaseImageUrl = vi.fn();
      const options = {
        showImages: true,
        resolveImageUrl: () => pending.promise,
        releaseImageUrl,
      };
      manager.sync(options);
      manager.sync({ ...options, showImages: false });
      pending.resolve("blob:late");
      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(node.data("resolvedImage")).toBeUndefined();
      expect(releaseImageUrl).toHaveBeenCalledWith("img/late.png");
      manager.destroy(options);
    });

    it("releases a resolved image still waiting to paint when destroyed", async () => {
      const nodes = [makeNode("fast"), makeNode("slow")];
      const pending = deferred();
      const releaseImageUrl = vi.fn();
      const manager = new GraphImageManager(graphOf(nodes) as any);
      const options = {
        showImages: true,
        resolveImageUrl: (path: string) =>
          path.includes("slow")
            ? pending.promise
            : Promise.resolve("blob:fast"),
        releaseImageUrl,
      };
      manager.sync(options);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(nodes[0].data("resolvedImage")).toBeUndefined();
      manager.destroy(options);
      expect(releaseImageUrl).toHaveBeenCalledWith("img/fast.png");
      pending.resolve("blob:slow");
      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(nodes[0].data("resolvedImage")).toBeUndefined();
      expect(releaseImageUrl).toHaveBeenCalledWith("img/slow.png");
    });

    it("updates real Cytoscape image selectors using only the node data batch", async () => {
      const cy = cytoscape({
        headless: true,
        styleEnabled: true,
        elements: [{ data: { id: "portrait", image: "img/portrait.png" } }],
        style: [
          { selector: "node", style: { "border-width": 0 } },
          { selector: "node[resolvedImage]", style: { "border-width": 7 } },
        ],
      });
      const update = vi.spyOn(cy.style(), "update");
      const manager = new GraphImageManager(cy);
      const options = {
        showImages: true,
        resolveImageUrl: async () => "blob:portrait",
        releaseImageUrl: vi.fn(),
      };
      manager.sync(options);
      await until(
        () => cy.$id("portrait").data("resolvedImage") === "blob:portrait",
      );
      expect(cy.$id("portrait").style("border-width")).toBe("7px");
      expect(update).not.toHaveBeenCalled();
      manager.sync({ ...options, showImages: false });
      expect(cy.$id("portrait").style("border-width")).toBe("0px");
      manager.destroy(options);
      cy.destroy();
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
