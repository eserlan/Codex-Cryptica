import { describe, it, expect, afterEach } from "vitest";
import { browserStorage } from "./runtime-deps";

const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

afterEach(() => {
  if (original) Object.defineProperty(globalThis, "localStorage", original);
});

describe("browserStorage", () => {
  it("no-ops / returns null when localStorage access throws", () => {
    const throwing = {
      getItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
      setItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
      removeItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
    };
    Object.defineProperty(globalThis, "localStorage", {
      value: throwing,
      configurable: true,
    });

    expect(browserStorage.getItem("k")).toBeNull();
    expect(() => browserStorage.setItem("k", "v")).not.toThrow();
    expect(() => browserStorage.removeItem("k")).not.toThrow();
  });

  it("delegates to localStorage when available", () => {
    const map = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: (k: string) => map.get(k) ?? null,
        setItem: (k: string, v: string) => void map.set(k, v),
        removeItem: (k: string) => void map.delete(k),
      },
      configurable: true,
    });

    browserStorage.setItem("k", "v");
    expect(browserStorage.getItem("k")).toBe("v");
    browserStorage.removeItem("k");
    expect(browserStorage.getItem("k")).toBeNull();
  });
});
