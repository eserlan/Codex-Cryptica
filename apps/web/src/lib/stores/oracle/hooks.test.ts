import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getConnectionProposer,
  getOracleApiKey,
  loadOracleForVault,
  setConnectionProposer,
  setOracleApiKeyProvider,
  setOracleVaultLoader,
} from "./hooks";

describe("oracle hooks", () => {
  beforeEach(() => {
    setConnectionProposer(null);
    setOracleVaultLoader(null);
    setOracleApiKeyProvider(() => null);
  });

  it("reads the API key from the registered provider", () => {
    setOracleApiKeyProvider(() => "key-1");
    expect(getOracleApiKey()).toBe("key-1");
  });

  it("returns no API key before a provider is registered", () => {
    expect(getOracleApiKey()).toBeNull();
  });

  it("returns the registered connection proposer", () => {
    const proposer = {
      analyzeEntityById: vi.fn(),
      analyzeAndApplyEntityById: vi.fn(),
    };
    setConnectionProposer(proposer);
    expect(getConnectionProposer()).toBe(proposer);
  });

  it("throws when no connection proposer is registered", () => {
    expect(() => getConnectionProposer()).toThrow(/not registered/);
  });

  it("forwards vault loads to the registered loader", async () => {
    const loader = vi.fn().mockResolvedValue(undefined);
    setOracleVaultLoader(loader);
    await loadOracleForVault("v1");
    expect(loader).toHaveBeenCalledWith("v1");
  });

  it("replays a vault switch that happened before the loader registered", async () => {
    await loadOracleForVault("early");
    const loader = vi.fn().mockResolvedValue(undefined);
    setOracleVaultLoader(loader);
    expect(loader).toHaveBeenCalledWith("early");
  });

  it("does not replay a vault switch twice", async () => {
    await loadOracleForVault("early");
    setOracleVaultLoader(vi.fn().mockResolvedValue(undefined));
    const second = vi.fn().mockResolvedValue(undefined);
    setOracleVaultLoader(second);
    expect(second).not.toHaveBeenCalled();
  });

  it("logs instead of rejecting when a replayed load fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await loadOracleForVault("early");
    setOracleVaultLoader(vi.fn().mockRejectedValue(new Error("boom")));
    await Promise.resolve();
    await Promise.resolve();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
