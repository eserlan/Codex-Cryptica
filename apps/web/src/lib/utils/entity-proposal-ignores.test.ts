import { describe, it, expect, vi } from "vitest";
import {
  loadIgnoredEntityProposals,
  saveIgnoredEntityProposals,
} from "./entity-proposal-ignores";
import type { StorageLike } from "./runtime-deps";

describe("entity-proposal-ignores", () => {
  const mockStorage: StorageLike = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    length: 0,
    key: vi.fn(),
  };

  it("loads ignored proposals from injected storage", () => {
    vi.mocked(mockStorage.getItem).mockReturnValue(JSON.stringify(["A", "B"]));
    const result = loadIgnoredEntityProposals("vault-1", mockStorage);

    expect(mockStorage.getItem).toHaveBeenCalledWith("entity-proposal-ignores:vault-1");
    expect(result).toEqual(new Set(["A", "B"]));
  });

  it("returns empty set when storage throws", () => {
    vi.mocked(mockStorage.getItem).mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
    const result = loadIgnoredEntityProposals("vault-1", mockStorage);

    expect(result).toEqual(new Set());
  });

  it("returns empty set when stored JSON is invalid", () => {
    vi.mocked(mockStorage.getItem).mockReturnValue("invalid-json");
    const result = loadIgnoredEntityProposals("vault-1", mockStorage);

    expect(result).toEqual(new Set());
  });

  it("uses 'default' key if vaultId is null", () => {
    vi.mocked(mockStorage.getItem).mockReturnValue(null);
    loadIgnoredEntityProposals(null, mockStorage);

    expect(mockStorage.getItem).toHaveBeenCalledWith("entity-proposal-ignores:default");
  });

  it("saves ignored proposals to injected storage", () => {
    saveIgnoredEntityProposals("vault-1", new Set(["A", "B"]), mockStorage);

    expect(mockStorage.setItem).toHaveBeenCalledWith(
      "entity-proposal-ignores:vault-1",
      JSON.stringify(["A", "B"]),
    );
  });
});
