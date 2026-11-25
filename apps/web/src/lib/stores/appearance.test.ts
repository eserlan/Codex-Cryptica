import { describe, expect, it, vi } from "vitest";
import { AppearanceStore, type AppearanceStorage } from "./appearance.svelte";

function createFakeMediaQuery(initialMatches = false) {
  let changeListener: ((e: MediaQueryListEvent) => void) | null = null;
  const mediaQuery = {
    matches: initialMatches,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: vi.fn(
      (event: string, cb: (e: MediaQueryListEvent) => void) => {
        if (event === "change") changeListener = cb;
      },
    ),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;

  return {
    mediaQuery,
    emit(matches: boolean) {
      changeListener?.({ matches } as MediaQueryListEvent);
    },
  };
}

describe("AppearanceStore", () => {
  it("resolves system and explicit appearance modes", () => {
    const storage: AppearanceStorage = {
      load: () => null,
      save: vi.fn(),
    };
    const { mediaQuery } = createFakeMediaQuery(true);
    const store = new AppearanceStore(storage, () => mediaQuery);

    expect(store.appAppearanceId).toBe("system");
    expect(store.resolvedAppAppearanceId).toBe("neutral-dark");

    store.setAppAppearance("neutral-light");
    expect(store.resolvedAppAppearanceId).toBe("neutral-light");
    expect(storage.save).toHaveBeenCalledWith("neutral-light");

    store.setAppAppearance("neutral-dark", false);
    expect(store.resolvedAppAppearanceId).toBe("neutral-dark");
    expect(storage.save).toHaveBeenCalledTimes(1);
  });

  it("reacts to matchMedia changes when in system mode", () => {
    const storage: AppearanceStorage = {
      load: () => "system",
      save: vi.fn(),
    };
    const { mediaQuery, emit } = createFakeMediaQuery(false);
    const store = new AppearanceStore(storage, () => mediaQuery);

    expect(store.resolvedAppAppearanceId).toBe("neutral-light");

    emit(true);
    expect(store.isSystemDark).toBe(true);
    expect(store.resolvedAppAppearanceId).toBe("neutral-dark");

    emit(false);
    expect(store.isSystemDark).toBe(false);
    expect(store.resolvedAppAppearanceId).toBe("neutral-light");
  });

  it("survives storage read/write errors such as private browsing blocks", () => {
    const throwingStorage: AppearanceStorage = {
      load: () => {
        throw new Error("SecurityError: storage disabled");
      },
      save: () => {
        throw new Error("QuotaExceededError");
      },
    };
    const { mediaQuery } = createFakeMediaQuery(false);

    const store = new AppearanceStore(throwingStorage, () => mediaQuery);
    expect(store.appAppearanceId).toBe("system");
    expect(store.resolvedAppAppearanceId).toBe("neutral-light");

    expect(() => store.setAppAppearance("neutral-dark")).not.toThrow();
    expect(store.appAppearanceId).toBe("neutral-dark");
    expect(store.resolvedAppAppearanceId).toBe("neutral-dark");
  });
});
