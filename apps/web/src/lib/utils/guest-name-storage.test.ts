import { describe, it, expect, vi } from "vitest";
import {
  loadGuestDisplayName,
  saveGuestDisplayName,
} from "./guest-name-storage";

describe("guest-name-storage helpers", () => {
  it("should load the stored guest name", () => {
    const storage = {
      getItem: vi.fn().mockReturnValue("Mara"),
    };

    expect(loadGuestDisplayName(storage)).toBe("Mara");
  });

  it("should return an empty string when storage access fails", () => {
    const storage = {
      getItem: vi.fn().mockImplementation(() => {
        throw new Error("blocked");
      }),
    };

    expect(loadGuestDisplayName(storage)).toBe("");
  });

  it("should return an empty string when storage is unavailable", () => {
    expect(loadGuestDisplayName(null)).toBe("");
  });

  it("should save the guest name when storage is available", () => {
    const storage = {
      setItem: vi.fn(),
    };

    expect(saveGuestDisplayName("Mara", storage)).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith("codex_guest_name", "Mara");
  });

  it("should return false when saving fails", () => {
    const storage = {
      setItem: vi.fn().mockImplementation(() => {
        throw new Error("blocked");
      }),
    };

    expect(saveGuestDisplayName("Mara", storage)).toBe(false);
  });

  it("should return false when storage is unavailable", () => {
    expect(saveGuestDisplayName("Mara", null)).toBe(false);
  });
});
