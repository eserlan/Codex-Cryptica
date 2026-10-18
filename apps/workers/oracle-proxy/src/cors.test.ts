import { describe, expect, it } from "vitest";
import {
  getCorsHeaders,
  handleCorsPreflight,
  isOriginAllowed,
  withCorsHeaders,
} from "./cors";

describe("oracle proxy CORS policy", () => {
  it("allows served origins, project previews, and loopback development origins", () => {
    expect(isOriginAllowed("https://codexcryptica.com", {})).toBe(true);
    expect(
      isOriginAllowed("https://feature.codex-cryptica.pages.dev", {}),
    ).toBe(true);
    expect(isOriginAllowed("http://localhost:5173", {})).toBe(true);
  });

  it("uses a configured allowlist as authoritative with opt-in previews", () => {
    const env = {
      ALLOWED_ORIGINS: "https://example.com",
      ALLOW_CLOUDFLARE_PAGES_PREVIEW_ORIGINS: "true",
    };

    expect(isOriginAllowed("https://example.com", env)).toBe(true);
    expect(
      isOriginAllowed("https://branch.codex-cryptica.pages.dev", env),
    ).toBe(true);
    expect(isOriginAllowed("https://codexcryptica.com", env)).toBe(false);
    expect(isOriginAllowed("https://branch.evil.pages.dev", env)).toBe(false);
  });

  it("adds CORS headers only for allowed origins", () => {
    const allowedHeaders = getCorsHeaders(
      new Headers({ Origin: "https://codexcryptica.com" }),
      {},
    );
    const deniedHeaders = getCorsHeaders(
      new Headers({ Origin: "https://evil.example" }),
      {},
    );

    expect(allowedHeaders).toEqual({
      "Access-Control-Allow-Origin": "https://codexcryptica.com",
    });
    expect(deniedHeaders).toEqual({});
  });

  it("preserves preflight headers and does not grant denied origins", () => {
    const allowed = handleCorsPreflight(
      new Request("https://oracle.example/", {
        method: "OPTIONS",
        headers: { Origin: "https://codexcryptica.com" },
      }),
      {},
    );
    const denied = handleCorsPreflight(
      new Request("https://oracle.example/", {
        method: "OPTIONS",
        headers: { Origin: "https://evil.example" },
      }),
      {},
    );

    expect(allowed.status).toBe(204);
    expect(allowed.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://codexcryptica.com",
    );
    expect(allowed.headers.get("Access-Control-Allow-Headers")).toContain(
      "X-Turnstile-Token",
    );
    expect(allowed.headers.get("Access-Control-Max-Age")).toBe("86400");
    expect(denied.status).toBe(204);
    expect(denied.headers.has("Access-Control-Allow-Origin")).toBe(false);
  });

  it("adds Vary: Origin when attaching CORS to a response", () => {
    const request = new Request("https://oracle.example/", {
      headers: { Origin: "https://codexcryptica.com" },
    });
    const response = withCorsHeaders(request, {}, new Response("ok"));

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://codexcryptica.com",
    );
    expect(response.headers.get("Vary")).toBe("Origin");
  });
});
