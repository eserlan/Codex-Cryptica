import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveOracleProxyUrl } from "./oracle-proxy";

const DEPLOYED = "https://oracle-proxy.espen-erlandsen.workers.dev";

describe("resolveOracleProxyUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("never returns an empty base URL", () => {
    // The regression: an empty base resolved /api/cloud-backup/* against
    // codexcryptica.com, which is static Pages and answers POSTs with 405.
    vi.stubEnv("VITE_ORACLE_PROXY_URL", "");
    vi.stubEnv("DEV", false);

    expect(resolveOracleProxyUrl()).not.toBe("");
    expect(new URL(resolveOracleProxyUrl()).origin).toBe(DEPLOYED);
  });

  it("falls back to the deployed worker when nothing is configured", () => {
    // Explicit: a developer's .env.local sets this, and the point of the test
    // is what a production build with nothing configured resolves to.
    vi.stubEnv("VITE_ORACLE_PROXY_URL", "");
    vi.stubEnv("DEV", false);

    expect(resolveOracleProxyUrl()).toBe(DEPLOYED);
  });

  it("points at the local worker during `bun dev`", () => {
    vi.stubEnv("VITE_ORACLE_PROXY_URL", "");
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITEST", "");

    expect(resolveOracleProxyUrl()).toBe("http://localhost:8787");
  });

  it("prefers an explicit override, then the configured env var", () => {
    vi.stubEnv("VITE_ORACLE_PROXY_URL", "https://proxy.example");

    expect(resolveOracleProxyUrl("https://override.example")).toBe(
      "https://override.example",
    );
    expect(resolveOracleProxyUrl()).toBe("https://proxy.example");
  });

  it("builds a reachable enable endpoint", () => {
    vi.stubEnv("VITE_ORACLE_PROXY_URL", "");
    vi.stubEnv("DEV", false);

    expect(`${resolveOracleProxyUrl()}/api/cloud-backup/enable`).toBe(
      `${DEPLOYED}/api/cloud-backup/enable`,
    );
  });
});
