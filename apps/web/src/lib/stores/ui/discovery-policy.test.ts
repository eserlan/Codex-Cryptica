import { describe, it, expect, vi } from "vitest";

// Stub $state before importing the store
(global as any).$state = (v: any) => v;

import { DiscoveryPolicyStore } from "./discovery-policy.svelte";
import { UIPersistence } from "./persistence";

describe("DiscoveryPolicyStore", () => {
  it("initializes with default values", () => {
    const mockStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const persistence = new UIPersistence({ storage: mockStorage });
    const store = new DiscoveryPolicyStore(persistence);

    expect(store.aiDisabled).toBe(false);
    expect(store.autoArchive).toBe(false);
    expect(store.entityDiscoveryMode).toBe("suggest");
    expect(store.connectionDiscoveryMode).toBe("suggest");
  });

  it("handles aiDisabled migration from lite_mode", () => {
    const mockStorage = {
      getItem: vi.fn((key) => {
        if (key === "codex_lite_mode") return "true";
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const persistence = new UIPersistence({ storage: mockStorage });
    const store = new DiscoveryPolicyStore(persistence);

    expect(store.aiDisabled).toBe(true);
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      "codex_ai_disabled",
      "true",
    );
    expect(mockStorage.removeItem).toHaveBeenCalledWith("codex_lite_mode");
  });

  it("initializes oracle settings from persistence", () => {
    const mockStorage = {
      getItem: vi.fn((key) => {
        if (key === "codex_entity_discovery_mode") return "auto-create";
        if (key === "codex_connection_discovery_mode") return "off";
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const persistence = new UIPersistence({ storage: mockStorage });
    const store = new DiscoveryPolicyStore(persistence);

    expect(store.entityDiscoveryMode).toBe("auto-create");
    expect(store.autoArchive).toBe(true);
    expect(store.connectionDiscoveryMode).toBe("off");
  });

  it("falls back to auto_archive key if entity_discovery_mode is missing", () => {
    const mockStorage = {
      getItem: vi.fn((key) => {
        if (key === "codex_auto_archive") return "true";
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const persistence = new UIPersistence({ storage: mockStorage });
    const store = new DiscoveryPolicyStore(persistence);

    expect(store.autoArchive).toBe(true);
    expect(store.entityDiscoveryMode).toBe("auto-create");
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      "codex_entity_discovery_mode",
      "auto-create",
    );
  });

  it("updates settings and persists", () => {
    const mockStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const persistence = new UIPersistence({ storage: mockStorage });
    const store = new DiscoveryPolicyStore(persistence);

    store.toggleAiDisabled(true);
    expect(store.aiDisabled).toBe(true);
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      "codex_ai_disabled",
      "true",
    );

    store.setEntityDiscoveryMode("off");
    expect(store.entityDiscoveryMode).toBe("off");
    expect(store.autoArchive).toBe(false);
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      "codex_entity_discovery_mode",
      "off",
    );
  });
});
