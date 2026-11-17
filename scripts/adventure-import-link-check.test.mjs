import { describe, expect, it } from "bun:test";
import {
  appShellProblems,
  CTA_HREF,
  discoveryProblems,
  guideProblems,
  jsonAssetProblems,
  productionLinks,
  run,
} from "./adventure-import-link-check.mjs";

const ok = { status: 200, contentType: "application/json", body: "{}" };

describe("adventure import link check", () => {
  it("accepts a valid JSON asset", () => {
    expect(jsonAssetProblems("/a.json", ok)).toEqual([]);
  });

  it("flags 404, wrong content-type and invalid JSON", () => {
    expect(jsonAssetProblems("/a.json", { ...ok, status: 404 })).toHaveLength(
      1,
    );
    expect(
      jsonAssetProblems("/a.json", { ...ok, contentType: "text/html" }),
    ).toHaveLength(1);
    expect(
      jsonAssetProblems("/a.json", { ...ok, body: "<html>" }),
    ).toHaveLength(1);
  });

  it("requires the guide's asset links and import CTA", () => {
    const html = [
      "./schemas/adventure-json/v1.json",
      "./schemas/adventure-json/examples/minimal.v1.json",
      "./schemas/adventure-json/examples/reference-one-shot.v1.json",
      CTA_HREF,
    ]
      .map((h) => `<a href="${h}">x</a>`)
      .join("");
    const page = { status: 200, contentType: "text/html; charset=utf-8" };
    expect(guideProblems({ ...page, body: html })).toEqual([]);
    expect(guideProblems({ ...page, body: "<p>none</p>" })).toHaveLength(4);
  });

  it("extracts production links once and ignores unrelated URLs", () => {
    const body =
      "https://codexcryptica.com/adventure-import https://codexcryptica.com/adventure-import https://codexcryptica.com/schemas/adventure-json/v1.json https://codexcryptica.com/privacy";
    expect(productionLinks(body)).toEqual([
      "https://codexcryptica.com/adventure-import",
      "https://codexcryptica.com/schemas/adventure-json/v1.json",
    ]);
  });

  it("checks versioned prompt URLs when the base is production", async () => {
    const originalFetch = globalThis.fetch;
    const originalLog = console.log;
    const requested = [];
    const html = [
      "./schemas/adventure-json/v1.json",
      "./schemas/adventure-json/examples/minimal.v1.json",
      "./schemas/adventure-json/examples/reference-one-shot.v1.json",
      CTA_HREF,
      "https://codexcryptica.com/schemas/adventure-json/v2.json",
    ]
      .map((href) => `<a href="${href}">x</a>`)
      .join("");

    globalThis.fetch = async (input) => {
      const url = String(input);
      requested.push(url);
      const status = url.endsWith("/schemas/adventure-json/v2.json")
        ? 404
        : 200;
      const contentType = url.includes("/schemas/")
        ? "application/json"
        : "text/html";
      const body = url.endsWith("/adventure-import")
        ? html
        : url.endsWith("/adventure")
          ? "<html>app</html>"
          : url.endsWith("/llms.txt")
            ? "https://codexcryptica.com/adventure-import"
            : url.endsWith("/llms-full.txt")
              ? "/adventure-import"
              : "{}";
      return {
        status,
        headers: { get: () => contentType },
        text: async () => body,
      };
    };
    console.log = () => {};

    try {
      const result = await run({
        base: "https://codexcryptica.com",
        strictProduction: true,
      });
      expect(requested).toContain(
        "https://codexcryptica.com/schemas/adventure-json/v2.json",
      );
      expect(result.errors).toContain(
        "https://codexcryptica.com/schemas/adventure-json/v2.json: HTTP 404 on production; testers on https://codexcryptica.com are sent there by the guide's prompt",
      );
    } finally {
      globalThis.fetch = originalFetch;
      console.log = originalLog;
    }
  });

  it("does not judge app routes by HTTP status", () => {
    const shell = { contentType: "text/html", body: "<!doctype html><html>" };
    expect(appShellProblems("/adventure", shell)).toEqual([]);
    expect(
      appShellProblems("/adventure", { contentType: "text/plain", body: "" }),
    ).toHaveLength(1);
  });

  it("checks discovery entries", () => {
    expect(
      discoveryProblems(
        "https://codexcryptica.com/adventure-import",
        "see /adventure-import",
      ),
    ).toEqual([]);
    expect(discoveryProblems("", "")).toHaveLength(2);
  });
});
