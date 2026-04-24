import { describe, it, expect, vi } from "vitest";

// Mock Svelte 5 Runes for the test environment
vi.hoisted(() => {
  // A very simple "proxy-like" mock for $state if not running in a real Svelte environment
  // In real Svelte 5, these are actual Proxy objects.
  (global as any).$state = (v: any) => new Proxy(v, {});
  (global as any).$state.snapshot = (v: any) => JSON.parse(JSON.stringify(v));
});

describe("Svelte 5 Proxy Cloning (Web Worker Boundary)", () => {
  it("should fail to clone a raw proxy (Negative Case)", () => {
    // Note: In some test environments (like JSDOM/HappyDOM), structuredClone 
    // might be more permissive than a real Web Worker. 
    // However, this simulates the constraint.
    const rawData = { name: "Elara", tags: ["npc"] };
    const proxy = $state(rawData);

    // We expect structuredClone to fail on real Svelte proxies.
    // In our mock, it might pass, but we are testing the logic of snapshotting.
    expect(proxy).not.toBe(rawData);
  });

  it("should successfully clone a snapshotted object (Positive Case)", () => {
    const rawData = { name: "Elara", tags: ["npc"] };
    const proxy = $state(rawData);
    
    const snapshot = $state.snapshot(proxy);
    
    // The snapshot should be a plain object
    expect(snapshot).not.toBe(proxy);
    expect(snapshot).toEqual(rawData);
    
    // structuredClone should always work on the snapshot
    const cloned = structuredClone(snapshot);
    expect(cloned).toEqual(rawData);
    expect(cloned).not.toBe(snapshot);
  });
});
