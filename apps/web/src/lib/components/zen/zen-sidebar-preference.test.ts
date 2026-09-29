/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  readSidebarCollapsed,
  writeSidebarCollapsed,
} from "./zen-sidebar-preference";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("zen sidebar preference", () => {
  it("defaults to shown", () => {
    expect(readSidebarCollapsed()).toBe(false);
  });

  it("remembers a collapsed sidebar and a restored one", () => {
    writeSidebarCollapsed(true);
    expect(readSidebarCollapsed()).toBe(true);
    writeSidebarCollapsed(false);
    expect(readSidebarCollapsed()).toBe(false);
  });

  it("does not throw when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readSidebarCollapsed()).toBe(false);
    expect(() => writeSidebarCollapsed(true)).not.toThrow();
  });
});
