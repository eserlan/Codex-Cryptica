import { describe, it, expect, vi } from "vitest";
import { UIPersistence, UI_STORAGE_KEYS } from "./persistence";

describe("UIPersistence", () => {
  it("locks the legacy UI localStorage key set byte-for-byte", () => {
    expect(Object.values(UI_STORAGE_KEYS).sort()).toEqual([
      "codex-cryptica-active-theme",
      "codex_active_sidebar_tool",
      "codex_ai_disabled",
      "codex_auto_archive",
      "codex_connection_discovery_mode",
      "codex_dismissed_landing",
      "codex_entity_discovery_mode",
      "codex_explorer_collapsed_entity_ids",
      "codex_explorer_collapsed_label_groups",
      "codex_explorer_view_mode",
      "codex_last_connection_label",
      "codex_last_seen_version",
      "codex_left_sidebar_open",
      "codex_left_sidebar_width",
      "codex_lite_mode",
      "codex_recent_connection_labels",
      "codex_right_sidebar_width",
      "codex_skip_landing",
      "codex_vtt_entity_list_collapsed",
      "codex_vtt_sidebar_collapsed",
      "codex_world_page_dismissed_at",
    ]);
  });

  it("uses injected storage", () => {
    const mockStorage = {
      getItem: vi.fn().mockReturnValue("mocked"),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const persistence = new UIPersistence({ storage: mockStorage });

    const result = persistence.read("test_key", (v) => v, "fallback");
    expect(result).toBe("mocked");
    expect(mockStorage.getItem).toHaveBeenCalledWith("test_key");
  });

  it("returns fallback on missing key", () => {
    const mockStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const persistence = new UIPersistence({ storage: mockStorage });

    const result = persistence.read("missing_key", (v) => v, "fallback");
    expect(result).toBe("fallback");
  });

  it("returns fallback and warns on parse failure", () => {
    const mockStorage = {
      getItem: vi.fn().mockReturnValue("not-json"),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const persistence = new UIPersistence({ storage: mockStorage });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const parse = (v: string) => JSON.parse(v);
    const result = persistence.read("bad_key", parse, "fallback");

    expect(result).toBe("fallback");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to parse key "bad_key"'),
      expect.any(Error),
    );
    warnSpy.mockRestore();
  });

  it("writes serialized value", () => {
    const mockStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const persistence = new UIPersistence({ storage: mockStorage });

    persistence.write("test_key", { a: 1 });
    expect(mockStorage.setItem).toHaveBeenCalledWith("test_key", '{"a":1}');
  });

  it("removes key", () => {
    const mockStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const persistence = new UIPersistence({ storage: mockStorage });

    persistence.remove("test_key");
    expect(mockStorage.removeItem).toHaveBeenCalledWith("test_key");
  });

  it("is SSR safe (no-ops when no storage is available)", () => {
    const persistence = new UIPersistence({ storage: undefined });
    // In test environment, window might exist, so to truly test SSR safety we should mock it or rely on the class implementation if we force storage to null.
    // Forcing `storage` to be null by not providing it and assuming `window` is somehow not `localStorage` is hard if `jsdom` is active.
    // Let's create an instance where we know storage is null by passing a mock that isn't provided, but SvelteKit SSR has no window.
    // We can simulate SSR by temporarily removing window, or just accept that injecting `undefined` might fall back to `window.localStorage`.
    // Let's explicitly test the internal state where storage is null.
    Object.defineProperty(persistence, "storage", { value: null });

    expect(persistence.read("key", (v) => v, "fallback")).toBe("fallback");

    expect(() => persistence.write("key", "value")).not.toThrow();
    expect(() => persistence.remove("key")).not.toThrow();
  });
});
