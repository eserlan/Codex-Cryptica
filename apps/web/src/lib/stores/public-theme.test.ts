import { describe, expect, it, vi } from "vitest";
import {
  PUBLIC_THEME_STORAGE_KEY,
  PublicThemeStore,
} from "./public-theme.svelte";

function session() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) =>
      void values.set(key, value),
    ),
    removeItem: vi.fn((key: string) => void values.delete(key)),
  };
}

describe("public browsing theme", () => {
  it("inherits the selected genre between otherwise unthemed destinations", () => {
    const storage = session();
    const store = new PublicThemeStore(storage);
    expect(store.themeId).toBeNull();
    store.setTheme("cyberpunk");
    expect(store.themeId).toBe("cyberpunk");
    expect(storage.values.get(PUBLIC_THEME_STORAGE_KEY)).toBe("cyberpunk");
    // No clearing occurs merely because the next page has no theme.
    expect(store.themeId).toBe("cyberpunk");
  });

  it("restores from the current tab after a reload", () => {
    const storage = session();
    new PublicThemeStore(storage).setTheme("pirate");
    expect(new PublicThemeStore(storage).themeId).toBe("pirate");
  });

  it("explicit destinations override the previously browsed genre", () => {
    const store = new PublicThemeStore(session());
    store.setTheme("cyberpunk");
    store.setTheme("pirate");
    expect(store.themeId).toBe("pirate");
  });

  it("ignores unknown and inherited-property theme names", () => {
    const storage = session();
    storage.values.set(PUBLIC_THEME_STORAGE_KEY, "__proto__");
    const store = new PublicThemeStore(storage);
    expect(store.themeId).toBeNull();
    store.setTheme("constructor");
    expect(store.themeId).toBeNull();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("is isolated from other tabs and supports explicit reset", () => {
    const first = new PublicThemeStore(session());
    const second = new PublicThemeStore(session());
    first.setTheme("fantasy");
    expect(second.themeId).toBeNull();
    first.clear();
    expect(first.themeId).toBeNull();
  });

  it("degrades gracefully if sessionStorage is blocked", () => {
    const storage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    const store = new PublicThemeStore(storage);
    store.setTheme("cyberpunk");
    expect(store.themeId).toBe("cyberpunk");
    store.clear();
    expect(store.themeId).toBeNull();
  });
});
