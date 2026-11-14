/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { SHARED_VAULT_DEV_SWITCH, isSharedVaultEnabled } from "./shared-vault";

describe("isSharedVaultEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.removeItem(SHARED_VAULT_DEV_SWITCH);
  });

  it("is off by default", () => {
    vi.stubEnv("VITE_SHARED_VAULT", "");
    expect(isSharedVaultEnabled()).toBe(false);
  });

  it("is off for values other than the exact string 'true'", () => {
    for (const value of ["1", "TRUE", "yes", "false", " true"]) {
      vi.stubEnv("VITE_SHARED_VAULT", value);
      expect(isSharedVaultEnabled()).toBe(false);
    }
  });

  it("is on when VITE_SHARED_VAULT is exactly 'true'", () => {
    vi.stubEnv("VITE_SHARED_VAULT", "true");
    expect(isSharedVaultEnabled()).toBe(true);
  });

  it("honours the local switch in a development build only", () => {
    vi.stubEnv("VITE_SHARED_VAULT", "");
    localStorage.setItem(SHARED_VAULT_DEV_SWITCH, "true");
    vi.stubEnv("DEV", true);
    expect(isSharedVaultEnabled()).toBe(true);
    vi.stubEnv("DEV", false);
    expect(isSharedVaultEnabled()).toBe(false);
  });
});
