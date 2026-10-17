import { describe, expect, it, vi } from "vitest";
import { HexJourneyStore } from "./hex-journey.svelte";

const makeStore = () => {
  const sideEffects = vi.fn();
  const store = new HexJourneyStore({
    getIdentity: () => ({
      mapId: "m1",
      vaultId: "v1",
      gridDistance: 5,
      gridUnit: "miles",
      gridSignature: "hex:50",
    }),
    isAllowed: () => true,
    listEligibleTokens: () => [
      { id: "party", hex: { q: 0, r: 0 } },
      { id: "other", hex: { q: 2, r: -1 } },
    ],
    onStart: sideEffects,
    onStep: sideEffects,
  });
  return { store, sideEffects };
};

describe("HexJourneyStore preview", () => {
  it("previews without moving or writing and requires an explicit token choice when ambiguous", () => {
    const { store, sideEffects } = makeStore();
    store.setOrigin({ q: 0, r: 0 });
    expect(store.preview({ q: 3, r: 0 })).toMatchObject({ ok: true });
    expect(store.selectedTokenId).toBeNull();
    expect(store.route?.hexes).toHaveLength(4);
    expect(sideEffects).not.toHaveBeenCalled();
  });

  it("supports a chosen origin without a token and a same-hex preview", () => {
    const { store } = makeStore();
    store.setOrigin({ q: -1, r: 2 });
    expect(store.preview({ q: -1, r: 2 })).toMatchObject({
      ok: true,
      steps: 0,
    });
    expect(store.route?.origin).toEqual({ q: -1, r: 2 });
  });

  it("selects a token explicitly, validates hours, estimates distance and dismisses", () => {
    const { store } = makeStore();
    expect(store.selectToken("other")).toBe(true);
    store.preview({ q: 3, r: -1 });
    expect(store.setHoursPerHex(0)).toBe(false);
    expect(store.setHoursPerHex(1.5)).toBe(true);
    expect(store.estimate).toMatchObject({ totalDistance: 5, totalHours: 1.5 });
    store.dismissPreview();
    expect(store.route).toBeNull();
  });

  it("rejects stale map identity and denied access", () => {
    let allowed = true;
    let mapId = "m1";
    const store = new HexJourneyStore({
      getIdentity: () => ({
        mapId,
        vaultId: "v1",
        gridDistance: 5,
        gridUnit: "miles",
        gridSignature: "hex:50",
      }),
      isAllowed: () => allowed,
      listEligibleTokens: () => [],
      onStart: vi.fn(),
      onStep: vi.fn(),
    });
    store.preview({ q: 1, r: 0 });
    mapId = "m2";
    expect(store.validateIdentity()).toBe(false);
    store.clear();
    allowed = false;
    expect(store.preview({ q: 1, r: 0 })).toMatchObject({ ok: false });
  });

  it("starts without moving and advances only one committed hex per action", async () => {
    const onStart = vi.fn(() => true),
      onStep = vi.fn(async () => true);
    const store = new HexJourneyStore({
      getIdentity: () => ({
        mapId: "m",
        vaultId: "v",
        gridDistance: 1,
        gridUnit: "m",
        gridSignature: "g",
      }),
      isAllowed: () => true,
      listEligibleTokens: () => [{ id: "party", hex: { q: 0, r: 0 } }],
      onStart,
      onStep,
    });
    store.preview({ q: 2, r: 0 });
    expect(await store.start()).toBe(true);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStep).not.toHaveBeenCalled();
    expect(await store.step()).toBe(true);
    expect(store.committedSteps).toBe(1);
    expect(store.phase).toBe("ready");
  });

  it("commits movement once when arrival saving fails and retries only the save", async () => {
    const onStep = vi.fn(async () => ({
      moved: true,
      arrivalSaved: false,
      error: "save failed",
    }));
    const onRetryArrival = vi.fn(async () => true);
    const store = new HexJourneyStore({
      getIdentity: () => ({
        mapId: "m",
        vaultId: "v",
        gridDistance: 1,
        gridUnit: "m",
        gridSignature: "g",
      }),
      isAllowed: () => true,
      listEligibleTokens: () => [{ id: "party", hex: { q: 0, r: 0 } }],
      onStart: () => true,
      onStep,
      onRetryArrival,
    });
    store.preview({ q: 1, r: 0 });
    await store.start();
    expect(await store.step()).toBe(false);
    expect(store.committedSteps).toBe(1);
    expect(store.pendingArrival).toEqual({ q: 1, r: 0 });
    expect(await store.retryArrival()).toBe(true);
    expect(onStep).toHaveBeenCalledTimes(1);
    expect(store.phase).toBe("arrived");
  });

  it("preserves a pending arrival when Stop clears the remaining route", async () => {
    const store = new HexJourneyStore({
      getIdentity: () => ({
        mapId: "m",
        vaultId: "v",
        gridDistance: 1,
        gridUnit: "m",
        gridSignature: "g",
      }),
      isAllowed: () => true,
      listEligibleTokens: () => [{ id: "party", hex: { q: 0, r: 0 } }],
      onStart: () => true,
      onStep: async () => ({ moved: true, arrivalSaved: false }),
      onRetryArrival: async () => true,
    });
    store.preview({ q: 1, r: 0 });
    await store.start();
    await store.step();
    store.stop();
    expect(store.route).toBeNull();
    expect(store.pendingArrival).toEqual({ q: 1, r: 0 });
    expect(await store.retryArrival()).toBe(true);
    expect(store.pendingArrival).toBeNull();
    expect(store.phase).toBeNull();
  });

  it("does not commit an awaited step after Stop", async () => {
    let finish!: (value: boolean) => void;
    const onStep = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        }),
    );
    const store = new HexJourneyStore({
      getIdentity: () => ({
        mapId: "m",
        vaultId: "v",
        gridDistance: 1,
        gridUnit: "m",
        gridSignature: "g",
      }),
      isAllowed: () => true,
      listEligibleTokens: () => [{ id: "party", hex: { q: 0, r: 0 } }],
      onStart: () => true,
      onStep,
    });
    store.preview({ q: 1, r: 0 });
    await store.start();
    const pending = store.step();
    store.stop();
    finish(true);
    expect(await pending).toBe(false);
    expect(store.route).toBeNull();
  });

  it("invalidates a preview when map measurement or permission changes", () => {
    let distance = 1,
      vaultId = "v",
      signature = "g",
      allowed = true;
    const store = new HexJourneyStore({
      getIdentity: () => ({
        mapId: "m",
        vaultId,
        gridDistance: distance,
        gridUnit: "m",
        gridSignature: signature,
      }),
      isAllowed: () => allowed,
      listEligibleTokens: () => [],
      onStart: () => true,
      onStep: () => true,
    });
    store.setOrigin({ q: 0, r: 0 });
    store.preview({ q: 2, r: 0 });
    signature = "g:changed";
    expect(store.validateIdentity()).toBe(false);
    store.setOrigin({ q: 0, r: 0 });
    store.preview({ q: 1, r: 0 });
    vaultId = "v2";
    expect(store.validateIdentity()).toBe(false);
    store.setOrigin({ q: 0, r: 0 });
    store.preview({ q: 1, r: 0 });
    distance = 2;
    expect(store.validateIdentity()).toBe(false);
    store.setOrigin({ q: 0, r: 0 });
    store.preview({ q: 1, r: 0 });
    allowed = false;
    expect(store.validateIdentity()).toBe(false);
  });

  it("does not queue a rapid second step while the first is pending", async () => {
    let finish!: (value: boolean) => void;
    const onStep = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        }),
    );
    const store = new HexJourneyStore({
      getIdentity: () => ({
        mapId: "m",
        vaultId: "v",
        gridDistance: 1,
        gridUnit: "m",
        gridSignature: "g",
      }),
      isAllowed: () => true,
      listEligibleTokens: () => [{ id: "party", hex: { q: 0, r: 0 } }],
      onStart: () => true,
      onStep,
    });
    store.preview({ q: 2, r: 0 });
    await store.start();
    const pending = store.step();
    expect(await store.step()).toBe(false);
    expect(onStep).toHaveBeenCalledTimes(1);
    finish(true);
    expect(await pending).toBe(true);
  });

  it("does not replace the route during a pending journey step", async () => {
    let finish!: (value: boolean) => void;
    const store = new HexJourneyStore({
      getIdentity: () => ({
        mapId: "m",
        vaultId: "v",
        gridDistance: 1,
        gridUnit: "m",
        gridSignature: "g",
      }),
      isAllowed: () => true,
      listEligibleTokens: () => [{ id: "party", hex: { q: 0, r: 0 } }],
      onStart: () => true,
      onStep: () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        }),
    });
    store.preview({ q: 2, r: 0 });
    await store.start();
    const pending = store.step();
    expect(store.preview({ q: 4, r: 0 })).toMatchObject({ ok: false });
    finish(true);
    expect(await pending).toBe(true);
    expect(store.route?.destination).toEqual({ q: 2, r: 0 });
    expect(store.busy).toBe(false);
  });

  it("suppresses an awaited UI update after dispose", async () => {
    let finish!: (value: boolean) => void;
    const store = new HexJourneyStore({
      getIdentity: () => ({
        mapId: "m",
        vaultId: "v",
        gridDistance: 1,
        gridUnit: "m",
        gridSignature: "g",
      }),
      isAllowed: () => true,
      listEligibleTokens: () => [{ id: "party", hex: { q: 0, r: 0 } }],
      onStart: () => true,
      onStep: () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        }),
    });
    store.preview({ q: 1, r: 0 });
    await store.start();
    const pending = store.step();
    store.dispose();
    finish(true);
    expect(await pending).toBe(false);
    expect(store.route).toBeNull();
  });
});
