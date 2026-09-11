import { describe, it, expect } from "vitest";
import {
  isVaultReadyForGenerators,
  type VaultReadinessState,
} from "./readiness";

describe("isVaultReadyForGenerators", () => {
  it("returns true when vault is initialized, has an active vault ID, and is not loading", () => {
    const readyState: VaultReadinessState = {
      isInitialized: true,
      activeVaultId: "vault-123",
      status: "idle",
    };

    expect(isVaultReadyForGenerators(readyState)).toBe(true);
  });

  it("returns false when vault is not initialized", () => {
    const uninitializedState: VaultReadinessState = {
      isInitialized: false,
      activeVaultId: "vault-123",
      status: "idle",
    };

    expect(isVaultReadyForGenerators(uninitializedState)).toBe(false);
  });

  it("returns false when activeVaultId is null", () => {
    const noActiveVaultState: VaultReadinessState = {
      isInitialized: true,
      activeVaultId: null,
      status: "idle",
    };

    expect(isVaultReadyForGenerators(noActiveVaultState)).toBe(false);
  });

  it("returns false when status is loading", () => {
    const loadingState: VaultReadinessState = {
      isInitialized: true,
      activeVaultId: "vault-123",
      status: "loading",
    };

    expect(isVaultReadyForGenerators(loadingState)).toBe(false);
  });

  it("returns false when multiple readiness conditions are unmet", () => {
    const fullyUnready: VaultReadinessState = {
      isInitialized: false,
      activeVaultId: null,
      status: "loading",
    };

    expect(isVaultReadyForGenerators(fullyUnready)).toBe(false);
  });
});
