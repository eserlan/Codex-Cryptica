import { describe, it, expect, vi, beforeEach } from "vitest";
import { setupGraphEvents } from "./useGraphEvents";
import type { Core } from "cytoscape";

describe("setupGraphEvents", () => {
  let mockCy: any;

  beforeEach(() => {
    mockCy = {
      on: vi.fn(),
      off: vi.fn(),
    };
  });

  it("should register event listeners on the cy instance", () => {
    const cleanup = setupGraphEvents(mockCy as unknown as Core, {});
    expect(mockCy.on).toHaveBeenCalled();
    expect(cleanup).toBeDefined();
  });

  it("should call off when cleanup is executed", () => {
    const cleanup = setupGraphEvents(mockCy as unknown as Core, {});
    cleanup();
    expect(mockCy.off).toHaveBeenCalled();
  });
});
