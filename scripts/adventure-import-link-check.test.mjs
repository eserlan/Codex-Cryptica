import { describe, expect, it } from "bun:test";
import {
  appShellProblems,
  CTA_HREF,
  discoveryProblems,
  guideProblems,
  jsonAssetProblems,
  productionLinks,
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
