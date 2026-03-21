/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Config IS_STAGING", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("location", { hostname: "localhost", pathname: "/" });
  });

  it("should be true if hostname contains staging", async () => {
    vi.stubGlobal("location", {
      hostname: "staging.codex-cryptica.com",
      pathname: "/",
    });
    const { IS_STAGING } = await import("./index");
    expect(IS_STAGING).toBe(true);
  });

  it("should be true if pathname contains staging", async () => {
    vi.stubGlobal("location", {
      hostname: "codex-cryptica.com",
      pathname: "/staging/",
    });
    const { IS_STAGING } = await import("./index");
    expect(IS_STAGING).toBe(true);
  });

  it("should be false if neither hostname nor pathname contains staging", async () => {
    vi.stubGlobal("location", {
      hostname: "codex-cryptica.com",
      pathname: "/app/",
    });
    const { IS_STAGING } = await import("./index");
    // Note: This might still be true if VITE_APP_ENV is set in the test environment,
    // but in a clean jsdom it should be false.
    expect(IS_STAGING).toBe(
      import.meta.env.VITE_APP_ENV === "staging" ||
        import.meta.env.MODE === "staging",
    );
  });
});
