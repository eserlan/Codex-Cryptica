import { describe, expect, it } from "vitest";
import { prerender, trailingSlash } from "./+page";
import config from "../../../../svelte.config.js";

describe("Help index route", () => {
  it("is prerendered so direct Help URLs receive a successful document response", () => {
    expect(prerender).toBe(true);
    expect(trailingSlash).toBe("always");
    expect(config.kit?.prerender?.entries).toContain("/help");
  });
});
