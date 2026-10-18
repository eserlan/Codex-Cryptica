import { describe, expect, it } from "vitest";
import {
  assertOk,
  getTemplateDirectoryBaseUrl,
} from "./template-directory-http";

describe("getTemplateDirectoryBaseUrl", () => {
  it("prefers an explicit override", () => {
    expect(getTemplateDirectoryBaseUrl("https://x.test")).toBe(
      "https://x.test",
    );
  });

  it("falls back to a non-empty URL", () => {
    expect(getTemplateDirectoryBaseUrl()).toMatch(/^https?:\/\//);
  });
});

describe("assertOk", () => {
  it("passes for ok responses and throws the given message otherwise", () => {
    expect(() =>
      assertOk(new Response("{}", { status: 200 }), "no"),
    ).not.toThrow();
    expect(() =>
      assertOk(new Response("", { status: 500 }), "Could not load."),
    ).toThrow("Could not load.");
  });
});
