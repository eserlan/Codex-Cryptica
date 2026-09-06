import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import { render } from "@testing-library/svelte";
import OracleSidebarPanel from "./OracleSidebarPanel.svelte";
import { HINT_KEYS } from "$lib/config/help-content";
import type { StorageLike } from "$lib/utils/runtime-deps";

describe("OracleSidebarPanel", () => {
  beforeAll(() => {
    // jsdom doesn't implement Element.prototype.animate
    if (!Element.prototype.animate) {
      Element.prototype.animate = vi.fn().mockReturnValue({
        finished: Promise.resolve(),
        cancel: vi.fn(),
      });
    }
  });

  afterAll(() => {
    // @ts-expect-error - jsdom animate type is missing
    delete Element.prototype.animate;
  });

  it("uses the injected storage dependency instead of hardcoded localStorage", () => {
    const mockStorage: StorageLike = {
      getItem: vi.fn().mockReturnValue(null), // simulate not having seen the hint
      setItem: vi.fn(),
      removeItem: vi.fn(),
      length: 0,
      key: vi.fn(),
    };

    render(OracleSidebarPanel, { storage: mockStorage });

    expect(mockStorage.getItem).toHaveBeenCalledWith(
      HINT_KEYS.ORACLE_CONNECTION,
    );
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      HINT_KEYS.ORACLE_CONNECTION,
      "true",
    );
  });
});
