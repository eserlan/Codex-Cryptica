import { describe, it, expect } from "vitest";
import { isOriginAllowed } from "./index";

describe("Oracle Proxy Worker CORS", () => {
  const emptyEnv = { GEMINI_API_KEY: "test-key" };

  it("allows the production origins", () => {
    expect(
      isOriginAllowed("https://codex-cryptica.com", emptyEnv),
    ).toBeTruthy();
    expect(isOriginAllowed("https://codexcryptica.com", emptyEnv)).toBeTruthy();
    expect(
      isOriginAllowed("https://staging.codex-cryptica.com", emptyEnv),
    ).toBeTruthy();
    expect(
      isOriginAllowed("https://codex-cryptica.pages.dev", emptyEnv),
    ).toBeTruthy();
  });

  it("allows any localhost or loopback dev origin", () => {
    expect(isOriginAllowed("http://localhost:4173", emptyEnv)).toBeTruthy();
    expect(isOriginAllowed("http://localhost:5173", emptyEnv)).toBeTruthy();
    expect(isOriginAllowed("http://127.0.0.1:4173", emptyEnv)).toBeTruthy();
    expect(isOriginAllowed("http://127.0.0.1:9999", emptyEnv)).toBeTruthy();
  });

  it("treats ALLOWED_ORIGINS as an exact allowlist", () => {
    expect(
      isOriginAllowed("http://localhost:4173", {
        GEMINI_API_KEY: "test-key",
        ALLOWED_ORIGINS: "https://example.com,http://localhost:4173",
      }),
    ).toBeTruthy();
    expect(
      isOriginAllowed("https://codex-cryptica.com", {
        GEMINI_API_KEY: "test-key",
        ALLOWED_ORIGINS: "https://example.com",
      }),
    ).toBeFalsy();
    expect(
      isOriginAllowed("http://localhost:4173", {
        GEMINI_API_KEY: "test-key",
        ALLOWED_ORIGINS: "https://example.com",
      }),
    ).toBeFalsy();
  });

  it("rejects non-loopback origins that are not allowlisted", () => {
    expect(isOriginAllowed("https://evil.com", emptyEnv)).toBeFalsy();
    expect(isOriginAllowed("http://192.168.0.15:4173", emptyEnv)).toBeFalsy();
    expect(isOriginAllowed("file://localhost", emptyEnv)).toBeFalsy();
  });
});
